"""
Loans routes — track books loaned out to other people.
"""

from flask import Blueprint, render_template, request, jsonify, flash, redirect, url_for
from flask_login import login_required, current_user
from datetime import date, datetime, timezone
import json
import logging

from app.infrastructure.kuzu_graph import safe_execute_kuzu_query
from app.services.personal_metadata_service import personal_metadata_service
from app.utils.simple_cache import bump_user_library_version


def _bump_cache(user_id: str) -> None:
    """Invalidate the cached library stats and ETag for this user."""
    try:
        bump_user_library_version(user_id)
    except Exception:
        pass

logger = logging.getLogger(__name__)

loans_bp = Blueprint('loans', __name__, url_prefix='/loans')


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _result_rows(result):
    """Normalise a KuzuDB result to a list of dicts."""
    if result is None:
        return []
    if isinstance(result, list):
        return result
    rows = []
    while result.has_next():
        rows.append(result.get_next())
    return rows


def _get_loaned_books(user_id: str) -> list:
    """Return all books currently loaned out by this user, newest first."""
    # Note: Book nodes have no 'uid' column — id IS the URL key.
    query = """
    MATCH (u:User {id: $user_id})-[pm:HAS_PERSONAL_METADATA]->(b:Book)
    RETURN b.id, b.title, b.cover_url,
           pm.personal_custom_fields
    """
    try:
        rows = _result_rows(safe_execute_kuzu_query(query, {"user_id": user_id}))
    except Exception as exc:
        logger.error(f"[LOANS] query failed for user {user_id}: {exc}")
        return []

    books = []
    for row in rows:
        if isinstance(row, dict):
            book_id   = row.get('col_0') or row.get('b.id')
            title     = row.get('col_1') or row.get('b.title')
            cover_url = row.get('col_2') or row.get('b.cover_url')
            raw_blob  = row.get('col_3') or row.get('pm.personal_custom_fields')
        else:
            book_id   = row[0] if len(row) > 0 else None
            title     = row[1] if len(row) > 1 else None
            cover_url = row[2] if len(row) > 2 else None
            raw_blob  = row[3] if len(row) > 3 else None

        try:
            blob = json.loads(raw_blob) if raw_blob else {}
        except Exception:
            blob = {}

        if blob.get('ownership_status') != 'loaned':
            continue

        books.append({
            'id':              book_id,
            'uid':             book_id,   # id IS the URL key — no separate uid column
            'title':           title or 'Unknown Title',
            'cover_url':       cover_url,
            'loaned_to':       blob.get('loaned_to', ''),
            'loaned_to_phone': blob.get('loaned_to_phone', ''),
            'loaned_date':     blob.get('loaned_date', ''),
        })

    # Sort newest loan first
    books.sort(key=lambda b: b['loaned_date'] or '', reverse=True)
    return books


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@loans_bp.route('/')
@login_required
def manage_loans():
    loaned_books = _get_loaned_books(current_user.id)
    return render_template('loans/manage.html', loaned_books=loaned_books)


@loans_bp.route('/loan', methods=['POST'])
@login_required
def loan_book():
    book_id   = request.form.get('book_id', '').strip()
    loaned_to = request.form.get('loaned_to', '').strip()
    phone     = request.form.get('loaned_to_phone', '').strip()

    if not book_id:
        flash('No book selected.', 'error')
        return redirect(url_for('loans.manage_loans'))
    if not loaned_to:
        flash('Borrower name is required.', 'error')
        return redirect(url_for('loans.manage_loans'))

    try:
        personal_metadata_service.update_personal_metadata(
            current_user.id,
            book_id,
            custom_updates={
                'ownership_status': 'loaned',
                'loaned_to':        loaned_to,
                'loaned_to_phone':  phone or None,
                'loaned_date':      date.today().isoformat(),
            },
        )
        _bump_cache(current_user.id)
        flash(f'Book loaned to {loaned_to}.', 'success')
    except Exception as exc:
        logger.error(f"[LOANS] loan failed book={book_id} user={current_user.id}: {exc}")
        flash('Error recording the loan. Please try again.', 'error')

    return redirect(url_for('loans.manage_loans'))


@loans_bp.route('/<book_id>/return', methods=['POST'])
@login_required
def return_book(book_id):
    try:
        personal_metadata_service.update_personal_metadata(
            current_user.id,
            book_id,
            custom_updates={
                'ownership_status': 'owned',
                'loaned_to':        None,
                'loaned_to_phone':  None,
                'loaned_date':      None,
            },
        )
        _bump_cache(current_user.id)
        flash('Book marked as returned.', 'success')
    except Exception as exc:
        logger.error(f"[LOANS] return failed book={book_id} user={current_user.id}: {exc}")
        flash('Error recording the return. Please try again.', 'error')

    return redirect(url_for('loans.manage_loans'))


@loans_bp.route('/api/search')
@login_required
def api_search():
    """Search user's library books for the loan picker."""
    from app.services import book_service

    q = (request.args.get('q') or '').strip()
    if not q:
        return jsonify({'books': []})

    try:
        results = book_service.search_books_sync(q, str(current_user.id), limit=20)
    except Exception as exc:
        logger.error(f"[LOANS] search error: {exc}")
        return jsonify({'books': []}), 500

    books = []
    for b in (results or []):
        if isinstance(b, dict):
            book_id   = b.get('id')
            title     = b.get('title', '')
            cover_url = b.get('cover_url') or b.get('cover')
            authors   = b.get('authors', [])
        else:
            book_id   = getattr(b, 'id', None)
            title     = getattr(b, 'title', '') or ''
            cover_url = getattr(b, 'cover_url', None) or getattr(b, 'cover', None)
            authors   = getattr(b, 'authors', []) or []

        if isinstance(authors, list):
            author_names = [
                (a.get('name') if isinstance(a, dict) else getattr(a, 'name', str(a)))
                for a in authors
            ]
            author_str = ', '.join(filter(None, author_names))
        else:
            author_str = str(authors)

        books.append({
            'id':      book_id,
            'title':   title,
            'authors': author_str,
            'cover_url': cover_url,
        })

    return jsonify({'books': books})

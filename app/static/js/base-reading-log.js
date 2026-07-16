// Extracted from base.html: Reading Log modal JS, loaded only for authenticated
// users (matching original behavior). window.__READING_LOG_STATIC_DEFAULTS__ is
// set by a small inline script in base.html before this file loads.

    // Reading Log Modal JavaScript
    document.addEventListener('DOMContentLoaded', function() {
      const modal = document.getElementById('readingLogModal');
      const bookSearchInput = document.getElementById('book_search');
      const bookDropdown = document.getElementById('book_dropdown');
      const selectedBookDiv = document.getElementById('selected_book');
      const selectedBookIdInput = document.getElementById('selected_book_id');
      const startPageInput = document.getElementById('start_page');
      const endPageInput = document.getElementById('end_page');
      const pagesReadInput = document.getElementById('pages_read');
      
  let userBooksData = [];
  let searchTimeout = null;
  const searchCache = new Map();
  let activeSearchRequest = 0;
  let lastSelectedBook = null;
  let lastSelectionSource = null;
    const PREFILL_STATE = window.__READING_LOG_PREFILL__ = window.__READING_LOG_PREFILL__ || {};
      
      // Capture server-rendered defaults as fallback constants
  const STATIC_DEFAULTS = window.__READING_LOG_STATIC_DEFAULTS__;

      function resolveEffectiveDefaults() {
        // 1) Prefer in-page personal settings values if present (reactive on save)
        try {
          const personal = document.getElementById('personalDynamicContainer');
          if (personal) {
            const dp = personal.querySelector('input[name="default_pages_per_log"]');
            const dm = personal.querySelector('input[name="default_minutes_per_log"]');
            const pVal = dp && dp.value !== '' ? parseInt(dp.value, 10) : null;
            const mVal = dm && dm.value !== '' ? parseInt(dm.value, 10) : null;
            if ((pVal !== null && !Number.isNaN(pVal)) || (mVal !== null && !Number.isNaN(mVal))) {
              return { pages: (Number.isNaN(pVal) ? null : pVal), minutes: (Number.isNaN(mVal) ? null : mVal) };
            }
          }
        } catch(_) { /* ignore */ }
        // 2) If admin server config panel is open with new defaults, use those
        try {
          const server = document.getElementById('serverDynamicContainer');
          if (server) {
            const dp = server.querySelector('input[name="default_pages_per_log"]');
            const dm = server.querySelector('input[name="default_minutes_per_log"]');
            const pVal = dp && dp.value !== '' ? parseInt(dp.value, 10) : null;
            const mVal = dm && dm.value !== '' ? parseInt(dm.value, 10) : null;
            if ((pVal !== null && !Number.isNaN(pVal)) || (mVal !== null && !Number.isNaN(mVal))) {
              return { pages: (Number.isNaN(pVal) ? null : pVal), minutes: (Number.isNaN(mVal) ? null : mVal) };
            }
          }
        } catch(_) { /* ignore */ }
        // 3) Fallback to server-rendered values from page load
  return { pages: (STATIC_DEFAULTS && STATIC_DEFAULTS.pages !== undefined ? STATIC_DEFAULTS.pages : null), minutes: (STATIC_DEFAULTS && STATIC_DEFAULTS.minutes !== undefined ? STATIC_DEFAULTS.minutes : null) };
      }

      try {
        const queuedSuccess = window.sessionStorage.getItem('readingLogSuccessMessage');
        if (queuedSuccess) {
          showAlert('success', queuedSuccess);
          window.sessionStorage.removeItem('readingLogSuccessMessage');
        }
      } catch (storageErr) {
        console.warn('Unable to access sessionStorage for reading log alerts', storageErr);
      }

      function normalizeBookPayload(raw) {
        if (!raw || !raw.id || !raw.title) {
          return null;
        }
        return {
          id: raw.id,
          title: raw.title,
          authors: raw.authors || raw.author || '',
          series: raw.series || ''
        };
      }

      function storeGlobalPrefill(key, payload) {
        const normalized = normalizeBookPayload(payload);
        if (!normalized) {
          delete PREFILL_STATE[key];
          return null;
        }
        PREFILL_STATE[key] = normalized;
        return normalized;
      }

      function getSuggestedPrefill() {
        return PREFILL_STATE.suggestedInProgress || null;
      }

      function resolvePageContextPrefill() {
        return PREFILL_STATE.currentBook || null;
      }

      function extractDatasetPrefill(element) {
        if (!element) {
          return null;
        }
        const target = element.closest('[data-prefill-book-id]') || element;
        const dataset = target.dataset || {};
        const id = dataset.prefillBookId;
        const title = dataset.prefillBookTitle;
        if (!id || !title) {
          return null;
        }
        return normalizeBookPayload({
          id,
          title,
          authors: dataset.prefillBookAuthors || dataset.prefillBookAuthor || '',
          series: dataset.prefillBookSeries || ''
        });
      }

      function attemptAutoSelect(payload, options = {}) {
        const normalized = normalizeBookPayload(payload);
        if (!normalized) {
          return false;
        }
        const force = options.force === true;
        const hasSelection = !!selectedBookIdInput.value;
        const searchHasValue = !!(bookSearchInput.value && bookSearchInput.value.trim());
        if (!force && (hasSelection || searchHasValue)) {
          return false;
        }
        const source = options.source || 'prefill';
        selectBook(normalized, source);
        if (source === 'suggested') {
          storeGlobalPrefill('suggestedInProgress', normalized);
        }
        return true;
      }

      // Prefill defaults and load user's books when modal is shown
      modal.addEventListener('show.bs.modal', function(event) {
        try {
          const eff = resolveEffectiveDefaults();
          if (eff.pages !== null && eff.pages !== undefined && pagesReadInput) {
            pagesReadInput.value = String(eff.pages);
            pagesReadInput.readOnly = false; // allow user to tweak
          }
          const minutesInput = document.getElementById('minutes_read');
          if (eff.minutes !== null && eff.minutes !== undefined && minutesInput) {
            minutesInput.value = String(eff.minutes);
          }
        } catch (e) { /* ignore */ }

        let prefillApplied = false;
        if (event && event.relatedTarget) {
          const triggerPrefill = extractDatasetPrefill(event.relatedTarget);
          if (triggerPrefill) {
            prefillApplied = attemptAutoSelect(triggerPrefill, { force: true, source: 'trigger' });
          }
        }

        if (!prefillApplied) {
          const pagePrefill = resolvePageContextPrefill();
          if (pagePrefill) {
            prefillApplied = attemptAutoSelect(pagePrefill, { force: true, source: 'context' });
          }
        }

        if (!prefillApplied) {
          const suggested = getSuggestedPrefill();
          if (suggested) {
            prefillApplied = attemptAutoSelect(suggested, { source: 'suggested' });
          }
        }

        if (userBooksData.length === 0) {
          loadUserBooks();
        }
      });
      
      // Book search functionality
      bookSearchInput.addEventListener('input', function() {
        const query = this.value.trim();
        
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          if (query.length >= 1) {
            searchBooks(query);
          } else {
            showRecentBooks();
          }
        }, 200);
      });
      
      // Show recent books when field is focused
      bookSearchInput.addEventListener('focus', function() {
        if (!this.value.trim()) {
          showRecentBooks();
        }
      });
      
      // Hide dropdown when clicking outside
      document.addEventListener('click', function(event) {
        if (!event.target.closest('.book-autocomplete')) {
          hideBookDropdown();
        }
      });
      
      // Auto-calculate pages read
      function calculatePagesRead() {
        const startPage = parseInt(startPageInput.value) || 0;
        const endPage = parseInt(endPageInput.value) || 0;
        
        if (startPage > 0 && endPage > 0 && endPage >= startPage) {
          pagesReadInput.value = endPage - startPage + 1;
        } else {
          pagesReadInput.value = '';
        }
      }
      
      startPageInput.addEventListener('input', calculatePagesRead);
      endPageInput.addEventListener('input', calculatePagesRead);
      
      // Allow manual override of pages read
      pagesReadInput.addEventListener('focus', function() {
        this.readOnly = false;
      });
      
      pagesReadInput.addEventListener('blur', function() {
        if (!this.value) {
          this.readOnly = true;
          calculatePagesRead();
        }
      });
      
      // Load user's books via AJAX
      function loadUserBooks() {
        fetch('/reading-logs/api/user/books?limit=60', {
          headers: {
            // GET usually doesn't require CSRF, but keep header harmlessly for consistency
            'X-CSRFToken': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
          }
        })
        .then(r => r.json())
        .then(data => {
          let booksPayload = [];
          if (Array.isArray(data)) {
            booksPayload = data;
          } else if (data && Array.isArray(data.books)) {
            booksPayload = data.books;
          } else {
            console.warn('Unexpected books payload', data);
          }
          userBooksData = booksPayload;

          let suggestionHandled = false;
          if (!Array.isArray(data) && data && data.suggested_book) {
            const normalizedSuggestion = storeGlobalPrefill('suggestedInProgress', data.suggested_book);
            if (normalizedSuggestion) {
              suggestionHandled = attemptAutoSelect(normalizedSuggestion, { source: 'suggested' });
            }
          } else {
            delete PREFILL_STATE.suggestedInProgress;
            if (lastSelectionSource === 'suggested') {
              clearBookSelection({ forget: true });
            }
          }

          if (!suggestionHandled && bookSearchInput.style.display !== 'none' && !bookSearchInput.value.trim()) {
            showRecentBooks();
          }
        })
        .catch(error => {
          console.error('Error loading books:', error);
        });
      }
      
    async function searchBooks(query) {
        const trimmed = query.trim();
        if (!trimmed) {
          showRecentBooks();
          return;
        }

        const normalized = trimmed.toLowerCase();
        if (searchCache.has(normalized)) {
          showBookDropdown(searchCache.get(normalized) || [], query);
          return;
        }

        const requestId = ++activeSearchRequest;

        try {
          const response = await fetch(`/reading-logs/api/user/books?q=${encodeURIComponent(trimmed)}&limit=20`, {
            headers: {
              'X-CSRFToken': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
            }
          });

          if (!response.ok) {
            throw new Error(`Search request failed with status ${response.status}`);
          }

          const data = await response.json();
          let books = [];
          if (Array.isArray(data)) {
            books = data;
          } else if (data && Array.isArray(data.books)) {
            books = data.books;
          }

          if (!Array.isArray(data) && data && data.suggested_book) {
            storeGlobalPrefill('suggestedInProgress', data.suggested_book);
          }

          searchCache.set(normalized, books);

          if (requestId === activeSearchRequest) {
            showBookDropdown(books, query);
          }
        } catch (error) {
          console.error('Error searching books:', error);
          if (requestId !== activeSearchRequest) {
            return;
          }
          if (userBooksData.length) {
            const fallbackQuery = normalized;
            const fallbackResults = userBooksData.filter(book => {
              const authors = (book.authors || book.author || '');
              const seriesName = (book.series || '');
              const haystacks = [book.title || '', authors, seriesName].map(text => (text || '').toString().toLowerCase());
              return haystacks.some(text => text.includes(fallbackQuery));
            });
            showBookDropdown(fallbackResults, query);
          } else {
            showBookDropdown([], query);
          }
        }
      }
      
      function showRecentBooks() {
        // Show recent books when no search query
        if (userBooksData.length > 0) {
          // Take the first 5 books (which should be prioritized by the API)
          const recentBooks = userBooksData.slice(0, 5);
          showBookDropdown(recentBooks, '');
        }
      }
      
      function showBookDropdown(books, query) {
        bookDropdown.innerHTML = '';
        
        if (books.length === 0) {
          const noResultsItem = document.createElement('div');
          noResultsItem.className = 'autocomplete-item';
          noResultsItem.innerHTML = '<em>No books found</em>';
          bookDropdown.appendChild(noResultsItem);
        } else {
      books.slice(0, 10).forEach(book => { // Limit to 10 results
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.innerHTML = `
              <div class="book-title-main">${book.title}</div>
        ${book.series ? `<div class="book-series-sub">${book.series}</div>` : ''}
        ${book.authors ? `<div class="book-authors-sub">by ${book.authors}</div>` : (book.author ? `<div class=\"book-authors-sub\">by ${book.author}</div>` : '')}
            `;
            item.addEventListener('click', () => selectBook(book, 'manual'));
            bookDropdown.appendChild(item);
          });
        }
        
        bookDropdown.style.display = 'block';
      }
      
      function hideBookDropdown() {
        bookDropdown.style.display = 'none';
      }
      
            function selectBook(rawBook, source = 'manual') {
              const book = normalizeBookPayload(rawBook);
              if (!book) {
                return;
              }
              selectedBookIdInput.value = book.id;
              bookSearchInput.value = '';

              // Show selected book
              selectedBookDiv.querySelector('.book-title').textContent = book.title;
              const authors = book.authors || (rawBook && rawBook.author) || '';
              selectedBookDiv.querySelector('.book-authors').textContent = authors ? `by ${authors}` : '';
              selectedBookDiv.style.display = 'block';
              bookSearchInput.style.display = 'none';

              lastSelectedBook = book;
              lastSelectionSource = source;

              hideBookDropdown();
            }
      
      window.clearBookSelection = function(options = {}) {
        selectedBookIdInput.value = '';
        selectedBookDiv.style.display = 'none';
        bookSearchInput.style.display = 'block';
        bookSearchInput.value = '';
        bookSearchInput.focus();
        showRecentBooks();
        lastSelectionSource = null;
        if (options && options.forget) {
          lastSelectedBook = null;
          delete PREFILL_STATE.suggestedInProgress;
        }
      };
      
      // Helper functions for modal error handling
      function showModalError(message) {
        const errorDiv = document.getElementById('readingLogError');
        const errorMessage = document.getElementById('readingLogErrorMessage');
        errorMessage.textContent = message;
        errorDiv.style.display = 'block';
        // Scroll to top of modal to show error
        document.querySelector('.modal-body').scrollTop = 0;
      }
      
      function hideModalError() {
        const errorDiv = document.getElementById('readingLogError');
        errorDiv.style.display = 'none';
      }
      
      // Hide error when modal is opened
      modal.addEventListener('shown.bs.modal', function() {
        hideModalError();
      });
      
      // Handle form submission
      document.getElementById('readingLogForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Hide any previous errors
        hideModalError();
        
        // Validate book selection
        if (!selectedBookIdInput.value) {
          showModalError('Please select a book');
          return;
        }
        
        const formData = new FormData(this);
        
        fetch(this.action, {
          method: 'POST',
          body: formData,
          headers: {
            'X-CSRFToken': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
          }
        })
        .then(response => response.json())
        .then(data => {
          if (data.status === 'success') {
            // Close modal and show success message
            const modalInstance = bootstrap.Modal.getInstance(modal);
            modalInstance.hide();
            
            if (lastSelectedBook) {
              const normalized = storeGlobalPrefill('suggestedInProgress', lastSelectedBook);
              if (normalized) {
                userBooksData = [normalized, ...userBooksData.filter(book => book.id !== normalized.id)];
                lastSelectedBook = normalized;
              }
              searchCache.clear();
            }

            // Reset form
            this.reset();
            clearBookSelection();
            pagesReadInput.readOnly = true;

            try {
              window.sessionStorage.setItem('readingLogSuccessMessage', 'Reading session logged successfully!');
            } catch (storageErr) {
              console.warn('Unable to persist reading log success message', storageErr);
            }

            setTimeout(() => {
              window.location.reload();
            }, 150);
          } else {
            // Show error in modal instead of page
            showModalError(data.message || 'Error logging reading session');
          }
        })
        .catch(error => {
          console.error('Error:', error);
          // Show error in modal instead of page
          showModalError('Error logging reading session');
        });
      });
      
      // Reset form when modal is hidden
      modal.addEventListener('hidden.bs.modal', function() {
        document.getElementById('readingLogForm').reset();
        clearBookSelection();
        pagesReadInput.readOnly = true;
        try {
          const eff = resolveEffectiveDefaults();
          if (eff.pages !== null && eff.pages !== undefined) { pagesReadInput.value = String(eff.pages); pagesReadInput.readOnly = false; }
          const minutesInput = document.getElementById('minutes_read');
          if (eff.minutes !== null && eff.minutes !== undefined && minutesInput) { minutesInput.value = String(eff.minutes); }
        } catch(e) { /* ignore */ }
      });
      
      function showAlert(type, message) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show mt-2`;
        alertDiv.innerHTML = `
          ${message}
          <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        const container = document.querySelector('.container');
        container.insertBefore(alertDiv, container.firstChild);
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
          if (alertDiv.parentNode) {
            alertDiv.remove();
          }
        }, 5000);
      }
    });

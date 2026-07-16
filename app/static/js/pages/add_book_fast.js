// Extracted from add_book_fast.html for browser caching.
// window.ADD_BOOK_FAST_CONFIG is set by a small inline script before this loads.

// Configuration - URLs from Flask for proper routing
const API_URLS = {
    unifiedMetadata: '/api/v1/books/unified-metadata',
    fastAddSave: window.ADD_BOOK_FAST_CONFIG.fastAddSaveUrl,
    deleteBook: function(bookId) { return `/book/${bookId}/delete`; }
};

// CSRF Token helper
function getCsrfToken() {
    const csrfInput = document.querySelector('input[name="csrf_token"]');
    if (!csrfInput) {
        console.error('CSRF token input not found');
        return '';
    }
    return csrfInput.value || '';
}

let autoSaveTimer = null;
let countdownInterval = null;
let currentBookData = null;
let recentlyAddedBooks = [];
const FALLBACK_COVER = window.ADD_BOOK_FAST_CONFIG.fallbackCoverUrl;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Load saved settings from localStorage
    loadSettings();
    
    // Add Enter key handler for ISBN input
    document.getElementById('isbnInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            lookupISBN();
        }
    });
    
    // Settings change handlers
    document.getElementById('autoSaveTimeout').addEventListener('change', saveSettings);
    document.getElementById('defaultReadingStatus').addEventListener('change', saveSettings);
    document.getElementById('defaultOwnershipStatus').addEventListener('change', saveSettings);
});

function loadSettings() {
    const settings = JSON.parse(localStorage.getItem('fastAddSettings') || '{}');
    if (settings.autoSaveTimeout !== undefined) {
        document.getElementById('autoSaveTimeout').value = settings.autoSaveTimeout;
    }
    if (settings.defaultReadingStatus) {
        document.getElementById('defaultReadingStatus').value = settings.defaultReadingStatus;
    }
    if (settings.defaultOwnershipStatus) {
        document.getElementById('defaultOwnershipStatus').value = settings.defaultOwnershipStatus;
    }
}

function saveSettings() {
    const settings = {
        autoSaveTimeout: parseInt(document.getElementById('autoSaveTimeout').value) || 5,
        defaultReadingStatus: document.getElementById('defaultReadingStatus').value,
        defaultOwnershipStatus: document.getElementById('defaultOwnershipStatus').value
    };
    localStorage.setItem('fastAddSettings', JSON.stringify(settings));
}

function getSettings() {
    return {
        autoSaveTimeout: parseInt(document.getElementById('autoSaveTimeout').value) || 5,
        defaultReadingStatus: document.getElementById('defaultReadingStatus').value,
        defaultOwnershipStatus: document.getElementById('defaultOwnershipStatus').value || 'owned'
    };
}

function showIsbnNotification(message, type = 'success') {
    const notification = document.getElementById('isbnNotification');
    const messageEl = document.getElementById('isbnNotificationMessage');
    const icon = notification.querySelector('i');
    
    // Remove all alert classes
    notification.classList.remove('alert-success', 'alert-danger', 'alert-warning', 'alert-info');
    
    // Set the appropriate class and icon based on type
    if (type === 'success') {
        notification.classList.add('alert-success');
        icon.className = 'bi bi-check-circle me-2';
    } else if (type === 'error') {
        notification.classList.add('alert-danger');
        icon.className = 'bi bi-exclamation-triangle me-2';
    } else if (type === 'info') {
        notification.classList.add('alert-info');
        icon.className = 'bi bi-info-circle me-2';
    }
    
    messageEl.textContent = message;
    notification.style.display = 'block';
    
    // Auto-hide after 5 seconds for success messages
    if (type === 'success') {
        setTimeout(() => {
            notification.style.display = 'none';
        }, 5000);
    }
}

function hideIsbnNotification() {
    document.getElementById('isbnNotification').style.display = 'none';
}

function showError(message) {
    const errorAlert = document.getElementById('errorAlert');
    document.getElementById('errorMessage').textContent = message;
    errorAlert.style.display = 'block';
    setTimeout(() => {
        errorAlert.style.display = 'none';
    }, 5000);
}

function hideError() {
    document.getElementById('errorAlert').style.display = 'none';
}

function showLoading(show) {
    document.getElementById('loadingIndicator').style.display = show ? 'block' : 'none';
}

function clearTimers() {
    if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
        autoSaveTimer = null;
    }
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
    document.getElementById('autoSaveCountdown').style.display = 'none';
}

function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

async function lookupISBN() {
    const isbnInput = document.getElementById('isbnInput');
    const isbn = isbnInput.value.trim().replace(/[-\s]/g, '');
    
    if (!isbn) {
        showIsbnNotification('Please enter an ISBN', 'error');
        return;
    }
    
    // Basic ISBN validation
    if (isbn.length !== 10 && isbn.length !== 13) {
        showIsbnNotification('Invalid ISBN. Please enter a 10 or 13 digit ISBN.', 'error');
        return;
    }
    
    hideError();
    hideIsbnNotification();
    clearTimers();
    showLoading(true);
    document.getElementById('bookPreviewCard').style.display = 'none';
    
    try {
        // Use the unified metadata API
        const response = await fetch(`${API_URLS.unifiedMetadata}?isbn=${encodeURIComponent(isbn)}`, {
            method: 'GET',
            credentials: 'same-origin',
            headers: { 'Accept': 'application/json' }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        showLoading(false);
        
        if (result.status === 'success' && result.data && result.data.title) {
            displayBookPreview(result.data, isbn);
            // Show success notification with book title
            showIsbnNotification(`Found: "${result.data.title}"`, 'success');
            // Clear the ISBN input for the next entry
            isbnInput.value = '';
            isbnInput.focus();
        } else {
            showIsbnNotification('No book found for this ISBN. Please verify the ISBN and try again.', 'error');
            isbnInput.select();
        }
        
    } catch (error) {
        console.error('Lookup error:', error);
        showLoading(false);
        showIsbnNotification('Error looking up book. Please try again.', 'error');
        isbnInput.select();
    }
}

function displayBookPreview(bookData, isbn) {
    currentBookData = {
        title: bookData.title || '',
        author: bookData.authors ? (Array.isArray(bookData.authors) ? bookData.authors.join(', ') : bookData.authors) : '',
        isbn13: bookData.isbn13 || (isbn.length === 13 ? isbn : ''),
        isbn10: bookData.isbn10 || (isbn.length === 10 ? isbn : ''),
        publisher: bookData.publisher || '',
        published_date: bookData.published_date || '',
        page_count: bookData.page_count || '',
        language: bookData.language || 'en',
        description: bookData.description || '',
        cover_url: bookData.cover_url || FALLBACK_COVER,
        google_books_id: bookData.google_books_id || '',
        openlibrary_id: bookData.openlibrary_id || '',
        categories: bookData.categories || [],
        subtitle: bookData.subtitle || ''
    };
    
    // Update preview UI
    document.getElementById('previewTitle').textContent = currentBookData.title;
    document.getElementById('previewAuthors').innerHTML = 
        '<i class="bi bi-person me-1"></i><span>' + escapeHtml(currentBookData.author || 'Unknown Author') + '</span>';
    document.getElementById('previewISBN').textContent = currentBookData.isbn13 || currentBookData.isbn10 || isbn;
    document.getElementById('previewPublisher').textContent = currentBookData.publisher || '-';
    document.getElementById('previewDate').textContent = formatDate(currentBookData.published_date) || '-';
    document.getElementById('previewPages').textContent = currentBookData.page_count || '-';
    document.getElementById('previewDescription').textContent = 
        currentBookData.description ? truncateText(currentBookData.description, 200) : 'No description available.';
    
    // Handle cover image
    const coverImg = document.getElementById('previewCover');
    coverImg.src = currentBookData.cover_url || FALLBACK_COVER;
    coverImg.onerror = function() { this.src = FALLBACK_COVER; };
    
    // Show the preview card
    document.getElementById('bookPreviewCard').style.display = 'block';
    
    // Store data for saving
    document.getElementById('bookData').value = JSON.stringify(currentBookData);
    
    // Start auto-save countdown if enabled
    const settings = getSettings();
    if (settings.autoSaveTimeout > 0) {
        startAutoSaveCountdown(settings.autoSaveTimeout);
    }
}

function formatDate(dateStr) {
    if (!dateStr) return null;
    // Handle various date formats
    const s = String(dateStr).trim();
    if (/^\d{4}$/.test(s)) return s; // Year only
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
        return s.substring(0, 10);
    }
    return s;
}

function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function startAutoSaveCountdown(seconds) {
    clearTimers();
    
    let remaining = seconds;
    const countdownEl = document.getElementById('autoSaveCountdown');
    const secondsEl = document.getElementById('countdownSeconds');
    
    countdownEl.style.display = 'inline-block';
    secondsEl.textContent = remaining;
    
    countdownInterval = setInterval(() => {
        remaining--;
        secondsEl.textContent = remaining;
        
        if (remaining <= 0) {
            clearInterval(countdownInterval);
            saveBook();
        }
    }, 1000);
}

async function saveBook() {
    if (!currentBookData) {
        showError('No book data to save');
        return;
    }
    
    clearTimers();
    
    const settings = getSettings();
    const previewCard = document.getElementById('bookPreviewCard');
    previewCard.classList.add('saving');
    
    // Prepare data for saving
    const saveData = {
        ...currentBookData,
        reading_status: settings.defaultReadingStatus,
        ownership_status: settings.defaultOwnershipStatus
    };
    
    try {
        const formData = new FormData();
        formData.append('csrf_token', getCsrfToken());
        formData.append('title', saveData.title);
        formData.append('author', saveData.author);
        formData.append('isbn13', saveData.isbn13 || '');
        formData.append('isbn10', saveData.isbn10 || '');
        formData.append('publisher', saveData.publisher || '');
        formData.append('published_date', saveData.published_date || '');
        formData.append('page_count', saveData.page_count || '');
        formData.append('language', saveData.language || 'en');
        formData.append('description', saveData.description || '');
        formData.append('cover_url', saveData.cover_url || '');
        formData.append('reading_status', saveData.reading_status || '');
        formData.append('ownership_status', saveData.ownership_status || 'owned');
        formData.append('google_books_id', saveData.google_books_id || '');
        formData.append('openlibrary_id', saveData.openlibrary_id || '');
        formData.append('subtitle', saveData.subtitle || '');
        
        // Handle categories
        if (saveData.categories && saveData.categories.length > 0) {
            formData.append('raw_categories', JSON.stringify(saveData.categories));
        }
        
        const response = await fetch(API_URLS.fastAddSave, {
            method: 'POST',
            body: formData,
            credentials: 'same-origin'
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Add to recently added list
            addToRecentlyAdded(currentBookData, result.book_id);
            
            // Show success notification
            showIsbnNotification(`Saved: "${currentBookData.title}"`, 'success');
            
            // Clear current book data
            currentBookData = null;
            previewCard.style.display = 'none';
            previewCard.classList.remove('saving');
            
            // Focus back on ISBN input for next entry
            document.getElementById('isbnInput').focus();
        } else {
            previewCard.classList.remove('saving');
            showIsbnNotification(result.message || 'Failed to save book', 'error');
        }
        
    } catch (error) {
        console.error('Save error:', error);
        previewCard.classList.remove('saving');
        showError('Error saving book. Please try again.');
    }
}

function editBook() {
    if (!currentBookData) return;
    
    clearTimers();
    
    // Populate edit modal
    document.getElementById('editTitle').value = currentBookData.title || '';
    document.getElementById('editISBN').value = currentBookData.isbn13 || currentBookData.isbn10 || '';
    document.getElementById('editAuthor').value = currentBookData.author || '';
    document.getElementById('editPublisher').value = currentBookData.publisher || '';
    document.getElementById('editPublishedDate').value = formatDateForInput(currentBookData.published_date);
    document.getElementById('editPageCount').value = currentBookData.page_count || '';
    document.getElementById('editLanguage').value = currentBookData.language || 'en';
    document.getElementById('editCoverUrl').value = currentBookData.cover_url || '';
    document.getElementById('editDescription').value = currentBookData.description || '';
    
    // Set default statuses
    const settings = getSettings();
    document.getElementById('editReadingStatus').value = settings.defaultReadingStatus || '';
    document.getElementById('editOwnershipStatus').value = settings.defaultOwnershipStatus || 'owned';
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('editModal'));
    modal.show();
}

function formatDateForInput(dateStr) {
    if (!dateStr) return '';
    const s = String(dateStr).trim();
    // Already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
        return s.substring(0, 10);
    }
    // Year only
    if (/^\d{4}$/.test(s)) {
        return s + '-01-01';
    }
    return '';
}

async function saveEditedBook() {
    const form = document.getElementById('editBookForm');
    const formData = new FormData(form);
    formData.append('csrf_token', getCsrfToken());
    
    // Add ISBN fields
    const isbn = document.getElementById('editISBN').value;
    if (isbn.length === 13) {
        formData.append('isbn13', isbn);
    } else if (isbn.length === 10) {
        formData.append('isbn10', isbn);
    }
    
    // Preserve additional data from lookup
    if (currentBookData) {
        formData.append('google_books_id', currentBookData.google_books_id || '');
        formData.append('openlibrary_id', currentBookData.openlibrary_id || '');
        if (currentBookData.categories && currentBookData.categories.length > 0) {
            formData.append('raw_categories', JSON.stringify(currentBookData.categories));
        }
    }
    
    try {
        const response = await fetch(API_URLS.fastAddSave, {
            method: 'POST',
            body: formData,
            credentials: 'same-origin'
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('editModal'));
            modal.hide();
            
            // Add to recently added list
            const savedData = {
                title: formData.get('title'),
                author: formData.get('author'),
                cover_url: formData.get('cover_url') || FALLBACK_COVER,
                isbn13: formData.get('isbn13') || '',
                isbn10: formData.get('isbn10') || ''
            };
            addToRecentlyAdded(savedData, result.book_id);
            
            // Show success notification
            showIsbnNotification(`Saved: "${savedData.title}"`, 'success');
            
            // Clear current book data
            currentBookData = null;
            document.getElementById('bookPreviewCard').style.display = 'none';
            
            // Focus back on ISBN input
            document.getElementById('isbnInput').focus();
        } else {
            showIsbnNotification(result.message || 'Failed to save book', 'error');
        }
        
    } catch (error) {
        console.error('Save error:', error);
        showError('Error saving book. Please try again.');
    }
}

function skipBook() {
    clearTimers();
    currentBookData = null;
    document.getElementById('bookPreviewCard').style.display = 'none';
    document.getElementById('isbnInput').focus();
}

function addToRecentlyAdded(bookData, bookId) {
    const book = {
        id: bookId,
        title: bookData.title,
        author: bookData.author,
        cover_url: bookData.cover_url || FALLBACK_COVER,
        isbn: bookData.isbn13 || bookData.isbn10 || '',
        addedAt: new Date().toISOString()
    };
    
    recentlyAddedBooks.unshift(book);
    if (recentlyAddedBooks.length > 10) {
        recentlyAddedBooks.pop();
    }
    
    updateRecentlyAddedUI();
}

function updateRecentlyAddedUI() {
    const listEl = document.getElementById('recentlyAddedList');
    const countEl = document.getElementById('addedCount');
    
    countEl.textContent = recentlyAddedBooks.length + ' book' + (recentlyAddedBooks.length === 1 ? '' : 's') + ' added';
    
    if (recentlyAddedBooks.length === 0) {
        listEl.innerHTML = '<p class="text-muted mb-0 text-center py-3"><i class="bi bi-info-circle me-1"></i>Books you add will appear here</p>';
        return;
    }
    
    listEl.innerHTML = recentlyAddedBooks.map((book, index) => `
        <div class="recently-added-item d-flex align-items-center p-2 border-bottom ${index === 0 ? 'just-added' : ''}">
            <img src="${escapeHtml(book.cover_url)}" 
                 class="rounded me-3" style="width: 40px; height: 60px; object-fit: cover;"
                 onerror="this.src='${FALLBACK_COVER}'" alt="Cover">
            <div class="flex-grow-1">
                <div class="fw-bold">${escapeHtml(book.title)}</div>
                <small class="text-muted">${escapeHtml(book.author)}</small>
            </div>
            <div class="d-flex gap-2">
                <button class="btn btn-sm btn-outline-danger undo-btn" onclick="undoAdd('${escapeHtml(book.id)}')" title="Undo">
                    <i class="bi bi-arrow-counterclockwise"></i>
                </button>
            </div>
        </div>
    `).join('');
}

async function undoAdd(bookId) {
    if (!confirm('Remove this book from your library?')) return;
    
    try {
        const response = await fetch(API_URLS.deleteBook(bookId), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: 'csrf_token=' + encodeURIComponent(getCsrfToken()),
            credentials: 'same-origin'
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Remove from recently added list
            recentlyAddedBooks = recentlyAddedBooks.filter(b => b.id !== bookId);
            updateRecentlyAddedUI();
        } else {
            showError(result.message || 'Failed to remove book');
        }
        
    } catch (error) {
        console.error('Undo error:', error);
        showError('Error removing book');
    }
}

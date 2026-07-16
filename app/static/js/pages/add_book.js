// Extracted from add_book.html for browser caching.
// window.ADD_BOOK_CONFIG is set by a small inline script before this loads.

// Convert an HTML description to readable plain text for the textarea
function htmlDescriptionToText(html) {
    if (!html) return '';
    try {
        let s = String(html);
        // Normalize common line-breaking tags to newlines and bullets
        s = s.replace(/<\s*br\s*\/?>/gi, '\n');
        s = s.replace(/<\s*\/p\s*>/gi, '\n');
        s = s.replace(/<\s*li\s*>/gi, '• ');
        s = s.replace(/<\s*\/li\s*>/gi, '\n');
        // Strip remaining tags and decode HTML entities via the DOM
        const el = document.createElement('div');
        el.innerHTML = s;
        let text = el.textContent || el.innerText || '';
        // Collapse excessive blank lines
        text = text.replace(/\n{3,}/g, '\n\n');
        return text.trim();
    } catch (_) {
        return String(html);
    }
}

// Fetch book data from ISBN
function fetchBookData() {
    const isbn = document.getElementById('isbn').value.trim();
    if (!isbn) {
        showMessage('Please enter an ISBN to fetch book data.', 'error');
        return;
    }
    
    // Show loading state
    const button = document.getElementById('fetchBookButton');
    const originalText = button ? button.innerHTML : null;
    if (button) {
        button.innerHTML = '<i class="bi bi-spinner spin me-1"></i>Fetching...';
        button.disabled = true;
    }
    
    // Fetch unified book data by ISBN from the API
    fetch(`/api/v1/books/unified-metadata?isbn=${encodeURIComponent(isbn)}`, {
            method: 'GET',
            credentials: 'same-origin',
            headers: { 'Accept': 'application/json' }
        })
        .then(async response => {
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`HTTP ${response.status}: ${text?.slice(0,200)}`);
            }
            return response.json();
        })
        .then(resp => {
            const data = resp && resp.data ? resp.data : null;
            if (data && (data.title || data.isbn13 || data.isbn10)) {
                // Normalize keys expected by populateFormWithBookData
                const mapped = {
                    title: data.title || '',
                    subtitle: data.subtitle || '',
                    description: data.description || '',
                    publisher: data.publisher || '',
                    language: data.language || 'en',
                    page_count: data.page_count || null,
                    cover_url: data.cover_url || '',
                    series: data.series || '',
                    isbn_13: data.isbn13 || data.isbn_13 || '',
                    isbn_10: data.isbn10 || data.isbn_10 || '',
                    google_books_id: data.google_books_id || '',
                    openlibrary_id: data.openlibrary_id || '',
                    published_date: data.published_date || '',
                    authors: Array.isArray(data.authors) ? data.authors : [],
                    categories: Array.isArray(data.categories) ? data.categories : []
                };
                

                // Fallback: if API didn't return ISBNs, use the ISBN we just queried with
                try {
                    const raw = (isbn || '').replace(/[^0-9Xx]/g, '');
                    if (!mapped.isbn_13 && raw.length === 13) {
                        mapped.isbn_13 = raw;
                    } else if (!mapped.isbn_10 && raw.length === 10) {
                        mapped.isbn_10 = raw;
                    }
                } catch (_) { /* noop */ }
                populateFormWithBookData(mapped);
                
                // Display success message with title
                const matchedTitle = data.title ? escapeHtml(String(data.title)) : null;
                let successMessage = matchedTitle ? `Found book: <strong>${matchedTitle}</strong>` : 'Book data fetched successfully!';
                
                // Check for ISBN mismatch warnings
                if (resp.isbn_mismatch && resp.warnings && resp.warnings.length > 0) {
                    showIsbnMismatchWarning(resp.warnings);
                } else if (matchedTitle) {
                    showMessage(successMessage, 'success');
                } else {
                    showMessage('Book data fetched successfully!', 'success');
                }
            } else {
                showMessage('No book data found for this ISBN. You can enter details manually.', 'warning');
            }
        })
        .catch(error => {
            console.error('Error fetching book data:', error);
            showMessage('Error fetching book data. Please try again or enter details manually.', 'error');
        })
        .finally(() => {
            // Restore button state
            if (button && originalText !== null) {
                button.innerHTML = originalText;
            }
            if (button) {
                button.disabled = false;
            }
        });
}

// Title search functionality
function handleTitleKeyDown(event) {
    if (event.key === 'Enter') {
        event.preventDefault(); // Prevent form submission
        searchByTitle();
    }
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// Helper function to display ISBN mismatch warnings
function showIsbnMismatchWarning(warnings) {
    if (!warnings || warnings.length === 0) return;
    const warningMessages = warnings.map(w => escapeHtml(String(w))).join('<br>');
    showMessage(
        `<span role="img" aria-label="Warning">⚠️</span> <strong>ISBN Mismatch Detected</strong><br>${warningMessages}<br><br>The metadata shown may be for a different volume. Please verify the information before saving.`,
        'warning',
        10000
    );
}

// Fallback cover image served via Flask's custom static route
const FALLBACK_COVER_URL = window.ADD_BOOK_CONFIG.fallbackCoverUrl;

// Maintain the original hierarchical category paths we derived from APIs/user input
window.rawCategoryPaths = new Set();

function isHierarchicalCategory(name) {
    return typeof name === 'string' && /[>/]/.test(name);
}

function splitCategoryPath(name) {
    if (!name) return [];
    return String(name)
        .split(/[>\/]/)
        .map(s => s.trim())
        .filter(Boolean);
}

// Add a category visually; if hierarchical, show all path segments as chips,
// but also store the full path for backend to build parent/child relations.
function addCategorySmart(name, id = null, color = null, icon = null) {
    if (!name) return;
    const displayDiv = document.querySelector('.categories-display');
    if (!displayDiv) return;

    // Always remember the raw path (for backend)
    window.rawCategoryPaths.add(String(name));

    const parts = isHierarchicalCategory(name) ? splitCategoryPath(name) : [String(name)];
    
    parts.forEach(part => {
        // Prevent duplicate segment chips by name (with CSS.escape fallback)
        let escaped = '';
        try {
            escaped = (window.CSS && typeof CSS.escape === 'function') ? CSS.escape(part) : String(part).replace(/(["\\\]])/g, '\\$1');
        } catch (_) {
            escaped = String(part).replace(/(["\\\]])/g, '\\$1');
        }
        const existing = displayDiv.querySelector(`[data-name="${escaped}"]`);
        if (existing) return;
        addCategory(part, null, color, icon);
    });
}

// Collect current author chips into a single comma-separated string for search disambiguation
function getSelectedAuthorsForSearch() {
    try {
        const tags = document.querySelectorAll('[data-type="authored"] .contributor-tag');
        const names = Array.from(tags)
            .map(el => el.getAttribute('data-name') || el.textContent || '')
            .map(s => s.replace(/[×]/g, '').trim())
            .filter(Boolean);
        return names.join(', ');
    } catch (_) {
        return '';
    }
}

function searchByTitle() {
    console.log('🔍 searchByTitle function called!');
    try {
        const title = document.getElementById('title').value.trim();
        
        if (title.length < 3) {
            showMessage('Please enter at least 3 characters to search for books.', 'warning');
            return;
        }
        
        // Show modal and loading state
        const modalElement = document.getElementById('titleSearchModal');
        if (!modalElement) {
            console.error('❌ Modal element not found!');
            return;
        }
        
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
        
        const loadingDiv = document.getElementById('title-search-loading');
        const resultsDiv = document.getElementById('title-search-results');
        const emptyDiv = document.getElementById('title-search-empty');
        
        loadingDiv.style.display = 'block';
        resultsDiv.style.display = 'none';
        emptyDiv.style.display = 'none';
        
        // Update modal title with search term
        document.getElementById('titleSearchModalLabel').innerHTML = `
            <i class="bi bi-search me-2"></i>Search Results for "${title}"
        `;
        
    // Build query params with optional author to improve match quality
    const author = getSelectedAuthorsForSearch();
    const params = new URLSearchParams({ title, limit: '10', isbn_required: 'true' });
    if (author) params.set('author', author);

    // Call the external search API
    fetch(`/api/v1/books/external-search?${params.toString()}` , {
            method: 'GET',
            credentials: 'same-origin',
            headers: { 'Accept': 'application/json' }
        })
            .then(response => response.json())
            .then(data => {
                loadingDiv.style.display = 'none';
                
                if (data.status === 'success' && data.data && data.data.length > 0) {
                    displayTitleSearchResults(data.data);
                    resultsDiv.style.display = 'block';
                } else {
                    emptyDiv.style.display = 'block';
                }
            })
            .catch(error => {
                console.error('Error searching for books:', error);
                loadingDiv.style.display = 'none';
                emptyDiv.style.display = 'block';
                showMessage('Error searching for books. Please try again.', 'error');
            });
    } catch (error) {
        console.error('❌ Error in searchByTitle():', error);
        alert('Error: ' + error.message);
    }
}

function displayTitleSearchResults(results) {
    // Store results globally for later use
    window.searchResults = results;
    
    const resultsDiv = document.getElementById('title-search-results');
    resultsDiv.innerHTML = '';
    
    results.forEach((book, index) => {
    const fullData = book.full_data || book; // Fallback to book if full_data is missing
    const coverUrl = fullData.cover_url || FALLBACK_COVER_URL;
    const isbn = fullData.isbn_13 || fullData.isbn13 || fullData.isbn_10 || fullData.isbn10 || 'N/A';
        
        const resultCard = document.createElement('div');
        resultCard.className = 'col-12 col-lg-6';
        resultCard.innerHTML = `
            <div class="card mb-3 search-result-card h-100">
                <div class="row g-0">
                    <div class="col-3 col-md-2">
                    <img src="${coverUrl}" class="img-fluid rounded-start" alt="Book Cover" 
                             style="height: 160px; width: 100%; object-fit: cover;"
                        onerror="this.src='${FALLBACK_COVER_URL}'">
                    </div>
                    <div class="col-9 col-md-10">
                        <div class="card-body p-3">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <h6 class="card-title mb-1 fw-bold" style="font-size: 1.1rem; line-height: 1.3;">
                                    ${escapeHtml(fullData.title || 'Unknown Title')}
                                </h6>
                                <span class="badge bg-success ms-2">
                                    ${(book.similarity_score * 100).toFixed(0)}% match
                                </span>
                            </div>
                            
                            ${fullData.subtitle ? `<p class="text-muted mb-2 fst-italic" style="font-size: 0.9rem;">${escapeHtml(fullData.subtitle)}</p>` : ''}
                            
                            <div class="row g-2 mb-2">
                                <div class="col-12 col-md-6">
                                    <small class="text-muted d-block">
                                        <strong>Author:</strong> ${escapeHtml(book.author || 'Unknown')}
                                    </small>
                                    <small class="text-muted d-block">
                                        <strong>Published:</strong> ${escapeHtml(fullData.published_date || book.publication_year || 'Unknown')}
                                    </small>
                                </div>
                                <div class="col-12 col-md-6">
                                    <small class="text-muted d-block">
                                        <strong>Pages:</strong> ${book.page_count || 'Unknown'}
                                    </small>
                                    <small class="text-muted d-block">
                                        <strong>ISBN:</strong> ${isbn}
                                    </small>
                                </div>
                            </div>
                            
                            ${fullData.description ? `<p class="card-text text-muted mb-3" style="font-size: 0.85rem; line-height: 1.4;">
                                <strong>Description:</strong> ${(() => {
                                    const desc = escapeHtml(fullData.description);
                                    return desc.length > 120 ? desc.substring(0, 120) + '...' : desc;
                                })()}
                            </p>` : ''}
                            
                            <div class="d-flex justify-content-between align-items-center">
                                <small class="text-primary">
                                    <i class="bi bi-info-circle me-1"></i>
                                    Source: ${fullData.source || 'Unknown'}
                                </small>
                                ${isbn !== 'N/A' ? 
                                    `<button type="button" class="btn btn-primary btn-sm" 
                                            onclick="selectBookFromSearch(${index})">
                                        <i class="bi bi-check-lg me-1"></i>Use This Book
                                    </button>` :
                                    `<small class="text-warning">
                                        <i class="bi bi-exclamation-triangle me-1"></i>No ISBN Available
                                    </small>`
                                }
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        resultsDiv.appendChild(resultCard);
    });
}

function selectBookFromSearch(bookIndex) {
    // Get the selected book data from our stored results
    if (!window.searchResults || !window.searchResults[bookIndex]) {
        showMessage('Error: Book data not found. Please try searching again.', 'error');
        return;
    }
    
    const selectedBook = window.searchResults[bookIndex];
    const fullData = selectedBook.full_data || selectedBook;
    
    console.log('📖 Using merged book data:', fullData);
    
    // Close the modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('titleSearchModal'));
    modal.hide();
    
    // The fullData already contains the BEST merged information from both APIs
    // This includes smart date selection, combined metadata, etc.
    
    // If this book has an ISBN, fetch additional data and merge it intelligently
    const isbn = fullData.isbn_13 || fullData.isbn13 || fullData.isbn_10 || fullData.isbn10;
    
    if (isbn) {
        // Show loading message
        showMessage('Loading complete book details...', 'info');
        
        // Use unified metadata ISBN lookup for consistency
        fetch(`/api/v1/books/unified-metadata?isbn=${encodeURIComponent(isbn)}`, {
                method: 'GET',
                credentials: 'same-origin',
                headers: { 'Accept': 'application/json' }
            })
            .then(response => response.json())
            .then(apiResp => {
                const isbnData = apiResp && apiResp.data ? apiResp.data : {};
                console.log('📚 Retrieved additional ISBN data (unified):', isbnData);
                
                // Merge the search result data with ISBN lookup data intelligently
                const mergedData = mergeBookData(fullData, isbnData);
                console.log('🔀 Final merged data:', mergedData);
                // Guarantee ISBN presence from selection
                try {
                    const raw = String(isbn).replace(/[^0-9Xx]/g, '');
                    if (!mergedData.isbn_13 && raw.length === 13) mergedData.isbn_13 = raw;
                    if (!mergedData.isbn_10 && raw.length === 10) mergedData.isbn_10 = raw;
                } catch(_) { /* noop */ }
                
                // Populate form with the intelligently merged data
                populateFormWithBookData(mergedData);
                
                // Check for ISBN mismatch warnings
                if (apiResp.isbn_mismatch && apiResp.warnings && apiResp.warnings.length > 0) {
                    showIsbnMismatchWarning(apiResp.warnings);
                } else {
                    showMessage(`Selected "${mergedData.title}" - Form populated with enhanced book details!`, 'success');
                }
            })
            .catch(error => {
                console.warn('⚠️ ISBN lookup failed, using search data only:', error);
                // Fall back to using just the search result data
                populateFormWithBookData(fullData);
                showMessage(`Selected "${fullData.title}" - Form populated with available details!`, 'success');
            });
    } else {
        // No ISBN available, use the search data directly
        populateFormWithBookData(fullData);
        showMessage(`Selected "${fullData.title}" - Form populated with available details!`, 'success');
    }
}

function mergeBookData(searchData, isbnData) {
    // Start with search data (which is already merged from Google Books + OpenLibrary)
    const merged = { ...searchData };
    
    // Intelligently merge fields, preferring more complete/detailed data
    
    // Title: prefer longer/more complete title
    if (isbnData.title && isbnData.title.length > (merged.title || '').length) {
        merged.title = isbnData.title;
    }
    
    // Subtitle: use if missing or if ISBN data has a longer one
    if (!merged.subtitle && isbnData.subtitle) {
        merged.subtitle = isbnData.subtitle;
    } else if (isbnData.subtitle && isbnData.subtitle.length > (merged.subtitle || '').length) {
        merged.subtitle = isbnData.subtitle;
    }
    
    // Description: prefer longer, more detailed description
    if (!merged.description && isbnData.description) {
        merged.description = isbnData.description;
    } else if (isbnData.description && isbnData.description.length > (merged.description || '').length) {
        merged.description = isbnData.description;
    }
    
    // Publisher: use if missing
    if (!merged.publisher && isbnData.publisher) {
        merged.publisher = isbnData.publisher;
    }
    
    // Page count: prefer actual number over null/undefined
    if (!merged.page_count && isbnData.page_count) {
        merged.page_count = isbnData.page_count;
    } else if (isbnData.page_count && (!merged.page_count || isbnData.page_count > merged.page_count)) {
        merged.page_count = isbnData.page_count;
    }
    
    // Language: use if missing
    if (!merged.language && isbnData.language) {
        merged.language = isbnData.language;
    }
    
    // Authors: merge arrays, removing duplicates
    if (isbnData.authors && Array.isArray(isbnData.authors)) {
        const existingAuthors = merged.authors || [];
        const allAuthors = [...existingAuthors, ...isbnData.authors];
        merged.authors = [...new Set(allAuthors)]; // Remove duplicates
        merged.author = merged.authors.join(', ');
    }
    
    // Categories: merge arrays, removing duplicates (keep all for hierarchy expansion)
    if (isbnData.categories && Array.isArray(isbnData.categories)) {
        const existingCategories = merged.categories || [];
        const allCategories = [...existingCategories, ...isbnData.categories];
        merged.categories = [...new Set(allCategories)];
    }
    
    // Cover URL: prefer higher quality or use as fallback
    if (!merged.cover_url && isbnData.cover_url) {
        merged.cover_url = isbnData.cover_url;
    }
    
    // Publication date: use the smart date selection we already implemented
    if (isbnData.published_date || isbnData.publication_year) {
        // Re-run our smart date selection with the new data
        const currentDate = merged.published_date || '';
        const currentYear = merged.publication_year;
        const newDate = isbnData.published_date || '';
        const newYear = isbnData.publication_year;
        
        // Use the same logic as in book_search.py
        if (currentDate && newDate) {
            // Check which is more detailed
            const currentIsFull = /\d{1,2}[-/]\d{1,2}[-/]\d{4}|\d{4}-\d{1,2}-\d{1,2}|[A-Za-z]{3,}/.test(currentDate);
            const newIsFull = /\d{1,2}[-/]\d{1,2}[-/]\d{4}|\d{4}-\d{1,2}-\d{1,2}|[A-Za-z]{3,}/.test(newDate);
            
            if (newIsFull && !currentIsFull) {
                merged.published_date = newDate;
                merged.publication_year = newYear || currentYear;
            } else if (!currentDate && newDate) {
                merged.published_date = newDate;
                merged.publication_year = newYear || currentYear;
            }
        } else if (!merged.published_date && isbnData.published_date) {
            merged.published_date = isbnData.published_date;
            merged.publication_year = isbnData.publication_year || merged.publication_year;
        }
    }
    
    return merged;
}

function populateFormWithBookData(bookData) {
    console.log('📝 Populating form with book data:', bookData);
    
    // Basic information
    document.getElementById('title').value = bookData.title || '';
    document.getElementById('subtitle').value = bookData.subtitle || '';
    // Prefer returned ISBNs; otherwise keep whatever user typed
    const typedIsbnRaw = (document.getElementById('isbn').value || '').replace(/[^0-9Xx]/g, '');
    const returnedIsbn = bookData.isbn_13 || bookData.isbn_10 || '';
    document.getElementById('isbn').value = returnedIsbn || typedIsbnRaw || '';
    document.getElementById('description').value = htmlDescriptionToText(bookData.description || '');
    document.getElementById('cover_url').value = bookData.cover_url || bookData.cover || '';
    document.getElementById('publisher').value = bookData.publisher || '';
    document.getElementById('language').value = bookData.language || 'en';
    // Series (if provided by unified metadata)
    const seriesEl = document.getElementById('series_input');
    if (seriesEl) seriesEl.value = bookData.series || '';
    
    // Additional Details fields
    let isbn13Val = bookData.isbn_13 || bookData.isbn13 || '';
    let isbn10Val = bookData.isbn_10 || bookData.isbn10 || '';
    if (!isbn13Val && !isbn10Val && typedIsbnRaw) {
        if (typedIsbnRaw.length === 13) isbn13Val = typedIsbnRaw;
        else if (typedIsbnRaw.length === 10) isbn10Val = typedIsbnRaw;
    }
    document.getElementById('isbn13').value = isbn13Val;
    document.getElementById('isbn10').value = isbn10Val;
    document.getElementById('google_books_id').value = bookData.google_books_id || '';
    const olInput2 = document.getElementById('openlibrary_id');
    if (olInput2) olInput2.value = bookData.openlibrary_id || '';
    
    // Publication date handling
    if (bookData.published_date) {
        let dateValue = bookData.published_date.trim();
        // Normalize common partial forms to full ISO (YYYY-MM-DD) for date input
        if (/^\d{4}$/.test(dateValue)) {
            dateValue = `${dateValue}-01-01`;
        } else if (/^\d{4}-\d{2}$/.test(dateValue)) {
            dateValue = `${dateValue}-01`;
        } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateValue)) {
            // Convert MM/DD/YYYY -> YYYY-MM-DD
            const [mm, dd, yyyy] = dateValue.split('/');
            dateValue = `${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`;
        }
        document.getElementById('published_date').value = dateValue;
    } else if (bookData.publication_year) {
        document.getElementById('published_date').value = `${bookData.publication_year}-01-01`;
    }
    
    // Page count
    if (bookData.page_count) {
        document.getElementById('page_count').value = bookData.page_count;
    }
    
    // Clear existing authors and add new ones
    const authorFields = document.querySelectorAll('[data-type="authored"] .contributor-tag');
    authorFields.forEach(tag => tag.remove());
    
    if (bookData.authors && bookData.authors.length > 0) {
        bookData.authors.forEach(author => {
            addContributor('authored', author, null);
        });
    }
    
    // Clear existing categories and add new ones
    const categoryFields = document.querySelectorAll('.category-tag');
    categoryFields.forEach(tag => tag.remove());
    
    // Prefer raw_category_paths if provided (they keep full hierarchical strings)
    if ((!bookData.categories || bookData.categories.length <= 1) && Array.isArray(bookData.raw_category_paths) && bookData.raw_category_paths.length > 1) {
        bookData.categories = bookData.raw_category_paths;
        
    }

    if (bookData.categories && bookData.categories.length > 0) {
        
        bookData.categories.forEach(category => {
            addCategorySmart(category, null, null, null);
        });
    }



    // Automatically fetch and show cover candidates to let the user pick a better-quality image
    try {
        const isbn = document.getElementById('isbn').value || '';
        const title = document.getElementById('title').value || '';
        const authors = getSelectedAuthorsForSearch();
        // Defer slightly so DOM updates settle
        setTimeout(() => fetchAndShowCoverCandidates({isbn, title, authors}), 250);
    } catch (_) {}
}


function showMessage(message, type, duration = 5000) {
  // Create alert element
  const alertDiv = document.createElement('div');
    const bsType = type === 'success' ? 'success' : (type === 'warning' ? 'warning' : (type === 'info' ? 'info' : 'danger'));
    alertDiv.className = `alert alert-${bsType} alert-dismissible fade show`;
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  
  // Insert at the top of the container
  const container = document.querySelector('.container-fluid') || document.querySelector('.container');
  container.insertBefore(alertDiv, container.firstChild);
  
  // Auto-dismiss after specified duration (default 5 seconds)
  setTimeout(() => {
    if (alertDiv.parentNode) {
      alertDiv.remove();
    }
  }, duration);
}

// Contributor management functions
function removeContributor(element) {
    element.parentElement.remove();
}

function removeCategory(element) {
    element.parentElement.remove();
}

function addContributor(type, name, id) {
    const displayDiv = document.querySelector(`[data-type="${type}"] .contributors-display`);
    
    // Check if contributor already exists
    const existing = displayDiv.querySelector(`[data-name="${name}"]`);
    if (existing) {
        return;
    }
    
    const tag = document.createElement('div');
    tag.className = 'contributor-tag';
    tag.setAttribute('data-name', name);
    if (id) {
        tag.setAttribute('data-id', id);
    }
    tag.innerHTML = `${name} <span class="remove" onclick="removeContributor(this)">×</span>`;
    
    displayDiv.appendChild(tag);
    
    // Clear the input
    const input = document.querySelector(`[data-type="${type}"] .contributor-input`);
    if (input) {
        input.value = '';
    }
}

function addCategory(name, id, color, icon) {
    const displayDiv = document.querySelector('.categories-display');
    
    // Check if category already exists
    const existing = displayDiv.querySelector(`[data-name="${name}"]`);
    if (existing) {
        return;
    }
    
    const tag = document.createElement('div');
    tag.className = 'category-tag';
    tag.setAttribute('data-name', name);
    if (id) {
        tag.setAttribute('data-id', id);
    }
    
    let tagContent = '';
    if (icon) {
        tagContent += `<span class="me-1">${icon}</span>`;
    }
    tagContent += `${name} <span class="remove" onclick="removeCategory(this)">×</span>`;
    tag.innerHTML = tagContent;
    
    if (color) {
        tag.style.backgroundColor = color + '20';
        tag.style.borderColor = color;
        tag.style.color = color;
    }
    
    displayDiv.appendChild(tag);
    
    // Clear the input
    const input = document.querySelector('.category-input');
    if (input) {
        input.value = '';
    }
}

// Initialize autocomplete functionality when page loads
let searchTimeout;
let activeDropdown = null;
let lastClickedSubmitButton = null;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize contributor autocomplete for all contributor inputs
    document.querySelectorAll('.contributor-input').forEach(input => {
        initializeContributorAutocomplete(input);
    });
    
    // Initialize category autocomplete
    const categoryInput = document.querySelector('.category-input');
    if (categoryInput) {
        initializeCategoryAutocomplete(categoryInput);
    }
    
    // Load locations
    loadLocations();

    // Focus ISBN input for quick scanning and select existing text if present
    const isbnInput = document.getElementById('isbn');
    if (isbnInput) {
        isbnInput.addEventListener('keydown', event => {
            if (event.key === 'Enter') {
                event.preventDefault();
                fetchBookData();
            }
        });
    }
    
    // Handle form submission to collect contributors and categories
    const form = document.getElementById('addBookForm');
    if (form) {
        const submitButtons = form.querySelectorAll('button[type="submit"]');
        const submitActionField = document.getElementById('submitActionField');
        submitButtons.forEach(button => {
            button.addEventListener('click', () => {
                lastClickedSubmitButton = button;
                if (submitActionField) {
                    const actionValue = button.value || button.getAttribute('value') || 'save';
                    submitActionField.value = actionValue;
                }
            });
        });

        form.addEventListener('submit', async function(e) {
            // Prevent default submission to handle via AJAX
            e.preventDefault();
            
            // Collect contributors and categories before submit
            collectContributorsAndCategories();

            const buttons = Array.from(form.querySelectorAll('button[type="submit"]'));
            let submitter = e.submitter || lastClickedSubmitButton;
            if (!submitter && buttons.length) {
                submitter = buttons[buttons.length - 1];
            }

            buttons.forEach(button => {
                if (button === submitter) {
                    const loadingHtml = button.dataset.loadingText || "<i class='bi bi-spinner spin me-1'></i>Saving...";
                    if (!button.dataset.originalHtml) {
                        button.dataset.originalHtml = button.innerHTML;
                    }
                    button.innerHTML = loadingHtml;
                }
                button.disabled = true;
            });
            
            // Submit via fetch to detect duplicates
            try {
                const formData = new FormData(form);
                const response = await fetch(form.action || window.location.pathname, {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: formData
                });
                
                // Check if response is JSON
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const result = await response.json();
                    
                    if (result.duplicate && result.book_id) {
                        // Duplicate detected - show modal
                        buttons.forEach(button => {
                            button.disabled = false;
                            if (button.dataset.originalHtml) {
                                button.innerHTML = button.dataset.originalHtml;
                            }
                        });
                        showDuplicateModal(result);
                    } else if (result.success) {
                        // Success - redirect
                        window.location.href = result.redirect_url || window.ADD_BOOK_CONFIG.libraryUrl;
                    } else {
                        // Error
                        alert('Error: ' + (result.message || 'Failed to add book'));
                        buttons.forEach(button => {
                            button.disabled = false;
                            if (button.dataset.originalHtml) {
                                button.innerHTML = button.dataset.originalHtml;
                            }
                        });
                    }
                } else {
                    // HTML response - submit normally (fallback for non-AJAX responses)
                    const html = await response.text();
                    document.open();
                    document.write(html);
                    document.close();
                }
            } catch (error) {
                console.error('Error submitting form:', error);
                alert('An error occurred while adding the book. Please try again.');
                buttons.forEach(button => {
                    button.disabled = false;
                    if (button.dataset.originalHtml) {
                        button.innerHTML = button.dataset.originalHtml;
                    }
                });
            }
        });
    }
});

function initializeContributorAutocomplete(input) {
    input.addEventListener('input', handleInput);
    input.addEventListener('keydown', handleKeydown);
    input.addEventListener('blur', handleBlur);
}

function handleInput(e) {
    const input = e.target;
    const query = input.value.trim();
    const dropdown = input.nextElementSibling;
    
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    
    if (query.length < 2) {
        hideDropdown(dropdown);
        return;
    }
    
    // Reduced timeout for more responsive search
    searchTimeout = setTimeout(() => {
        searchPersons(query, dropdown, input);
    }, 150);
}

function handleKeydown(e) {
    const dropdown = e.target.nextElementSibling;
    const items = dropdown.querySelectorAll('.autocomplete-item');
    const selected = dropdown.querySelector('.autocomplete-item.selected');
    
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = selected?.nextElementSibling || items[0];
        if (next) {
            selected?.classList.remove('selected');
            next.classList.add('selected');
        }
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = selected?.previousElementSibling || items[items.length - 1];
        if (prev) {
            selected?.classList.remove('selected');
            prev.classList.add('selected');
        }
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selected) {
            selected.click();
        } else if (e.target.value.trim()) {
            // Create new contributor if none selected
            const contributorType = e.target.getAttribute('data-type');
            addContributor(contributorType, e.target.value.trim(), null);
            e.target.value = '';
            hideDropdown(dropdown);
        }
    } else if (e.key === 'Escape') {
        hideDropdown(dropdown);
    }
}

function handleBlur(e) {
    const dropdown = e.target.nextElementSibling;
    // Delay hiding to allow for clicks
    setTimeout(() => {
        if (!dropdown.matches(':hover')) {
            hideDropdown(dropdown);
        }
    }, 150);
}

function searchPersons(query, dropdown, input) {
    fetch(`/people/api/person/search?q=${encodeURIComponent(query)}`)
        .then(response => response.json())
        .then(data => {
            showDropdown(dropdown, data, input);
        })
        .catch(error => {
            console.error('Error searching persons:', error);
            hideDropdown(dropdown);
        });
}

function showDropdown(dropdown, data, input) {
    dropdown.innerHTML = '';
    
    if (data.length === 0) {
        dropdown.innerHTML = `
            <div class="autocomplete-item create-new" onclick="createNewPerson('${input.value.trim()}', '${input.getAttribute('data-type')}', this)">
                <i class="bi bi-plus-circle me-2"></i>Create "${input.value.trim()}" as new contributor
            </div>
        `;
    } else {
        data.forEach(person => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.innerHTML = `
                <div class="name">${person.name}</div>
                ${person.bio ? `<div class="bio">${person.bio}</div>` : ''}
            `;
            item.onclick = () => selectPerson(person, input);
            dropdown.appendChild(item);
        });
        
        // Add create new option
        const createItem = document.createElement('div');
        createItem.className = 'autocomplete-item create-new';
        createItem.innerHTML = `
            <i class="bi bi-plus-circle me-2"></i>Create "${input.value.trim()}" as new contributor
        `;
        createItem.onclick = () => createNewPerson(input.value.trim(), input.getAttribute('data-type'), createItem);
        dropdown.appendChild(createItem);
    }
    
    dropdown.style.display = 'block';
    activeDropdown = dropdown;
}

function hideDropdown(dropdown) {
    dropdown.style.display = 'none';
    if (activeDropdown === dropdown) {
        activeDropdown = null;
    }
}

function selectPerson(person, input) {
    const contributorType = input.getAttribute('data-type');
    addContributor(contributorType, person.name, person.id);
    input.value = '';
    hideDropdown(input.nextElementSibling);
}

function createNewPerson(name, contributorType, element) {
    // Add the contributor immediately
    addContributor(contributorType, name, null);
    
    // Clear input and hide dropdown
    const input = element.closest('.contributor-autocomplete').querySelector('.contributor-input');
    input.value = '';
    hideDropdown(element.parentElement);
}

function initializeCategoryAutocomplete(input) {
    input.addEventListener('input', handleCategoryInput);
    input.addEventListener('keydown', handleCategoryKeydown);
    input.addEventListener('blur', handleCategoryBlur);
}

function handleCategoryInput(e) {
    const input = e.target;
    const query = input.value.trim();
    const dropdown = input.nextElementSibling;
    
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    
    if (query.length < 2) {
        hideDropdown(dropdown);
        return;
    }
    
    searchTimeout = setTimeout(() => {
        searchCategories(query, dropdown, input);
    }, 150);
}

function handleCategoryKeydown(e) {
    const dropdown = e.target.nextElementSibling;
    const items = dropdown.querySelectorAll('.autocomplete-item');
    const selected = dropdown.querySelector('.autocomplete-item.selected');
    
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = selected?.nextElementSibling || items[0];
        if (next) {
            selected?.classList.remove('selected');
            next.classList.add('selected');
        }
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = selected?.previousElementSibling || items[items.length - 1];
        if (prev) {
            selected?.classList.remove('selected');
            prev.classList.add('selected');
        }
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selected) {
            selected.click();
        } else if (e.target.value.trim()) {
            // Create new category if none selected; support hierarchical input
            addCategorySmart(e.target.value.trim(), null, null, null);
            e.target.value = '';
            hideDropdown(dropdown);
        }
    } else if (e.key === 'Escape') {
        hideDropdown(dropdown);
    }
}

function handleCategoryBlur(e) {
    const dropdown = e.target.nextElementSibling;
    setTimeout(() => {
        if (!dropdown.matches(':hover')) {
            hideDropdown(dropdown);
        }
    }, 150);
}

function searchCategories(query, dropdown, input) {
    fetch(`/categories/api/search?q=${encodeURIComponent(query)}`)
        .then(response => response.json())
        .then(data => {
            showCategoryDropdown(dropdown, data, input);
        })
        .catch(error => {
            console.error('Error searching categories:', error);
            // Show create new option even if search fails
            showCategoryDropdown(dropdown, [], input);
        });
}

function showCategoryDropdown(dropdown, data, input) {
    dropdown.innerHTML = '';
    
    if (data.length === 0) {
        dropdown.innerHTML = `
            <div class="autocomplete-item create-new" onclick="createNewCategory('${input.value.trim()}', this)">
                <i class="bi bi-plus-circle me-2"></i>Create "${input.value.trim()}" as new genre
            </div>
        `;
    } else {
        data.forEach(category => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.innerHTML = `
                <div class="name">
                    ${category.icon ? `<span class="me-1">${category.icon}</span>` : ''}
                    ${category.name}
                </div>
            `;
            item.onclick = () => selectCategory(category, input);
            dropdown.appendChild(item);
        });
        
        // Add create new option
        const createItem = document.createElement('div');
        createItem.className = 'autocomplete-item create-new';
        createItem.innerHTML = `
            <i class="bi bi-plus-circle me-2"></i>Create "${input.value.trim()}" as new genre
        `;
        createItem.onclick = () => createNewCategory(input.value.trim(), createItem);
        dropdown.appendChild(createItem);
    }
    
    dropdown.style.display = 'block';
    activeDropdown = dropdown;
}

function selectCategory(category, input) {
    // If the category result contains a hierarchical path representation in name, keep it.
    // API currently returns flat names; users can type hierarchy (e.g., "Fiction / Sci-Fi").
    if (category && category.name) {
        // Capture full path if present
        window.rawCategoryPaths.add(category.name);
    }
    addCategorySmart(category.name, category.id, category.color, category.icon);
    input.value = '';
    hideDropdown(input.nextElementSibling);
}

function createNewCategory(name, element) {
    // Add the category immediately
    window.rawCategoryPaths.add(name);
    addCategorySmart(name, null, null, null);
    
    // Clear input and hide dropdown
    const input = element.closest('.category-autocomplete').querySelector('.category-input');
    input.value = '';
    hideDropdown(element.parentElement);
}

function loadLocations() {
    const locationSelect = document.getElementById('location_id');
    if (!locationSelect) return;
    
    fetch('/locations/api/user_locations')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(locations => {
            // Clear existing options except the first one (which should be "Select location...")
            while (locationSelect.children.length > 1) {
                locationSelect.removeChild(locationSelect.lastChild);
            }
            
            // Add location options
            locations.forEach(location => {
                const option = document.createElement('option');
                option.value = location.id;
                option.textContent = location.name;
                if (location.is_default) option.dataset.default = 'true';
                locationSelect.appendChild(option);
            });
            // Auto-select default (or single) location
            if (!locationSelect.value) {
                const def = locations.find(l => l.is_default) || (locations.length === 1 ? locations[0] : null);
                if (def) {
                    locationSelect.value = def.id;
                    const placeholder = locationSelect.querySelector('option[value=""]');
                    if (placeholder) placeholder.textContent = 'Using default location';
                    locationSelect.dispatchEvent(new Event('change'));
                }
            }
        })
        .catch(error => {
            console.error('Error loading locations:', error);
            // Show a message to the user instead of falling back to fake data
            showMessage('Could not load locations. Please refresh the page and try again.', 'warning');
        });
}

function collectContributorsAndCategories() {
    // Collect all contributors
    const contributorTypes = ['authored', 'narrated', 'edited', 'translated', 'illustrated'];
    contributorTypes.forEach(type => {
        const contributors = [];
        const tags = document.querySelectorAll(`[data-type="${type}"] .contributor-tag`);
        tags.forEach(tag => {
            const name = tag.getAttribute('data-name');
            const id = tag.getAttribute('data-id');
            contributors.push({name: name, id: id});
        });
        
        // Add hidden inputs for contributors
        if (contributors.length > 0) {
            const hiddenInput = document.createElement('input');
            hiddenInput.type = 'hidden';
            hiddenInput.name = `contributors_${type}`;
            hiddenInput.value = JSON.stringify(contributors);
            document.getElementById('addBookForm').appendChild(hiddenInput);
        }
    });
    
    // Collect visual category chips (segments) for UI consistency
    const categories = [];
    const categoryTags = document.querySelectorAll('.category-tag');
    categoryTags.forEach(tag => {
        const name = tag.getAttribute('data-name');
        const id = tag.getAttribute('data-id');
        categories.push({name: name, id: id});
    });
    if (categories.length > 0) {
        const hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden';
        hiddenInput.name = 'categories';
        hiddenInput.value = JSON.stringify(categories);
        document.getElementById('addBookForm').appendChild(hiddenInput);
    }

    // Also submit raw hierarchical paths so backend can create parent/child relationships
    if (window.rawCategoryPaths && window.rawCategoryPaths.size > 0) {
        const rawInput = document.createElement('input');
        rawInput.type = 'hidden';
        rawInput.name = 'raw_categories';
        rawInput.value = JSON.stringify(Array.from(window.rawCategoryPaths));
        document.getElementById('addBookForm').appendChild(rawInput);
    }
}

// ----- Series Autocomplete (Add Book Form) -----
function initializeSeriesAutocomplete() {
    const input = document.getElementById('series_input');
    const hiddenId = document.getElementById('series_id');
    const dropdown = document.getElementById('series-autocomplete-dropdown');
    if(!input || !dropdown){ console.warn('[SeriesAutocomplete][Add] missing elements'); return; }
    let lastQuery='';
    let pending=null; let results=[]; let activeIndex=-1;
    const csrf = (document.querySelector('meta[name="csrf-token"]')||{}).content || '';

    function clearDropdown(){ dropdown.innerHTML=''; dropdown.style.display='none'; results=[]; activeIndex=-1; }
    function escapeHtml(str){return (str||'').replace(/[&<>"']/g,s=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[s]));}
    function render(list, query){
        if(!list.length && !query){ clearDropdown(); return; }
        if(!list.length && query){
            dropdown.innerHTML = `<button type="button" class="list-group-item list-group-item-action" data-create="1">Create new series "${escapeHtml(query)}"</button>`;
            dropdown.style.display='block'; return;
        }
        dropdown.innerHTML = list.map((it,i)=>`
            <button type="button" class="list-group-item list-group-item-action${i===activeIndex?' active':''}" data-id="${it.id}" data-name="${escapeHtml(it.name)}">
              <div class='d-flex justify-content-between align-items-center'>
                <span>${escapeHtml(it.name)}</span>
                <small class='text-muted'>${it.book_count||0} book${(it.book_count||0)===1?'':'s'}</small>
              </div>
            </button>`).join('');
        if(query && !list.find(i=>i.name.toLowerCase()===query.toLowerCase())){
            dropdown.innerHTML += `<button type="button" class="list-group-item list-group-item-action" data-create="1">Create new series "${escapeHtml(query)}"</button>`;
        }
        dropdown.style.display='block';
    }
    function debouncedFetch(q){
        if(pending) clearTimeout(pending);
        if(!q){ clearDropdown(); hiddenId.value=''; return; }
        pending=setTimeout(()=>{
            fetch(`/series/search?q=${encodeURIComponent(q)}`,{headers:{'Accept':'application/json'}})
              .then(r=>r.ok?r.json():Promise.reject())
              .then(data=>{ console.debug('[SeriesSearch][Add]',data); if(!data) return; if(data.success){ results=data.results||[]; } else if(Array.isArray(data)){ results=data; } else { results=[]; } activeIndex=-1; render(results,q); })
              .catch(err=>{ console.warn('[SeriesSearch][Add] error',err); results=[]; render(results,q); });
        },200);
    }
    function selectResult(r){ hiddenId.value=r.id; input.value=r.name; clearDropdown(); }
    function createSeries(name){ if(!name) return; fetch('/series/create',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json','X-CSRFToken':csrf},body:JSON.stringify({name})})
        .then(r=>r.ok?r.json():Promise.reject())
        .then(data=>{ console.debug('[SeriesCreate][Add]',data); if(data.success && data.series){ hiddenId.value=data.series.id; input.value=data.series.name; clearDropdown(); } })
        .catch(err=>{ console.warn('[SeriesCreate][Add] error',err); }); }
    input.addEventListener('input', e=>{ hiddenId.value=''; lastQuery=e.target.value.trim(); if(lastQuery.length<2){ clearDropdown(); return; } debouncedFetch(lastQuery); });
    input.addEventListener('keydown', e=>{
        if(e.key==='ArrowDown'){ if(dropdown.style.display==='none') return; e.preventDefault(); const count=Math.max(results.length,1); activeIndex=(activeIndex+1)%count; render(results,lastQuery); }
        else if(e.key==='ArrowUp'){ if(dropdown.style.display==='none') return; e.preventDefault(); const count=Math.max(results.length,1); activeIndex=activeIndex<=0?count-1:activeIndex-1; render(results,lastQuery); }
        else if(e.key==='Enter'){ if(dropdown.style.display==='none') return; e.preventDefault(); if(activeIndex>=0 && results[activeIndex]) selectResult(results[activeIndex]); else if(!results.find(r=>r.name.toLowerCase()===lastQuery.toLowerCase())) createSeries(lastQuery); }
        else if(e.key==='Escape'){ clearDropdown(); }
    });
    dropdown.addEventListener('click', e=>{ const btn=e.target.closest('button'); if(!btn) return; if(btn.dataset.create==='1'){ createSeries(lastQuery); return; } const id=btn.dataset.id; const name=btn.dataset.name; if(id && name){ hiddenId.value=id; input.value=name; clearDropdown(); }});
    document.addEventListener('click', e=>{ if(!dropdown.contains(e.target) && e.target!==input) clearDropdown(); });
    console.debug('[SeriesAutocomplete][Add] Initialized');
}

// Initialize series autocomplete when DOM is ready
if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initializeSeriesAutocomplete);
} else {
    initializeSeriesAutocomplete();
}

// Handle duplicate book resolution
let currentDuplicateData = null;

// Resolve duplicate API endpoint (keeps JS aligned with Flask route)
const resolveDuplicateUrl = window.ADD_BOOK_CONFIG.resolveDuplicateUrl;

function showDuplicateModal(duplicateResponse) {
    currentDuplicateData = duplicateResponse;
    
    // Populate book info
    const bookInfo = document.getElementById('duplicateBookInfo');
    bookInfo.innerHTML = `
        <div class="card">
            <div class="card-body">
                <h6 class="card-title">${duplicateResponse.book_data.title}</h6>
                ${duplicateResponse.book_data.author ? `<p class="card-text mb-1"><small class="text-muted">by ${duplicateResponse.book_data.author}</small></p>` : ''}
                ${duplicateResponse.book_data.isbn13 ? `<p class="card-text mb-0"><small>ISBN-13: ${duplicateResponse.book_data.isbn13}</small></p>` : ''}
                ${duplicateResponse.book_data.isbn10 ? `<p class="card-text mb-0"><small>ISBN-10: ${duplicateResponse.book_data.isbn10}</small></p>` : ''}
            </div>
        </div>
    `;
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('duplicateBookModal'));
    modal.show();
}

// Handle increment count button
document.getElementById('incrementCountBtn').addEventListener('click', async function() {
    if (!currentDuplicateData) return;
    
    const btn = this;
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Updating...';
    
    try {
        const response = await fetch(resolveDuplicateUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': document.querySelector('[name="csrf_token"]').value
            },
            body: JSON.stringify({
                action: 'increment_count',
                book_id: currentDuplicateData.book_id,
                book_data: currentDuplicateData.book_data
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Close modal and redirect
            bootstrap.Modal.getInstance(document.getElementById('duplicateBookModal')).hide();
            window.location.href = result.redirect_url;
        } else {
            alert('Error: ' + result.message);
            btn.disabled = false;
            btn.innerHTML = originalHTML;
        }
    } catch (error) {
        console.error('Error incrementing count:', error);
        alert('An error occurred. Please try again.');
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    }
});

// Handle add as separate entry button
document.getElementById('addSeparateBtn').addEventListener('click', async function() {
    if (!currentDuplicateData) return;
    
    const btn = this;
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating...';
    
    try {
        const response = await fetch(resolveDuplicateUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': document.querySelector('[name="csrf_token"]').value
            },
            body: JSON.stringify({
                action: 'add_separate',
                book_id: currentDuplicateData.book_id,
                book_data: currentDuplicateData.book_data
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Close modal and redirect
            bootstrap.Modal.getInstance(document.getElementById('duplicateBookModal')).hide();
            window.location.href = result.redirect_url;
        } else {
            alert('Error: ' + result.message);
            btn.disabled = false;
            btn.innerHTML = originalHTML;
        }
    } catch (error) {
        console.error('Error adding separate entry:', error);
        alert('An error occurred. Please try again.');
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    }
});

// Handle navigate to existing button
document.getElementById('navigateExistingBtn').addEventListener('click', async function() {
    if (!currentDuplicateData) return;
    
    const btn = this;
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Navigating...';
    
    try {
        const response = await fetch(resolveDuplicateUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': document.querySelector('[name="csrf_token"]').value
            },
            body: JSON.stringify({
                action: 'navigate',
                book_id: currentDuplicateData.book_id,
                book_data: currentDuplicateData.book_data
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Close modal and redirect
            bootstrap.Modal.getInstance(document.getElementById('duplicateBookModal')).hide();
            window.location.href = result.redirect_url;
        } else {
            alert('Error: ' + result.message);
            btn.disabled = false;
            btn.innerHTML = originalHTML;
        }
    } catch (error) {
        console.error('Error navigating:', error);
        alert('An error occurred. Please try again.');
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    }
});

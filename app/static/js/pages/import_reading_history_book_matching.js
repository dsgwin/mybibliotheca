// Extracted from app/templates/import_reading_history_book_matching.html for browser caching.

document.addEventListener('DOMContentLoaded', function() {
    // Handle action radio button changes
    document.querySelectorAll('.action-radio').forEach(radio => {
        radio.addEventListener('change', function() {
            const index = this.name.split('_')[1];
            const matchSection = document.getElementById(`matchSection_${index}`);
            const createSection = document.getElementById(`createSection_${index}`);
            
            if (this.value === 'match') {
                matchSection.style.display = 'block';
                createSection.style.display = 'none';
            } else if (this.value === 'create') {
                matchSection.style.display = 'none';
                createSection.style.display = 'block';
            } else {
                matchSection.style.display = 'none';
                createSection.style.display = 'none';
            }
        });
    });
    
    // Book search functionality
    document.querySelectorAll('.book-search-input').forEach(input => {
        const index = input.dataset.index;
        const resultsDiv = document.getElementById(`searchResults_${index}`);
        const hiddenInput = document.getElementById(`bookId_${index}`);
        let debounceTimer;
        
        input.addEventListener('input', function() {
            clearTimeout(debounceTimer);
            const query = this.value.trim();
            
            if (query.length < 2) {
                resultsDiv.style.display = 'none';
                hiddenInput.value = '';
                return;
            }
            
            debounceTimer = setTimeout(() => {
                searchBooks(query, resultsDiv, hiddenInput, input);
            }, 300);
        });
        
        // Hide results when clicking outside
        document.addEventListener('click', function(e) {
            if (!input.contains(e.target) && !resultsDiv.contains(e.target)) {
                resultsDiv.style.display = 'none';
            }
        });
    });
    
    // Handle suggestion button clicks
    document.querySelectorAll('.suggestion-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = this.dataset.index;
            const bookId = this.dataset.bookId;
            const bookTitle = this.dataset.bookTitle;
            
            // Update the search input and hidden field
            const searchInput = document.querySelector(`#matchSection_${index} .book-search-input`);
            const hiddenInput = document.getElementById(`bookId_${index}`);
            
            searchInput.value = bookTitle;
            hiddenInput.value = bookId;
            
            // Add visual confirmation
            searchInput.classList.add('border-success');
            setTimeout(() => {
                searchInput.classList.remove('border-success');
            }, 1000);
            
            // Make sure the match action is selected
            document.getElementById(`match_${index}`).checked = true;
            
            // Hide any open search results
            const resultsDiv = document.getElementById(`searchResults_${index}`);
            if (resultsDiv) {
                resultsDiv.style.display = 'none';
            }
        });
    });
    
    // API search functionality for creating new books
    document.querySelectorAll('.api-search-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = this.dataset.index;
            const titleInput = document.getElementById(`newTitle_${index}`);
            const resultsDiv = document.getElementById(`apiResults_${index}`);
            
            const searchQuery = titleInput.value.trim();
            if (!searchQuery) {
                alert('Please enter a book title to search for.');
                return;
            }
            
            // Show loading state
            this.disabled = true;
            this.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Searching...';
            
            // Clear previous results
            resultsDiv.innerHTML = '';
            resultsDiv.style.display = 'none';
            
            // Search external APIs
            searchExternalAPIs(searchQuery, index)
                .finally(() => {
                    // Reset button state
                    this.disabled = false;
                    this.innerHTML = '<i class="bi bi-cloud-download me-1"></i>Search Online Databases';
                });
        });
    });
    
    // Form validation
    document.getElementById('bookMatchingForm').addEventListener('submit', function(e) {
        const items = document.querySelectorAll('.book-match-item');
        let hasValidSelections = false;
        
        for (let item of items) {
            const index = item.dataset.index;
            const selectedAction = document.querySelector(`input[name="action_${index}"]:checked`).value;
            
            if (selectedAction === 'match') {
                const bookId = document.getElementById(`bookId_${index}`).value;
                if (!bookId) {
                    alert(`Please select a book for "${document.querySelector(`#matchSection_${index} input[type="text"]`).value}" or choose a different action.`);
                    e.preventDefault();
                    return;
                }
                hasValidSelections = true;
            } else if (selectedAction === 'create') {
                const title = document.querySelector(`input[name="new_title_${index}"]`).value.trim();
                if (!title) {
                    alert('Please enter a title for the new book.');
                    e.preventDefault();
                    return;
                }
                hasValidSelections = true;
            }
        }
        
        if (!hasValidSelections) {
            alert('Please select at least one book to process.');
            e.preventDefault();
        }
    });
});

function searchBooks(query, resultsDiv, hiddenInput, searchInput) {
    fetch(`/api/v1/books/user-search?q=${encodeURIComponent(query)}&limit=5`)
        .then(response => response.json())
        .then(data => {
            resultsDiv.innerHTML = '';
            
            if (data.books && data.books.length > 0) {
                data.books.forEach(book => {
                    const resultItem = document.createElement('div');
                    resultItem.className = 'p-2 border-bottom bg-white cursor-pointer search-result-item';
                    resultItem.style.cursor = 'pointer';
                    
                    resultItem.innerHTML = `
                        <div class="d-flex align-items-center">
                            <div class="flex-grow-1">
                                <div class="fw-medium">${escapeHtml(book.title)}</div>
                                <div class="small text-muted">${escapeHtml(book.authors_text || 'Unknown Author')}</div>
                            </div>
                            <div class="text-muted small">
                                <i class="bi bi-book"></i>
                            </div>
                        </div>
                    `;
                    
                    resultItem.addEventListener('click', function() {
                        hiddenInput.value = book.uid || book.id;
                        searchInput.value = book.title;
                        resultsDiv.style.display = 'none';
                        
                        // Add visual confirmation
                        searchInput.classList.add('border-success');
                        setTimeout(() => {
                            searchInput.classList.remove('border-success');
                        }, 1000);
                    });
                    
                    resultsDiv.appendChild(resultItem);
                });
                
                resultsDiv.style.display = 'block';
            } else {
                resultsDiv.innerHTML = '<div class="p-2 text-muted bg-white"><i class="bi bi-search"></i> No books found</div>';
                resultsDiv.style.display = 'block';
                hiddenInput.value = '';
            }
        })
        .catch(error => {
            console.error('Search error:', error);
            resultsDiv.style.display = 'none';
        });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function searchExternalAPIs(query, index) {
    const resultsDiv = document.getElementById(`apiResults_${index}`);
    
    try {
        const response = await fetch('/import/api/books/search-details', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': document.querySelector('input[name="csrf_token"]').value
            },
            body: JSON.stringify({ query: query })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.results && data.results.length > 0) {
            displayAPIResults(data.results, index);
        } else {
            // Check if there was a specific search error
            let message = 'No results found in external databases. You can still create the book manually.';
            let alertClass = 'alert-info';
            
            if (data.message) {
                message = `Search issue: ${data.message}. You can still create the book manually.`;
                alertClass = 'alert-warning';
            }
            
            resultsDiv.innerHTML = `
                <div class="alert ${alertClass}">
                    <i class="bi bi-info-circle me-2"></i>
                    ${escapeHtml(message)}
                </div>
            `;
            resultsDiv.style.display = 'block';
        }
    } catch (error) {
        console.error('API search error:', error);
        resultsDiv.innerHTML = `
            <div class="alert alert-warning">
                <i class="bi bi-exclamation-triangle me-2"></i>
                Error searching external databases: ${escapeHtml(error.message)}
                <br>You can still create the book manually.
            </div>
        `;
        resultsDiv.style.display = 'block';
    }
}

function displayAPIResults(results, index) {
    const resultsDiv = document.getElementById(`apiResults_${index}`);
    
    // Check if we have ISBN-priority results
    const hasISBNResults = results.some(result => result.isbn13 || result.isbn10);
    
    let html = `
        <div class="border rounded p-3 bg-light">
            <h6 class="mb-3">
                <i class="bi bi-cloud-download me-2"></i>
                Found ${results.length} result${results.length === 1 ? '' : 's'} from online databases
                ${hasISBNResults ? '<span class="badge bg-success ms-2">ISBN Books Available</span>' : ''}
            </h6>
            ${hasISBNResults ? `
                <div class="alert alert-info mb-3">
                    <i class="bi bi-info-circle me-2"></i>
                    <strong>📚 Recommended:</strong> Books with ISBNs provide complete metadata and cover images.
                </div>
            ` : ''}
            <div class="row">
    `;
    
    // Sort results to show ISBN results first
    const sortedResults = results.sort((a, b) => {
        const aHasISBN = !!(a.isbn13 || a.isbn10);
        const bHasISBN = !!(b.isbn13 || b.isbn10);
        if (aHasISBN && !bHasISBN) return -1;
        if (!aHasISBN && bHasISBN) return 1;
        return 0;
    });
    
    sortedResults.slice(0, 10).forEach((result, i) => {
        const hasISBN = !!(result.isbn13 || result.isbn10);
        html += `
            <div class="col-md-6 mb-3">
                <div class="card h-100 ${hasISBN ? 'border-success' : ''}">
                    ${hasISBN ? '<div class="card-header bg-success-subtle text-success-emphasis"><i class="bi bi-award me-1"></i>ISBN Available</div>' : ''}
                    <div class="card-body p-3">
                        <h6 class="card-title">${escapeHtml(result.title)}</h6>
                        <p class="card-text small text-muted mb-2">
                            ${result.author ? `by ${escapeHtml(result.author)}` : 'Unknown Author'}
                        </p>
                        ${result.description ? `
                            <p class="card-text small mb-2" style="max-height: 60px; overflow: hidden;">
                                ${escapeHtml(result.description.substring(0, 100))}${result.description.length > 100 ? '...' : ''}
                            </p>
                        ` : ''}
                        ${result.cover_url ? `
                            <img src="${escapeHtml(result.cover_url)}" alt="Cover" 
                                 class="img-thumbnail mb-2" style="max-width: 80px; max-height: 120px;">
                        ` : ''}
                        <div class="small text-muted mb-2">
                            ${result.published_date ? `Published: ${escapeHtml(result.published_date)}<br>` : ''}
                            ${result.page_count ? `Pages: ${result.page_count}<br>` : ''}
                            ${result.isbn13 ? `ISBN-13: ${escapeHtml(result.isbn13)}<br>` : ''}
                            ${result.isbn10 ? `ISBN-10: ${escapeHtml(result.isbn10)}<br>` : ''}
                            ${result.source ? `Source: ${escapeHtml(result.source)}` : ''}
                        </div>
                        <button type="button" class="btn ${hasISBN ? 'btn-success' : 'btn-primary'} btn-sm use-api-result-btn" 
                                data-index="${index}" data-result='${JSON.stringify(result)}' data-has-isbn="${hasISBN}">
                            <i class="bi bi-check-circle me-1"></i>
                            ${hasISBN ? 'Create with Full Metadata' : 'Use This Book'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += `
            </div>
            <div class="mt-3 p-3 bg-warning-subtle border rounded">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-1"><i class="bi bi-x-circle me-2"></i>Don't see the right book?</h6>
                        <p class="mb-0 small text-muted">Create a basic book entry with just the title and author.</p>
                    </div>
                    <button type="button" class="btn btn-outline-secondary btn-sm do-not-match-btn" 
                            data-index="${index}">
                        <i class="bi bi-x-circle me-1"></i>Do Not Match
                    </button>
                </div>
            </div>
            <div class="text-muted small mt-2">
                <i class="bi bi-info-circle me-1"></i>
                Select a book to auto-fill details, or choose "Do Not Match" to create a basic entry.
            </div>
        </div>
    `;
    
    resultsDiv.innerHTML = html;
    resultsDiv.style.display = 'block';
    
    // Add event listeners to the "Use This Book" buttons
    resultsDiv.querySelectorAll('.use-api-result-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = this.dataset.index;
            const result = JSON.parse(this.dataset.result);
            const hasISBN = this.dataset.hasIsbn === 'true';
            
            console.log('🔧 [TEMPLATE] Use This Book clicked:', {
                index: index,
                title: result.title,
                hasISBN: hasISBN,
                isbn13: result.isbn13,
                isbn10: result.isbn10
            });
            
            // Fill in the form fields
            const titleInput = document.getElementById(`newTitle_${index}`);
            const authorInput = document.getElementById(`newAuthor_${index}`);
            const metadataInput = document.getElementById(`apiMetadata_${index}`);
            
            if (titleInput) titleInput.value = result.title || '';
            if (authorInput) authorInput.value = result.author || '';
            
            // Store the complete API metadata in the hidden field
            // Mark if this should use ISBN lookup vs manual creation
            const enrichedResult = {
                ...result,
                _use_isbn_lookup: hasISBN, // Flag for backend processing
                _selected_isbn: result.isbn13 || result.isbn10 || null
            };
            if (metadataInput) metadataInput.value = JSON.stringify(enrichedResult);
            
            // Auto-select the "create" action
            const createRadio = document.getElementById(`create_${index}`);
            if (createRadio) {
                createRadio.checked = true;
                createRadio.dispatchEvent(new Event('change'));
            }
            
            // Visual feedback
            if (titleInput) {
                titleInput.classList.add('border-success');
                setTimeout(() => titleInput.classList.remove('border-success'), 2000);
            }
            if (authorInput) {
                authorInput.classList.add('border-success');
                setTimeout(() => authorInput.classList.remove('border-success'), 2000);
            }
            
            // Hide the API results
            resultsDiv.style.display = 'none';
            
            // Show success message
            const createSection = document.getElementById(`createSection_${index}`);
            const successDiv = document.createElement('div');
            successDiv.className = 'alert alert-success mt-2';
            successDiv.innerHTML = `
                <i class="bi bi-check-circle me-2"></i>
                ${hasISBN ? 
                    `Book will be created with full metadata from ${result.source || 'online database'} using ISBN ${result.isbn13 || result.isbn10}!` :
                    `Book details imported from ${result.source || 'online database'}! Additional metadata will be saved with the book.`
                }
            `;
            createSection.appendChild(successDiv);
            
            setTimeout(() => {
                successDiv.remove();
            }, 4000);
        });
    });
    
    // Add event listener to the "Do Not Match" button
    resultsDiv.querySelector('.do-not-match-btn')?.addEventListener('click', function() {
        const index = this.dataset.index;
        
        console.log('🚫 [TEMPLATE] Do Not Match clicked for index:', index);
        
        // Clear any API metadata
        const metadataInput = document.getElementById(`apiMetadata_${index}`);
        if (metadataInput) {
            metadataInput.value = JSON.stringify({
                _use_isbn_lookup: false,
                _manual_creation: true
            });
        }
        
        // Auto-select the "create" action
        const createRadio = document.getElementById(`create_${index}`);
        if (createRadio) {
            createRadio.checked = true;
            createRadio.dispatchEvent(new Event('change'));
        }
        
        // Hide the API results
        resultsDiv.style.display = 'none';
        
        // Show info message
        const createSection = document.getElementById(`createSection_${index}`);
        const infoDiv = document.createElement('div');
        infoDiv.className = 'alert alert-info mt-2';
        infoDiv.innerHTML = `
            <i class="bi bi-info-circle me-2"></i>
            Book will be created manually with the title and author you specify. You can edit it later to add more details.
        `;
        createSection.appendChild(infoDiv);
        
        setTimeout(() => {
            infoDiv.remove();
        }, 4000);
    });
}

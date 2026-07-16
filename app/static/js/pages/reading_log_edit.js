// Extracted from app/templates/reading_logs/edit_log.html for browser caching.

let userBooks = []; // Will store user's books for selection
let allUserBooks = []; // Store complete list for searching
let originalBookState = {}; // Store original state for cancel functionality
let selectedBookData = null; // Currently selected book

document.addEventListener('DOMContentLoaded', function() {
    // Store original book state
    storeOriginalBookState();
    
    // Load user's books for the search
    loadUserBooks();
    
    // Form validation
    const form = document.querySelector('form');
    const pagesInput = document.getElementById('pages_read');
    const minutesInput = document.getElementById('minutes_read');
    
    form.addEventListener('submit', function(e) {
        const pages = parseInt(pagesInput.value) || 0;
        const minutes = parseInt(minutesInput.value) || 0;
        
        if (pages <= 0 && minutes <= 0) {
            e.preventDefault();
            alert('Please enter either pages read or minutes read (or both).');
            return false;
        }
    });
});

function storeOriginalBookState() {
    const bookIdInput = document.getElementById('current_book_id');
    const bookTitleInput = document.getElementById('current_book_title');
    
    originalBookState = {
        book_id: bookIdInput ? bookIdInput.value : '',
        book_title: bookTitleInput ? bookTitleInput.value : '',
        display_text: document.querySelector('#current-book-display .form-control-plaintext strong')?.textContent || ''
    };
}

async function loadUserBooks() {
    try {
        document.getElementById('loading_books').style.display = 'block';
        
        const response = await fetch('/reading-logs/api/user/books?limit=20');
        if (response.ok) {
            const payload = await response.json();
            userBooks = Array.isArray(payload) ? payload : (payload && Array.isArray(payload.books) ? payload.books : []);
            
            // Load more books for search if needed
            const allBooksResponse = await fetch('/reading-logs/api/user/books?limit=100');
            if (allBooksResponse.ok) {
                const allPayload = await allBooksResponse.json();
                allUserBooks = Array.isArray(allPayload) ? allPayload : (allPayload && Array.isArray(allPayload.books) ? allPayload.books : []);
            } else {
                allUserBooks = userBooks; // Fallback to limited list
            }
            
            document.getElementById('loading_books').style.display = 'none';
            
            if (userBooks.length === 0 && allUserBooks.length === 0) {
                document.getElementById('no_books').style.display = 'block';
            } else {
                displayBooks(userBooks); // Show recent books initially
            }
        } else {
            throw new Error('Failed to load books');
        }
    } catch (error) {
        console.error('Error loading user books:', error);
        document.getElementById('loading_books').style.display = 'none';
        document.getElementById('no_books').style.display = 'block';
    }
}

function displayBooks(books) {
    const bookList = document.getElementById('book_list');
    bookList.innerHTML = '';
    
    if (books.length === 0) {
        document.getElementById('search_empty').style.display = 'block';
        return;
    }
    
    document.getElementById('search_empty').style.display = 'none';
    
    books.forEach(book => {
        const bookItem = document.createElement('div');
        bookItem.className = 'book-item p-2 border-bottom cursor-pointer hover-bg-light';
        bookItem.style.cursor = 'pointer';
        bookItem.onclick = () => selectBook(book);
        
        bookItem.innerHTML = `
            <div class="d-flex align-items-center">
                <div class="flex-grow-1">
                    <div class="fw-semibold">${escapeHtml(book.title)}</div>
                    ${book.author ? `<small class="text-muted">by ${escapeHtml(book.author)}</small>` : ''}
                </div>
                <i class="bi bi-check-circle text-success" style="display: none;"></i>
            </div>
        `;
        
        // Add hover effects
        bookItem.addEventListener('mouseenter', function() {
            this.style.backgroundColor = '#f8f9fa';
        });
        bookItem.addEventListener('mouseleave', function() {
            this.style.backgroundColor = '';
        });
        
        bookList.appendChild(bookItem);
    });
}

function searchBooks(query) {
    if (!query.trim()) {
        // Show recent books when search is empty
        displayBooks(userBooks);
        return;
    }
    
    const searchTerm = query.toLowerCase();
    const filteredBooks = allUserBooks.filter(book => {
        const titleMatch = book.title && book.title.toLowerCase().includes(searchTerm);
        const authorMatch = book.author && book.author.toLowerCase().includes(searchTerm);
        return titleMatch || authorMatch;
    });
    
    displayBooks(filteredBooks);
}

function selectBook(book) {
    selectedBookData = book;
    
    // Update hidden input
    document.getElementById('selected_book_id').value = book.id;
    
    // Show selected book display
    document.getElementById('selected_book_title').textContent = book.title;
    document.getElementById('selected_book_author').textContent = book.author ? `by ${book.author}` : '';
    document.getElementById('selected_book_display').style.display = 'block';
    
    // Hide search results
    document.getElementById('book_results').style.display = 'none';
    
    // Clear search input
    document.getElementById('book_search').value = '';
}

function clearBookSelection() {
    selectedBookData = null;
    document.getElementById('selected_book_id').value = '';
    document.getElementById('selected_book_display').style.display = 'none';
    document.getElementById('book_results').style.display = 'block';
    
    // Show recent books again
    displayBooks(userBooks);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showBookSelector() {
    document.getElementById('current-book-display').style.display = 'none';
    document.getElementById('book-selector').style.display = 'block';
    
    // Set the radio button based on current state
    const hasBook = document.getElementById('current_book_id')?.value;
    if (hasBook) {
        document.getElementById('mode_book').checked = true;
        document.getElementById('book-selection-area').style.display = 'block';
        document.getElementById('bookless-area').style.display = 'none';
    } else {
        document.getElementById('mode_bookless').checked = true;
        document.getElementById('book-selection-area').style.display = 'none';
        document.getElementById('bookless-area').style.display = 'block';
    }
}

function cancelBookChange() {
    // Restore original state
    const bookIdInput = document.getElementById('current_book_id');
    const bookTitleInput = document.getElementById('current_book_title');
    
    if (bookIdInput) bookIdInput.value = originalBookState.book_id;
    if (bookTitleInput) bookTitleInput.value = originalBookState.book_title;
    
    // Hide selector and show original display
    document.getElementById('book-selector').style.display = 'none';
    document.getElementById('current-book-display').style.display = 'block';
}

function toggleBookMode() {
    const bookMode = document.querySelector('input[name="book_mode"]:checked').value;
    
    if (bookMode === 'book') {
        document.getElementById('book-selection-area').style.display = 'block';
        document.getElementById('bookless-area').style.display = 'none';
    } else {
        document.getElementById('book-selection-area').style.display = 'none';
        document.getElementById('bookless-area').style.display = 'block';
    }
}

function applyBookChange() {
    const bookMode = document.querySelector('input[name="book_mode"]:checked').value;
    
    if (bookMode === 'book') {
        // Get selected book
        const dropdown = document.getElementById('book_selector_dropdown');
        const selectedBookId = dropdown.value;
        
        if (!selectedBookId) {
            alert('Please select a book from the dropdown.');
            return;
        }
        
        // Find the selected book details
        const selectedBook = userBooks.find(book => book.id === selectedBookId);
        if (!selectedBook) {
            alert('Selected book not found.');
            return;
        }
        
        // Update hidden inputs
        document.getElementById('current_book_id').value = selectedBookId;
        const bookTitleInput = document.getElementById('current_book_title');
        if (bookTitleInput) {
            bookTitleInput.value = '';
        }
        
        // Update display
        updateBookDisplay(selectedBook.title, selectedBook.author, true);
        
    } else {
        // Bookless mode
        const customTitle = document.getElementById('custom_book_title').value.trim();
        
        if (!customTitle) {
            alert('Please enter a description for your reading session.');
            return;
        }
        
        // Update hidden inputs
        document.getElementById('current_book_id').value = '';
        let bookTitleInput = document.getElementById('current_book_title');
        if (!bookTitleInput) {
            // Create the input if it doesn't exist
            bookTitleInput = document.createElement('input');
            bookTitleInput.type = 'hidden';
            bookTitleInput.id = 'current_book_title';
            bookTitleInput.name = 'book_title';
            document.querySelector('form').appendChild(bookTitleInput);
        }
        bookTitleInput.value = customTitle;
        
        // Update display
        updateBookDisplay(customTitle, null, false);
    }
    
    // Hide selector and show updated display
    document.getElementById('book-selector').style.display = 'none';
    document.getElementById('current-book-display').style.display = 'block';
    
    // Update original state to new state
    storeOriginalBookState();
}

function updateBookDisplay(title, author, isBook) {
    const displayDiv = document.querySelector('#current-book-display .form-control-plaintext div:first-child');
    
    if (isBook) {
        displayDiv.innerHTML = `
            <strong>${title}</strong>
            ${author ? `<br><small class="text-muted">by ${author}</small>` : ''}
        `;
    } else {
        displayDiv.innerHTML = `
            <strong>${title}</strong>
            <br><small class="text-muted">No specific book</small>
        `;
    }
}

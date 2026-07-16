// Extracted from stats/library_journey.html for browser caching.
// window.LIBRARY_JOURNEY_CONFIG is set by a small inline script before this loads.

document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Restore filter values from URL parameters or server-provided filters
    const urlParams = new URLSearchParams(window.location.search);
    const dateTypeFromUrl = urlParams.get('date_type');
    const dateTypeFromServer = window.LIBRARY_JOURNEY_CONFIG.defaultDateType;
    document.getElementById('dateTypeFilter').value = dateTypeFromUrl || dateTypeFromServer;
    if (urlParams.get('status')) {
        document.getElementById('statusFilter').value = urlParams.get('status');
    }
    if (urlParams.get('year_from')) {
        document.getElementById('yearFrom').value = urlParams.get('year_from');
    }
    if (urlParams.get('year_to')) {
        document.getElementById('yearTo').value = urlParams.get('year_to');
    }
    
    // Auto-apply when date type filter changes
    const dateTypeEl = document.getElementById('dateTypeFilter');
    if (dateTypeEl) {
        dateTypeEl.addEventListener('change', function() {
            applyFilters();
        });
    }
    
    // Handle individual book clicks
    document.querySelectorAll('.timeline-book').forEach(function(bookEl) {
        bookEl.addEventListener('click', function() {
            showBookModal(this);
        });
    });
    
    // Handle cluster clicks
    document.querySelectorAll('.timeline-cluster').forEach(function(clusterEl) {
        clusterEl.addEventListener('click', function() {
            try {
                const bookCount = parseInt(this.getAttribute('data-cluster-count'));
                const year = this.getAttribute('data-cluster-year');
                
                // Extract book data from individual attributes
                const books = [];
                for (let i = 0; i < bookCount; i++) {
                    const book = {
                        id: this.getAttribute(`data-book-${i}-id`),
                        uid: this.getAttribute(`data-book-${i}-uid`),
                        title: this.getAttribute(`data-book-${i}-title`),
                        authors_text: this.getAttribute(`data-book-${i}-authors`),
                        reading_status: this.getAttribute(`data-book-${i}-status`),
                        status_color: this.getAttribute(`data-book-${i}-status-color`),
                        cover_url: this.getAttribute(`data-book-${i}-cover`),
                        user_rating: this.getAttribute(`data-book-${i}-rating`),
                        page_count: this.getAttribute(`data-book-${i}-pages`),
                        categories_text: this.getAttribute(`data-book-${i}-categories`),
                        personal_notes: this.getAttribute(`data-book-${i}-notes`),
                        date_added: this.getAttribute(`data-book-${i}-date`),
                        display_title: this.getAttribute(`data-book-${i}-display-title`)
                    };
                    books.push(book);
                }
                
                console.log('Cluster books data:', books); // Debug log
                showClusterModal(books, year);
                
            } catch (error) {
                console.error('Error parsing cluster data:', error);
                alert('Failed to load cluster books: ' + error.message);
            }
        });
    });
});

function showBookModal(bookEl) {
    try {
        // Get book data from individual attributes
        const book = {
            id: bookEl.getAttribute('data-book-id'),
            uid: bookEl.getAttribute('data-book-uid'),
            title: bookEl.getAttribute('data-book-title'),
            authors_text: bookEl.getAttribute('data-book-authors'),
            reading_status: bookEl.getAttribute('data-book-status'),
            status_color: bookEl.getAttribute('data-book-status-color'),
            cover_url: bookEl.getAttribute('data-book-cover'),
            user_rating: bookEl.getAttribute('data-book-rating'),
            page_count: bookEl.getAttribute('data-book-pages'),
            categories_text: bookEl.getAttribute('data-book-categories'),
            personal_notes: bookEl.getAttribute('data-book-notes'),
            date_added: bookEl.getAttribute('data-book-date')
        };
        
        console.log('Book data from attributes:', book); // Debug log
        
        // Check if modal exists
        const modalElement = document.getElementById('bookDetailsModal');
        const modalContent = document.getElementById('bookDetailsContent');
        
        if (!modalElement || !modalContent) {
            throw new Error('Modal elements not found');
        }
        
        // Populate modal with book details
        modalContent.innerHTML = generateBookModalContent(book);
        
        // Show modal
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
        
    } catch (error) {
        console.error('Error displaying book details:', error);
        alert('Failed to display book details: ' + error.message);
    }
}

function showClusterModal(books, year) {
    try {
        const modalElement = document.getElementById('bookDetailsModal');
        const modalContent = document.getElementById('bookDetailsContent');
        const modalTitle = document.getElementById('bookDetailsModalLabel');
        
        if (!modalElement || !modalContent || !modalTitle) {
            throw new Error('Modal elements not found');
        }
        
        // Update modal title
        modalTitle.textContent = `${books.length} Books from ${year}`;
        
        // Create cluster view
        let clusterHTML = `
            <div class="cluster-books-container">
                <div class="row g-3">
        `;
        
        books.forEach(function(book) {
            clusterHTML += `
                <div class="col-md-4 col-sm-6">
                    <div class="cluster-book-item card h-100" onclick="showIndividualBookFromCluster(this)" 
                         data-book-id="${book.id || ''}"
                         data-book-uid="${book.uid || ''}"
                         data-book-title="${book.title || ''}"
                         data-book-authors="${book.authors_text || ''}"
                         data-book-status="${book.reading_status || ''}"
                         data-book-status-color="${book.status_color || ''}"
                         data-book-cover="${book.cover_url || ''}"
                         data-book-rating="${book.user_rating || ''}"
                         data-book-pages="${book.page_count || ''}"
                         data-book-categories="${book.categories_text || ''}"
                         data-book-notes="${book.personal_notes || ''}"
                         data-book-date="${book.date_added || ''}">
                        <div class="card-body p-2 text-center">
                            ${book.cover_url ? 
                                `<img src="${book.cover_url}" alt="${book.title}" class="img-fluid mb-2" style="max-height: 80px; max-width: 60px; object-fit: cover; border-radius: 4px; border: 2px solid ${book.status_color};">` :
                                `<div class="bg-secondary text-white rounded mb-2 mx-auto d-flex align-items-center justify-content-center" style="height: 80px; width: 60px; font-size: 0.7rem; text-align: center;">${book.display_title || book.title.substring(0, 10)}</div>`
                            }
                            <h6 class="card-title small mb-1">${book.title}</h6>
                            <p class="card-text small text-muted mb-1">${book.authors_text}</p>
                            <span class="badge" style="background-color: ${book.status_color}; font-size: 0.7rem;">
                                ${formatStatus(book.reading_status)}
                            </span>
                        </div>
                    </div>
                </div>
            `;
        });
        
        clusterHTML += `
                </div>
                <div class="text-center mt-3">
                    <button class="btn btn-secondary" onclick="closeClusterModal()">Close</button>
                </div>
            </div>
        `;
        
        modalContent.innerHTML = clusterHTML;
        
        // Show modal
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
        
    } catch (error) {
        console.error('Error displaying cluster:', error);
        alert('Failed to display cluster: ' + error.message);
    }
}

function showIndividualBookFromCluster(bookEl) {
    // Close cluster modal and show individual book modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('bookDetailsModal'));
    if (modal) {
        modal.hide();
    }
    
    // Wait for modal to close then show book details
    setTimeout(function() {
        showBookModal(bookEl);
    }, 300);
}

function closeClusterModal() {
    const modal = bootstrap.Modal.getInstance(document.getElementById('bookDetailsModal'));
    if (modal) {
        modal.hide();
    }
}

function generateBookModalContent(book) {
    return `
        <div class="row">
            <div class="col-md-4">
                ${book.cover_url ? 
                    `<img src="${book.cover_url}" alt="${book.title || 'Book cover'}" class="img-fluid rounded shadow">` :
                    `<div class="bg-secondary text-white rounded d-flex align-items-center justify-content-center" style="height: 200px;">
                        <i class="bi bi-book" style="font-size: 3rem;"></i>
                    </div>`
                }
            </div>
            <div class="col-md-8">
                <h4>${book.title || 'Unknown Title'}</h4>
                <p class="text-muted">by ${book.authors_text || 'Unknown Author'}</p>
                
                <div class="row">
                    <div class="col-sm-6">
                        <strong>Status:</strong> 
                        <span class="badge" style="background-color: ${book.status_color || '#6c757d'};">
                            ${formatStatus(book.reading_status)}
                        </span>
                    </div>
                    <div class="col-sm-6">
                        <strong>Added:</strong> ${formatDate(book.date_added)}
                    </div>
                    ${book.user_rating ? `
                    <div class="col-sm-6">
                        <strong>Rating:</strong> ${'★'.repeat(parseInt(book.user_rating))}${'☆'.repeat(5-parseInt(book.user_rating))}
                    </div>
                    ` : ''}
                    ${book.page_count ? `
                    <div class="col-sm-6">
                        <strong>Pages:</strong> ${book.page_count}
                    </div>
                    ` : ''}
                    ${book.categories_text ? `
                    <div class="col-sm-12 mt-2">
                        <strong>Categories:</strong> ${book.categories_text}
                    </div>
                    ` : ''}
                </div>
                
                ${book.personal_notes ? `
                <div class="mt-3">
                    <strong>Notes:</strong>
                    <p class="text-muted">${book.personal_notes}</p>
                </div>
                ` : ''}
                
                <div class="mt-3">
                    <a href="/view_book_enhanced/${book.uid}" class="btn btn-primary btn-sm">View Details</a>
                    <a href="/view_book_enhanced/${book.uid}" class="btn btn-outline-secondary btn-sm">Edit</a>
                </div>
            </div>
        </div>
    `;
}

function applyFilters() {
    const dateType = document.getElementById('dateTypeFilter').value;
    const status = document.getElementById('statusFilter').value;
    const yearFrom = document.getElementById('yearFrom').value;
    const yearTo = document.getElementById('yearTo').value;
    
    // Build query parameters
    const params = new URLSearchParams();
    if (dateType) params.append('date_type', dateType);
    if (status) params.append('status', status);
    if (yearFrom) params.append('year_from', yearFrom);
    if (yearTo) params.append('year_to', yearTo);
    
    // Reload page with filters
    window.location.href = window.LIBRARY_JOURNEY_CONFIG.libraryJourneyUrl + '?' + params.toString();
}

function getStatusColor(status) {
    const colors = {
        'read': '#28a745',
        'reading': '#17a2b8', 
        'plan_to_read': '#ffc107',
        'on_hold': '#fd7e14',
        'did_not_finish': '#dc3545'
    };
    return colors[status] || '#6c757d';
}

function formatStatus(status) {
    const labels = {
        'read': 'Read',
        'reading': 'Reading',
        'plan_to_read': 'Plan to Read',
        'on_hold': 'On Hold',
        'did_not_finish': 'Did Not Finish'
    };
    return labels[status] || 'Unknown';
}

function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    try {
        return new Date(dateString).toLocaleDateString();
    } catch {
        return dateString;
    }
}

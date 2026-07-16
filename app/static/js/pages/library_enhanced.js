// Extracted from library_enhanced.html for browser caching.
// window.LIBRARY_CONFIG is set by a small inline script before this loads.

document.addEventListener('DOMContentLoaded', function() {
    // Initialize with the current filter from the URL, falling back to the hidden input default
    const urlParams = new URLSearchParams(window.location.search);
    const fallbackInput = document.getElementById('status_filter');
    const fallbackFilter = fallbackInput ? (fallbackInput.value || 'all') : 'all';
    const currentFilter = urlParams.get('status_filter') || fallbackFilter;
    
    // Set active filter button
    updateActiveFilter(currentFilter);
    
    // Apply initial filter
    applyStatusFilter(currentFilter);

    // Filter button handlers -> submit form to server so filtering spans all pages
    document.querySelectorAll('.filter-btn').forEach(button => {
        button.addEventListener('click', function() {
            const filter = this.dataset.filter;
            const statusInput = document.getElementById('status_filter');
            if (statusInput) {
                // Toggle to 'all' when clicking the same active filter
                const current = statusInput.value || 'all';
                statusInput.value = (current === filter) ? 'all' : filter;
            }
            <!-- Prefetch JS deferred to a separate static file in future to avoid template lint issues -->

            const form = document.getElementById('filter-form');
            if (form) form.submit();
        });
    });

    // Selection functionality
    const checkboxes = document.querySelectorAll('.book-checkbox');
    const selectionToolbar = document.getElementById('selection-toolbar');
    const selectionCount = document.getElementById('selection-count');
    const bulkDeleteForm = document.getElementById('bulk-delete-form');
    const bulkStatusForm = document.getElementById('bulk-status-form');
    const bulkLocationForm = document.getElementById('bulk-location-form');
    const bulkCategoryForm = document.getElementById('bulk-category-form');
    const bulkStatusMenu = document.getElementById('bulk-status-menu');
    const bulkLocationMenu = document.getElementById('bulk-location-menu');
    const bulkCategoryButton = document.getElementById('bulk-category-button');
    const bulkCategoryModalElement = document.getElementById('bulkCategoryModal');

    const currentPageUrl = window.location.href;
    [bulkDeleteForm, bulkStatusForm, bulkLocationForm, bulkCategoryForm].forEach(form => {
        if (form) {
            updateHiddenInput(form, 'redirect_url', currentPageUrl);
        }
    });

    function getSelectedCheckboxes() {
        return Array.from(document.querySelectorAll('.book-checkbox:checked'));
    }

    function populateBulkForm(form, containerId) {
        if (!form) return [];
        const container = document.getElementById(containerId);
        if (!container) return [];
        container.innerHTML = '';
        updateHiddenInput(form, 'redirect_url', window.location.href);
        const selectedCheckboxes = getSelectedCheckboxes();
        selectedCheckboxes.forEach(checkbox => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'book_ids';
            input.value = checkbox.value;
            container.appendChild(input);
        });
        return selectedCheckboxes.map(cb => cb.value);
    }

    function updateHiddenInput(form, name, value) {
        if (!form) return;
        const input = form.querySelector(`input[name="${name}"]`);
        if (input) {
            input.value = value;
        }
    }

    function handleBulkActionResponse(data) {
        if (data && typeof data.redirect_url === 'string' && data.redirect_url.trim()) {
            window.location.href = data.redirect_url;
        } else {
            window.location.reload();
        }
    }

    function submitBulkAction(form, { onSuccess, onError } = {}) {
        if (!form) {
            return;
        }

        const formData = new FormData(form);
        fetch(form.action, {
            method: form.method || 'POST',
            body: formData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            }
        })
            .then(response => {
                if (!response.ok) {
                    const error = new Error(`Request failed with status ${response.status}`);
                    error.status = response.status;
                    throw error;
                }
                return response.json().catch(() => ({}));
            })
            .then(data => {
                if (data && Object.prototype.hasOwnProperty.call(data, 'success') && data.success === false) {
                    const error = new Error(data.message || 'Bulk action failed.');
                    error.data = data;
                    throw error;
                }
                if (typeof onSuccess === 'function') {
                    onSuccess(data || {});
                } else {
                    handleBulkActionResponse(data || {});
                }
            })
            .catch(error => {
                console.error('Bulk action error:', error);
                if (typeof onError === 'function') {
                    onError(error);
                } else {
                    alert(error.message || 'Bulk action failed. Please try again.');
                    form.submit();
                }
            });
    }

    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateSelectionUI);
    });

    function updateSelectionUI() {
        const selected = document.querySelectorAll('.book-checkbox:checked');
        const count = selected.length;
        
        selectionCount.textContent = count;
        selectionToolbar.style.display = count > 0 ? 'block' : 'none';
    }

    // Global functions for inline handlers
    window.selectAll = function() {
        const visibleCheckboxes = document.querySelectorAll('.book-item:not([style*="display: none"]) .book-checkbox');
        visibleCheckboxes.forEach(cb => cb.checked = true);
        updateSelectionUI();
    };

    window.clearSelection = function() {
        checkboxes.forEach(cb => cb.checked = false);
        updateSelectionUI();
    };

    // Sort dropdown change handler
    const sortDropdown = document.getElementById('sort');
    if (sortDropdown) {
        sortDropdown.addEventListener('change', function() {
            document.getElementById('filter-form').submit();
        });
    }

    // Searchable dropdown functionality
    initializeSearchableDropdowns();

    // ---- Row-based pagination helpers ----
    function measureColumns(){
        const container = document.getElementById('books-container');
        if(!container) return 0;
        const first = container.querySelector('.book-item');
        if(!first) return 0;
        const rowWidth = container.clientWidth || container.getBoundingClientRect().width;
        const itemWidth = first.getBoundingClientRect().width;
        if(!rowWidth || !itemWidth) return 0;
        return Math.max(1, Math.floor(rowWidth / itemWidth));
    }
    function goToPage(targetPage){
        const url = new URL(window.location.href);
        const cols = measureColumns();
        const metaEl = document.getElementById('lib-meta');
        const rows = parseInt((metaEl && metaEl.dataset.rows) ? metaEl.dataset.rows : '4', 10);
        url.searchParams.set('page', String(targetPage));
        url.searchParams.set('rows', String(rows));
        url.searchParams.set('cols', String(cols || 1));
        window.location.href = url.toString();
    }
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    const prevBtnBottom = document.getElementById('prevPageBtnBottom');
    const nextBtnBottom = document.getElementById('nextPageBtnBottom');
    const metaEl = document.getElementById('lib-meta');
    const currentPage = parseInt((metaEl && metaEl.dataset.page) ? metaEl.dataset.page : '1', 10);
    const totalPages = window.LIBRARY_CONFIG.totalPages;
    function updatePagerState(page){
        // Update top pagination buttons
        if(prevBtn){
            if(page <= 1){ prevBtn.classList.add('disabled'); prevBtn.setAttribute('aria-disabled','true'); }
            else { prevBtn.classList.remove('disabled'); prevBtn.setAttribute('aria-disabled','false'); }
        }
        if(nextBtn){
            if(page >= totalPages){ nextBtn.classList.add('disabled'); nextBtn.setAttribute('aria-disabled','true'); }
            else { nextBtn.classList.remove('disabled'); nextBtn.setAttribute('aria-disabled','false'); }
        }
        // Update bottom pagination buttons
        if(prevBtnBottom){
            if(page <= 1){ prevBtnBottom.classList.add('disabled'); prevBtnBottom.setAttribute('aria-disabled','true'); }
            else { prevBtnBottom.classList.remove('disabled'); prevBtnBottom.setAttribute('aria-disabled','false'); }
        }
        if(nextBtnBottom){
            if(page >= totalPages){ nextBtnBottom.classList.add('disabled'); nextBtnBottom.setAttribute('aria-disabled','true'); }
            else { nextBtnBottom.classList.remove('disabled'); nextBtnBottom.setAttribute('aria-disabled','false'); }
        }
    }
    updatePagerState(currentPage);
    // Attach event listeners to top pagination buttons
    if(prevBtn){ prevBtn.addEventListener('click', function(e){ e.preventDefault(); const p = currentPage; if(p>1) goToPage(p-1); }); }
    if(nextBtn){ nextBtn.addEventListener('click', function(e){ e.preventDefault(); const p = currentPage; if(p<totalPages) goToPage(p+1); }); }
    // Attach event listeners to bottom pagination buttons
    if(prevBtnBottom){ prevBtnBottom.addEventListener('click', function(e){ e.preventDefault(); const p = currentPage; if(p>1) goToPage(p-1); }); }
    if(nextBtnBottom){ nextBtnBottom.addEventListener('click', function(e){ e.preventDefault(); const p = currentPage; if(p<totalPages) goToPage(p+1); }); }
    // Attach event listeners to the "jump to page" selects (top and bottom)
    const pageSelect = document.getElementById('pageSelect');
    const pageSelectBottom = document.getElementById('pageSelectBottom');
    if(pageSelect){ pageSelect.addEventListener('change', function(){ const p = parseInt(this.value, 10); if(p && p !== currentPage) goToPage(p); }); }
    if(pageSelectBottom){ pageSelectBottom.addEventListener('change', function(){ const p = parseInt(this.value, 10); if(p && p !== currentPage) goToPage(p); }); }
    (function ensureCols(){
        const url = new URL(window.location.href);
        const colsParam = parseInt(url.searchParams.get('cols')||'0', 10);
        if(!colsParam || colsParam<=0){
            const measured = measureColumns();
            if(measured){
                const metaEl = document.getElementById('lib-meta');
                const p = parseInt((metaEl && metaEl.dataset.page) ? metaEl.dataset.page : '1', 10);
                const rows = parseInt((metaEl && metaEl.dataset.rows) ? metaEl.dataset.rows : '4', 10);
                url.searchParams.set('page', String(p));
                url.searchParams.set('rows', String(rows));
                url.searchParams.set('cols', String(measured));
                window.location.replace(url.toString());
            }
        }
    })();
    let resizeTO;
    window.addEventListener('resize', function(){
        clearTimeout(resizeTO);
        resizeTO = setTimeout(()=>{
            const url = new URL(window.location.href);
            const oldCols = parseInt(url.searchParams.get('cols')||'0', 10);
            const newCols = measureColumns();
            if(newCols && newCols !== oldCols){
                const metaEl = document.getElementById('lib-meta');
                const rows = parseInt((metaEl && metaEl.dataset.rows) ? metaEl.dataset.rows : '4', 10);
                url.searchParams.set('page','1');
                url.searchParams.set('rows', String(rows));
                url.searchParams.set('cols', String(newCols));
                window.location.replace(url.toString());
            }
        }, 250);
    });

    window.deleteSelected = function() {
        if (!bulkDeleteForm) return;
        const selectedIds = populateBulkForm(bulkDeleteForm, 'bulk-delete-ids');
        if (selectedIds.length === 0) {
            alert('Select at least one book to delete.');
            return;
        }

        if (confirm(`Are you sure you want to delete ${selectedIds.length} book(s) from your library?`)) {
            bulkDeleteForm.submit();
        }
    };

    function handleStatusChange(statusValue) {
        if (!statusValue || !bulkStatusForm) return;
        const selectedIds = populateBulkForm(bulkStatusForm, 'bulk-status-ids');
        if (selectedIds.length === 0) {
            alert('Select at least one book to change status.');
            return;
        }
        updateHiddenInput(bulkStatusForm, 'reading_status', statusValue);
        if (bulkStatusMenu && bulkStatusMenu.previousElementSibling) {
            const dropdown = bootstrap.Dropdown.getOrCreateInstance(bulkStatusMenu.previousElementSibling);
            dropdown.hide();
        }
        submitBulkAction(bulkStatusForm, {
            onSuccess: handleBulkActionResponse,
        });
    }

    function handleLocationChange(locationValue) {
        if (!bulkLocationForm) return;
        const selectedIds = populateBulkForm(bulkLocationForm, 'bulk-location-ids');
        if (selectedIds.length === 0) {
            alert('Select at least one book to change location.');
            return;
        }
        updateHiddenInput(bulkLocationForm, 'location_id', locationValue);
        if (bulkLocationMenu && bulkLocationMenu.previousElementSibling) {
            const dropdown = bootstrap.Dropdown.getOrCreateInstance(bulkLocationMenu.previousElementSibling);
            dropdown.hide();
        }
        submitBulkAction(bulkLocationForm, {
            onSuccess: handleBulkActionResponse,
        });
    }

    function openBulkCategoryModal() {
        if (!bulkCategoryForm) return;
        const selectedIds = populateBulkForm(bulkCategoryForm, 'bulk-category-ids');
        if (selectedIds.length === 0) {
            alert('Select at least one book to change categories.');
            return;
        }

        const categorySelect = document.getElementById('bulk-category-select');
        if (categorySelect) {
            Array.from(categorySelect.options).forEach(option => option.selected = false);
        }
        const additionalField = document.getElementById('bulk-additional-categories');
        if (additionalField) {
            additionalField.value = '';
        }
        const clearCheckbox = document.getElementById('bulk-clear-categories');
        if (clearCheckbox) {
            clearCheckbox.checked = false;
        }

        if (bulkCategoryModalElement) {
            const modal = bootstrap.Modal.getOrCreateInstance(bulkCategoryModalElement);
            modal.show();
        }
    }

    if (bulkStatusMenu) {
        bulkStatusMenu.querySelectorAll('button[data-status]').forEach(item => {
            item.addEventListener('click', () => handleStatusChange(item.dataset.status));
        });
    }

    if (bulkLocationMenu) {
        bulkLocationMenu.querySelectorAll('button[data-location]').forEach(item => {
            item.addEventListener('click', () => handleLocationChange(item.dataset.location));
        });
    }

    if (bulkCategoryButton) {
        bulkCategoryButton.addEventListener('click', openBulkCategoryModal);
    }

    if (bulkCategoryForm) {
        bulkCategoryForm.addEventListener('submit', function(event) {
            event.preventDefault();
            const selectedIds = populateBulkForm(bulkCategoryForm, 'bulk-category-ids');
            if (selectedIds.length === 0) {
                alert('Select at least one book to change categories.');
                return;
            }
            submitBulkAction(bulkCategoryForm, {
                onSuccess: data => {
                    if (bulkCategoryModalElement) {
                        const modal = bootstrap.Modal.getOrCreateInstance(bulkCategoryModalElement);
                        modal.hide();
                    }
                    handleBulkActionResponse(data);
                }
            });
        });
    }

    // Fallback delegated click handler so clicks on cards navigate even if inline handlers fail
    const booksContainer = document.getElementById('books-container');
    if (booksContainer) {
        booksContainer.addEventListener('click', function(e) {
            // Ignore clicks on selection checkbox or its container
            if (e.target.closest('.book-checkbox') || e.target.closest('.position-absolute')) {
                return;
            }
            const card = e.target.closest('.book-card');
            if (!card) return;
            const uid = card.getAttribute('data-book-id');
            if (uid && typeof window.openBook === 'function') {
                window.openBook(uid);
            }
        });
    }

    window.openBook = function(uid) {
        if (!uid) {
            console.error('No UID provided for book');
            return;
        }
        console.log('Opening book with UID:', uid);
        var baseUrl = window.LIBRARY_CONFIG.viewBookUrlTemplate;
        var bookUrl = baseUrl.replace('PLACEHOLDER', uid);
        console.log('Navigating to:', bookUrl);
        window.location.href = bookUrl;
    };

    window.clearStatusFilter = function() {
        applyStatusFilter('all');
        updateActiveFilter('all');
    };
});

function applyStatusFilter(filter) {
    const books = document.querySelectorAll('.book-item');
    const noBooks = document.getElementById('no-books-message');
    const noBooksText = document.getElementById('no-books-text');
    let visibleCount = 0;

    books.forEach(book => {
        const readingStatus = book.dataset.readingStatus;
        const ownershipStatus = book.dataset.ownershipStatus;
        let shouldShow = false;

    switch(filter) {
            case 'all':
                shouldShow = true;
                break;
            case 'reading':
        // Handle both legacy 'reading' and new 'currently_reading'
        shouldShow = (readingStatus === 'reading' || readingStatus === 'currently_reading');
                break;
            case 'read':
                shouldShow = readingStatus === 'read';
                break;
            case 'plan_to_read':
                shouldShow = readingStatus === 'plan_to_read';
                break;
            case 'on_hold':
                shouldShow = readingStatus === 'on_hold';
                break;
            case 'wishlist':
                shouldShow = ownershipStatus === 'wishlist';
                break;
            case 'loaned':
                shouldShow = ownershipStatus === 'loaned';
                break;
        }

        if (shouldShow) {
            book.style.display = '';
            visibleCount++;
        } else {
            book.style.display = 'none';
        }
    });

    // Note: #book-count intentionally not updated here — it reflects the
    // Advanced Filters' server-side total (across all pages), not how many
    // of this page's cards match this client-side-only quick filter.

    // Update no books message based on filter
    if (noBooksText && visibleCount === 0) {
        let message = 'No books found matching your current filter.';
        switch(filter) {
            case 'reading':
                message = "You're not currently reading any books.";
                break;
            case 'read':
                message = "You haven't finished any books yet.";
                break;
            case 'plan_to_read':
                message = "You have no books planned to read.";
                break;
            case 'on_hold':
                message = "You have no books on hold.";
                break;
            case 'wishlist':
                message = "You have no books on your wishlist.";
                break;
            case 'loaned':
                message = "You have no books currently loaned out.";
                break;
            case 'all':
                message = "Your library is empty.";
                break;
        }
        noBooksText.textContent = message;
    }
    
    // Show/hide no books message (if present)
    if (noBooks) {
        noBooks.style.display = visibleCount === 0 ? 'block' : 'none';
    }
    
    // Update hidden form field (if present)
    const statusFilterInput = document.getElementById('status_filter');
    if (statusFilterInput) {
        statusFilterInput.value = filter;
    }
}

function updateActiveFilter(filter) {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        if (btn.dataset.filter === filter) {
            btn.classList.remove('btn-outline-warning', 'btn-outline-success', 'btn-outline-info', 'btn-outline-primary', 'btn-outline-secondary', 'btn-outline-dark');
            if (filter === 'reading') btn.classList.add('btn-warning');
            else if (filter === 'read') btn.classList.add('btn-success');
            else if (filter === 'plan_to_read') btn.classList.add('btn-info');
            else if (filter === 'wishlist') btn.classList.add('btn-primary');
            else if (filter === 'on_hold') btn.classList.add('btn-secondary');
            else if (filter === 'loaned') btn.classList.add('btn-warning');
            else btn.classList.add('btn-dark');
        } else {
            btn.classList.remove('btn-warning', 'btn-success', 'btn-info', 'btn-primary', 'btn-secondary', 'btn-dark');
            if (btn.dataset.filter === 'reading') btn.classList.add('btn-outline-warning');
            else if (btn.dataset.filter === 'read') btn.classList.add('btn-outline-success');
            else if (btn.dataset.filter === 'plan_to_read') btn.classList.add('btn-outline-info');
            else if (btn.dataset.filter === 'wishlist') btn.classList.add('btn-outline-primary');
            else if (btn.dataset.filter === 'on_hold') btn.classList.add('btn-outline-secondary');
            else if (btn.dataset.filter === 'loaned') btn.classList.add('btn-outline-warning');
            else btn.classList.add('btn-outline-dark');
        }
    });
}

function initializeSearchableDropdowns() {
    // Initialize all searchable dropdowns
    document.querySelectorAll('.dropdown-search-menu').forEach(menu => {
        const field = menu.dataset.field;
        const button = document.querySelector(`[data-field="${field}"].dropdown-search-btn`);
        const hiddenInput = document.querySelector(`input[name="${field}"]`);
        const searchInput = menu.querySelector('.dropdown-search-input');
        const allItems = menu.querySelectorAll('.dropdown-item');
        
        if (!button || !hiddenInput || !searchInput) return;
        
        // Handle search input
        searchInput.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            
            allItems.forEach(item => {
                const text = item.textContent.toLowerCase();
                const li = item.parentElement;
                
                if (text.includes(searchTerm) || item.dataset.value === '') {
                    li.style.display = '';
                } else {
                    li.style.display = 'none';
                }
            });
        });
        
        // Prevent dropdown from closing when clicking on search input
        searchInput.addEventListener('click', function(e) {
            e.stopPropagation();
        });
        
        // Handle item selection
        allItems.forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const value = this.dataset.value;
                const text = this.textContent;
                
                // Update hidden input
                hiddenInput.value = value;
                
                // Update button text
                const selectedText = button.querySelector('.selected-text');
                selectedText.textContent = text;
                
                // Close dropdown
                const dropdown = new bootstrap.Dropdown(button);
                dropdown.hide();
                
                // Clear search
                searchInput.value = '';
                allItems.forEach(item => {
                    item.parentElement.style.display = '';
                });
                
                // Mark as active
                allItems.forEach(item => item.classList.remove('active'));
                this.classList.add('active');
            });
        });
        
        // Set initial active item
        const currentValue = hiddenInput.value;
        allItems.forEach(item => {
            if (item.dataset.value === currentValue) {
                item.classList.add('active');
            }
        });
        
        // Clear search when dropdown is closed
        button.addEventListener('hidden.bs.dropdown', function() {
            searchInput.value = '';
            allItems.forEach(item => {
                item.parentElement.style.display = '';
            });
        });
        
        // Focus search input when dropdown opens
        button.addEventListener('shown.bs.dropdown', function() {
            searchInput.focus();
        });
    });
}

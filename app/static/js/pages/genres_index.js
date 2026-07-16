// Extracted from app/templates/genres/index.html for browser caching.

function filterCategories() {
    const searchTerm = document.getElementById('categorySearch').value.toLowerCase();
    const cards = document.querySelectorAll('.category-card');
    const rows = document.querySelectorAll('.category-row');
    
    // Filter cards
    cards.forEach(card => {
        const name = card.dataset.name;
        const description = card.dataset.description;
        
        if (name.includes(searchTerm) || description.includes(searchTerm)) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
    
    // Filter rows
    rows.forEach(row => {
        const name = row.dataset.name;
        
        if (name.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

function toggleView(viewType) {
    const cardView = document.getElementById('cardViewContainer');
    const listView = document.getElementById('listViewContainer');
    const treeView = document.getElementById('treeViewContainer');
    
    // Hide all views
    cardView.classList.add('d-none');
    listView.classList.add('d-none');
    treeView.classList.add('d-none');
    
    // Show selected view
    if (viewType === 'card') {
        cardView.classList.remove('d-none');
    } else if (viewType === 'list') {
        listView.classList.remove('d-none');
    } else if (viewType === 'tree') {
        treeView.classList.remove('d-none');
    }
}

function selectAll() {
    const categoryCheckboxes = document.querySelectorAll('.category-checkbox');
    const selectAllCheckboxes = document.querySelectorAll('#selectAllCheckbox, #selectAllCheckboxList');
    
    categoryCheckboxes.forEach(checkbox => {
        checkbox.checked = true;
    });
    
    selectAllCheckboxes.forEach(checkbox => {
        checkbox.checked = true;
        checkbox.indeterminate = false;
    });
    
    updateSelection();
}

function toggleSelectAll() {
    const selectAllCheckboxes = document.querySelectorAll('#selectAllCheckbox, #selectAllCheckboxList');
    const categoryCheckboxes = document.querySelectorAll('.category-checkbox');
    const isChecked = selectAllCheckboxes[0].checked;
    
    // Update all checkboxes to match
    selectAllCheckboxes.forEach(checkbox => {
        checkbox.checked = isChecked;
    });
    
    categoryCheckboxes.forEach(checkbox => {
        checkbox.checked = isChecked;
    });
    
    updateSelection();
}

function updateSelection() {
    const checkboxes = document.querySelectorAll('.category-checkbox');
    const selectedBoxes = document.querySelectorAll('.category-checkbox:checked');
    const selectionToolbar = document.getElementById('selection-toolbar');
    const selectionCount = document.getElementById('selection-count');
    const selectAllCheckboxes = document.querySelectorAll('#selectAllCheckbox, #selectAllCheckboxList');
    
    // Update visual state of category cards
    checkboxes.forEach(checkbox => {
        const categoryCard = checkbox.closest('.category-card');
        if (categoryCard) {
            if (checkbox.checked) {
                categoryCard.classList.add('border-primary', 'bg-light');
            } else {
                categoryCard.classList.remove('border-primary', 'bg-light');
            }
        }
    });
    
    // Update selection toolbar
    if (selectedBoxes.length > 0) {
        selectionToolbar.style.display = 'block';
        selectionCount.textContent = selectedBoxes.length;
    } else {
        selectionToolbar.style.display = 'none';
    }
    
    // Update select all checkboxes
    const allChecked = selectedBoxes.length === checkboxes.length && checkboxes.length > 0;
    const someChecked = selectedBoxes.length > 0 && selectedBoxes.length < checkboxes.length;
    
    selectAllCheckboxes.forEach(checkbox => {
        checkbox.checked = allChecked;
        checkbox.indeterminate = someChecked;
    });
}

function clearSelection() {
    const categoryCheckboxes = document.querySelectorAll('.category-checkbox');
    const selectAllCheckboxes = document.querySelectorAll('#selectAllCheckbox, #selectAllCheckboxList');
    
    categoryCheckboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    
    selectAllCheckboxes.forEach(checkbox => {
        checkbox.checked = false;
        checkbox.indeterminate = false;
    });
    
    updateSelection();
}

function bulkDeleteCategories() {
    const selectedBoxes = document.querySelectorAll('.category-checkbox:checked');
    
    if (selectedBoxes.length === 0) {
        alert('Please select categories to delete.');
        return;
    }
    
    // Build summary
    let categoriesWithBooks = 0;
    let categoriesWithChildren = 0;
    let summary = `You are about to delete ${selectedBoxes.length} categories:<br><br>`;
    
    selectedBoxes.forEach((checkbox, index) => {
        const categoryCard = checkbox.closest('.category-card') || checkbox.closest('tr');
        const categoryName = categoryCard.querySelector('strong').textContent || categoryCard.dataset.name;
        const bookCount = parseInt(checkbox.dataset.bookCount) || 0;
        
        summary += `• ${categoryName}`;
        if (bookCount > 0) {
            summary += ` (${bookCount} books)`;
            categoriesWithBooks++;
        }
        summary += '<br>';
    });
    
    // Show options if needed
    const deletionOptions = document.getElementById('deletion-options');
    if (categoriesWithBooks > 0 || categoriesWithChildren > 0) {
        deletionOptions.style.display = 'block';
        summary += `<br><strong>Warning:</strong> ${categoriesWithBooks} categories have books assigned.`;
    } else {
        deletionOptions.style.display = 'none';
    }
    
    document.getElementById('deletion-summary').innerHTML = summary;
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('deleteConfirmationModal'));
    modal.show();
}

function confirmBulkDelete() {
    const selectedBoxes = document.querySelectorAll('.category-checkbox:checked');
    const form = document.getElementById('bulk-delete-form');
    const forceDeleteCheckbox = document.getElementById('forceDelete');
    
    if (!form) {
        alert('Error: Could not find delete form. Please refresh the page.');
        return;
    }
    
    // Clear form but keep CSRF token
    const existingCsrfToken = form.querySelector('input[name="csrf_token"]');
    form.innerHTML = '';
    if (existingCsrfToken) {
        form.appendChild(existingCsrfToken);
    }
    
    // Add force delete flag if needed
    if (forceDeleteCheckbox && forceDeleteCheckbox.checked) {
        const forceInput = document.createElement('input');
        forceInput.type = 'hidden';
        forceInput.name = 'force_delete';
        forceInput.value = 'true';
        form.appendChild(forceInput);
    }
    
    selectedBoxes.forEach((checkbox) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'selected_categories';
        input.value = checkbox.value;
        form.appendChild(input);
    });
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('deleteConfirmationModal'));
    if (modal) {
        modal.hide();
    }
    
    form.submit();
}

function openCategory(categoryId) {
    window.location.href = `/genres/${categoryId}`;
}

function changePerPage() {
    const perPageSelect = document.getElementById('per-page-select');
    const perPage = perPageSelect.value;
    const currentUrl = new URL(window.location);
    
    currentUrl.searchParams.set('per_page', perPage);
    currentUrl.searchParams.set('page', '1'); // Reset to first page when changing per_page
    
    window.location.href = currentUrl.toString();
}

// Initialize event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Add change listeners to all category checkboxes
    document.querySelectorAll('.category-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', updateSelection);
    });
    
    // Initialize view
    updateSelection();
});

// Extracted from app/templates/people.html for browser caching.

document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const gridView = document.getElementById('gridView');
    const listView = document.getElementById('listView');
    const gridContainer = document.getElementById('gridViewContainer');
    const listContainer = document.getElementById('listViewContainer');
    
    // Search functionality
    searchInput.addEventListener('input', function() {
        const query = this.value.toLowerCase();
        
        // Search in grid view
        const gridCards = document.querySelectorAll('.person-card');
        gridCards.forEach(card => {
            const name = card.dataset.name;
            const bio = card.dataset.bio;
            const matches = name.includes(query) || bio.includes(query);
            card.style.display = matches ? 'block' : 'none';
        });
        
        // Search in list view
        const listRows = document.querySelectorAll('.person-row');
        listRows.forEach(row => {
            const name = row.dataset.name;
            const bio = row.dataset.bio;
            const matches = name.includes(query) || bio.includes(query);
            row.style.display = matches ? 'table-row' : 'none';
        });
    });
    
    // View mode toggle
    gridView.addEventListener('change', function() {
        if (this.checked) {
            gridContainer.classList.remove('d-none');
            listContainer.classList.add('d-none');
        }
    });
    
    listView.addEventListener('change', function() {
        if (this.checked) {
            gridContainer.classList.add('d-none');
            listContainer.classList.remove('d-none');
        }
    });

    // Selection functionality
    const checkboxes = document.querySelectorAll('.person-checkbox');
    const selectionToolbar = document.getElementById('selection-toolbar');
    const selectionCount = document.getElementById('selection-count');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');

    // Add event listeners to checkboxes using event delegation
    document.addEventListener('change', function(e) {
        if (e.target.classList.contains('person-checkbox')) {
            updateSelection();
        }
    });

    // Prevent checkbox clicks from triggering card/row actions
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('person-checkbox') || e.target.closest('.person-selection')) {
            e.stopPropagation();
        }
    });

    function updateSelection() {
        const checkboxes = document.querySelectorAll('.person-checkbox');
        const selectedBoxes = document.querySelectorAll('.person-checkbox:checked');
        
        // Update visual state of person cards
        checkboxes.forEach(checkbox => {
            const personCard = checkbox.closest('.person-card');
            if (personCard) {
                if (checkbox.checked) {
                    personCard.classList.add('selected');
                } else {
                    personCard.classList.remove('selected');
                }
            }
        });
        
        // Update selection count and toolbar visibility
        if (selectionCount) {
            selectionCount.textContent = selectedBoxes.length;
        }
        
        if (selectionToolbar) {
            if (selectedBoxes.length > 0) {
                selectionToolbar.style.display = 'block';
            } else {
                selectionToolbar.style.display = 'none';
            }
        }

        // Update select all checkbox state
        if (selectAllCheckbox) {
            if (selectedBoxes.length === 0) {
                selectAllCheckbox.indeterminate = false;
                selectAllCheckbox.checked = false;
            } else if (selectedBoxes.length === checkboxes.length) {
                selectAllCheckbox.indeterminate = false;
                selectAllCheckbox.checked = true;
            } else {
                selectAllCheckbox.indeterminate = true;
            }
        }
    }
});

// Global functions for toolbar buttons
function selectAll() {
    const checkboxes = document.querySelectorAll('.person-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
    });
    updateSelection();
}

function clearSelection() {
    const checkboxes = document.querySelectorAll('.person-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    updateSelection();
}

function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const checkboxes = document.querySelectorAll('.person-checkbox');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });
    updateSelection();
}

function deleteSelected() {
    const selectedBoxes = document.querySelectorAll('.person-checkbox:checked');
    
    if (selectedBoxes.length === 0) {
        alert('No people selected for deletion.');
        return;
    }
    
    // Analyze selected people for book associations
    let peopleWithBooks = [];
    let peopleWithoutBooks = [];
    let totalBooks = 0;
    
    selectedBoxes.forEach(checkbox => {
        const bookCount = parseInt(checkbox.dataset.bookCount) || 0;
        const personCard = checkbox.closest('.person-card, .person-row');
        const personName = personCard ? personCard.querySelector('a').textContent.trim() : 'Unknown';
        
        if (bookCount > 0) {
            peopleWithBooks.push({ name: personName, books: bookCount });
            totalBooks += bookCount;
        } else {
            peopleWithoutBooks.push(personName);
        }
    });
    
    // Build modal content
    let modalContent = `<p><strong>You are about to delete ${selectedBoxes.length} person(s):</strong></p>`;
    
    if (peopleWithoutBooks.length > 0) {
        modalContent += `<div class="alert alert-success mb-3">
            <h6><i class="bi bi-check-circle"></i> ${peopleWithoutBooks.length} person(s) can be safely deleted:</h6>
            <ul class="mb-0">`;
        peopleWithoutBooks.slice(0, 8).forEach(name => {
            modalContent += `<li>${name}</li>`;
        });
        if (peopleWithoutBooks.length > 8) {
            modalContent += `<li><em>... and ${peopleWithoutBooks.length - 8} more</em></li>`;
        }
        modalContent += `</ul></div>`;
    }
    
    if (peopleWithBooks.length > 0) {
        modalContent += `<div class="alert alert-warning mb-3">
            <h6><i class="bi bi-exclamation-triangle"></i> ${peopleWithBooks.length} person(s) have associated books (${totalBooks} total):</h6>
            <ul class="mb-2">`;
        peopleWithBooks.slice(0, 8).forEach(person => {
            modalContent += `<li>${person.name} <span class="badge bg-secondary">${person.books} book${person.books > 1 ? 's' : ''}</span></li>`;
        });
        if (peopleWithBooks.length > 8) {
            modalContent += `<li><em>... and ${peopleWithBooks.length - 8} more</em></li>`;
        }
        modalContent += `</ul>
            <p class="mb-0 text-muted">
                <strong>These people CANNOT be deleted until their book associations are removed.</strong> 
                Consider using "Merge People" to consolidate duplicate entries instead.
            </p></div>`;
    }
    
    // Show message if no people can be deleted safely
    if (peopleWithoutBooks.length === 0 && peopleWithBooks.length > 0) {
        modalContent += `<div class="alert alert-danger">
            <strong>No people can be deleted because they all have associated books.</strong>
        </div>`;
    }
    
    document.getElementById('deletion-summary').innerHTML = modalContent;
    
    // Show/hide deletion options and update button text
    const deletionOptions = document.getElementById('deletion-options');
    const deleteButton = document.getElementById('confirmDeleteBtn');
    const deleteButtonText = document.getElementById('deleteButtonText');
    
    if (peopleWithBooks.length > 0) {
        deletionOptions.style.display = 'block';
        
        // Update button text based on radio selection
        const radioButtons = document.querySelectorAll('input[name="deletionMode"]');
        radioButtons.forEach(radio => {
            radio.addEventListener('change', function() {
                if (this.value === 'safe') {
                    if (peopleWithoutBooks.length > 0) {
                        deleteButtonText.textContent = `Delete ${peopleWithoutBooks.length} Without Books`;
                        deleteButton.className = 'btn btn-warning';
                        deleteButton.disabled = false;
                    } else {
                        deleteButtonText.textContent = 'No People Can Be Deleted';
                        deleteButton.className = 'btn btn-secondary';
                        deleteButton.disabled = true;
                    }
                } else if (this.value === 'force') {
                    deleteButtonText.textContent = `Force Delete All ${selectedBoxes.length}`;
                    deleteButton.className = 'btn btn-danger';
                    deleteButton.disabled = false;
                }
            });
        });
        
        // Set initial button text
        if (peopleWithoutBooks.length > 0) {
            deleteButtonText.textContent = `Delete ${peopleWithoutBooks.length} Without Books`;
            deleteButton.className = 'btn btn-warning';
            deleteButton.disabled = false;
        } else {
            deleteButtonText.textContent = 'No People Can Be Deleted';
            deleteButton.className = 'btn btn-secondary';
            deleteButton.disabled = true;
        }
    } else {
        deletionOptions.style.display = 'none';
        deleteButtonText.textContent = `Delete ${selectedBoxes.length} Selected`;
        deleteButton.className = 'btn btn-danger';
        deleteButton.disabled = false;
    }
    
    deleteButton.style.display = 'inline-block';
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('deleteConfirmationModal'));
    modal.show();
    
    // Handle confirm button click
    document.getElementById('confirmDeleteBtn').onclick = function() {
        modal.hide();
        
        // Determine deletion mode
        const forceDelete = document.getElementById('forceDeleteAll').checked;
        submitDeletion(selectedBoxes, forceDelete);
    };
}

function submitDeletion(selectedBoxes, forceDelete = false) {
    // Create form and submit
    const form = document.getElementById('bulk-delete-form');
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
    if (forceDelete) {
        const forceInput = document.createElement('input');
        forceInput.type = 'hidden';
        forceInput.name = 'force_delete';
        forceInput.value = 'true';
        form.appendChild(forceInput);
    }
    
    selectedBoxes.forEach((checkbox) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'selected_persons';
        input.value = checkbox.value;
        form.appendChild(input);
    });
    
    form.submit();
}

function openPerson(personId) {
    window.location.href = `/people/${personId}`;
}

function updateSelection() {
    const checkboxes = document.querySelectorAll('.person-checkbox');
    const selectedBoxes = document.querySelectorAll('.person-checkbox:checked');
    const selectionToolbar = document.getElementById('selection-toolbar');
    const selectionCount = document.getElementById('selection-count');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    
    // Update visual state of person cards
    checkboxes.forEach(checkbox => {
        const personCard = checkbox.closest('.person-card');
        if (personCard) {
            if (checkbox.checked) {
                personCard.classList.add('selected');
            } else {
                personCard.classList.remove('selected');
            }
        }
    });
    
    // Update selection count and toolbar visibility
    if (selectionCount) {
        selectionCount.textContent = selectedBoxes.length;
    }
    
    if (selectionToolbar) {
        if (selectedBoxes.length > 0) {
            selectionToolbar.style.display = 'block';
        } else {
            selectionToolbar.style.display = 'none';
        }
    }

    // Update select all checkbox state
    if (selectAllCheckbox) {
        if (selectedBoxes.length === 0) {
            selectAllCheckbox.indeterminate = false;
            selectAllCheckbox.checked = false;
        } else if (selectedBoxes.length === checkboxes.length) {
            selectAllCheckbox.indeterminate = false;
            selectAllCheckbox.checked = true;
        } else {
            selectAllCheckbox.indeterminate = true;
        }
    }
}

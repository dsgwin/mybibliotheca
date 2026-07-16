// Extracted from genres/merge.html for browser caching.
// window.MERGE_FORM_FIELDS is set by a small inline script before this loads.

// Category data
const categoryData = JSON.parse(document.getElementById('category-data').textContent);

function updateSourcePreview() {
    const sourceSelect = document.getElementById(window.MERGE_FORM_FIELDS.sourceId);
    const sourceId = sourceSelect.value;
    const preview = document.getElementById('source-preview');
    const details = document.getElementById('source-details');
    
    if (sourceId && categoryData[sourceId]) {
        const category = categoryData[sourceId];
        
        details.innerHTML = `
            <div class="d-flex align-items-center mb-2">
                <span class="me-2">${category.icon || '🏷️'}</span>
                <strong>${category.name}</strong>
                ${category.color ? `<div class="ms-2 color-indicator" style="background-color: ${category.color};"></div>` : ''}
            </div>
            <div class="row text-center small">
                <div class="col-4">
                    <div class="fw-bold text-primary">${category.book_count}</div>
                    <div class="text-muted">Books</div>
                </div>
                <div class="col-4">
                    <div class="fw-bold text-info">${category.children_count}</div>
                    <div class="text-muted">Subcategories</div>
                </div>
                <div class="col-4">
                    <div class="fw-bold text-secondary">${category.level}</div>
                    <div class="text-muted">Level</div>
                </div>
            </div>
            ${category.description ? `<div class="mt-2 small text-muted">${category.description}</div>` : ''}
            ${category.aliases && category.aliases.length > 0 ? `<div class="mt-2"><small class="text-muted">Aliases: ${category.aliases.join(', ')}</small></div>` : ''}
        `;
        
        preview.classList.remove('d-none');
    } else {
        preview.classList.add('d-none');
    }
    
    updateMergePreview();
}

function updateTargetPreview() {
    const targetSelect = document.getElementById(window.MERGE_FORM_FIELDS.targetId);
    const targetId = targetSelect.value;
    const preview = document.getElementById('target-preview');
    const details = document.getElementById('target-details');
    
    if (targetId && categoryData[targetId]) {
        const category = categoryData[targetId];
        
        details.innerHTML = `
            <div class="d-flex align-items-center mb-2">
                <span class="me-2">${category.icon || '🏷️'}</span>
                <strong>${category.name}</strong>
                ${category.color ? `<div class="ms-2 color-indicator" style="background-color: ${category.color};"></div>` : ''}
            </div>
            <div class="row text-center small">
                <div class="col-4">
                    <div class="fw-bold text-primary">${category.book_count}</div>
                    <div class="text-muted">Books</div>
                </div>
                <div class="col-4">
                    <div class="fw-bold text-info">${category.children_count}</div>
                    <div class="text-muted">Subcategories</div>
                </div>
                <div class="col-4">
                    <div class="fw-bold text-secondary">${category.level}</div>
                    <div class="text-muted">Level</div>
                </div>
            </div>
            ${category.description ? `<div class="mt-2 small text-muted">${category.description}</div>` : ''}
            ${category.aliases && category.aliases.length > 0 ? `<div class="mt-2"><small class="text-muted">Aliases: ${category.aliases.join(', ')}</small></div>` : ''}
        `;
        
        preview.classList.remove('d-none');
    } else {
        preview.classList.add('d-none');
    }
    
    updateMergePreview();
}

function updateMergePreview() {
    const sourceSelect = document.getElementById(window.MERGE_FORM_FIELDS.sourceId);
    const targetSelect = document.getElementById(window.MERGE_FORM_FIELDS.targetId);
    const sourceId = sourceSelect.value;
    const targetId = targetSelect.value;
    const preview = document.getElementById('merge-preview');
    const summary = document.getElementById('merge-summary');
    const removalList = document.getElementById('removal-list');
    const transferList = document.getElementById('transfer-list');
    
    if (sourceId && targetId && categoryData[sourceId] && categoryData[targetId]) {
        const source = categoryData[sourceId];
        const target = categoryData[targetId];
        
        // Check for potential issues
        let warnings = [];
        if (sourceId === targetId) {
            warnings.push('You cannot merge a category with itself.');
        }
        
        if (warnings.length > 0) {
            summary.innerHTML = `<div class="alert alert-danger">${warnings.join('<br>')}</div>`;
            preview.classList.remove('d-none');
            return;
        }
        
        // Build summary
        summary.innerHTML = `
            <div class="d-flex align-items-center justify-content-center mb-3">
                <div class="text-center">
                    <div><strong>${source.name}</strong></div>
                    <small class="text-muted">${source.book_count} books, ${source.children_count} subcategories</small>
                </div>
                <div class="mx-4">
                    <i class="bi bi-arrow-right merge-arrow"></i>
                </div>
                <div class="text-center">
                    <div><strong>${target.name}</strong></div>
                    <small class="text-muted">${target.book_count} books, ${target.children_count} subcategories</small>
                </div>
            </div>
        `;
        
        // Build removal list
        removalList.innerHTML = `
            <li><i class="bi bi-x text-danger"></i> "${source.name}" category will be deleted</li>
        `;
        
        // Build transfer list
        let transfers = [];
        if (source.book_count > 0) {
            transfers.push(`<li><i class="bi bi-book text-primary"></i> ${source.book_count} books moved to "${target.name}"`);
        }
        if (source.children_count > 0) {
            transfers.push(`<li><i class="bi bi-diagram-3 text-info"></i> ${source.children_count} subcategories moved to "${target.name}"`);
        }
        
        const mergeAliases = document.getElementById(window.MERGE_FORM_FIELDS.mergeAliases).checked;
        const mergeDescription = document.getElementById(window.MERGE_FORM_FIELDS.mergeDescription).checked;
        
        if (mergeAliases && source.aliases && source.aliases.length > 0) {
            transfers.push(`<li><i class="bi bi-tags text-secondary"></i> ${source.aliases.length} aliases added to "${target.name}"`);
        }
        if (mergeDescription && source.description) {
            transfers.push(`<li><i class="bi bi-text-paragraph text-secondary"></i> Description appended to "${target.name}"`);
        }
        
        if (transfers.length === 0) {
            transfers.push(`<li><i class="bi bi-info-circle text-muted"></i> No content to transfer`);
        }
        
        transferList.innerHTML = transfers.join('');
        
        preview.classList.remove('d-none');
    } else {
        preview.classList.add('d-none');
    }
}

function toggleSubmitButton() {
    const checkbox = document.getElementById('confirm-merge');
    const button = document.getElementById('submit-button');
    button.disabled = !checkbox.checked;
}

// Update target options when source changes to prevent self-merge
document.getElementById(window.MERGE_FORM_FIELDS.sourceId).addEventListener('change', function() {
    const sourceId = this.value;
    const targetSelect = document.getElementById(window.MERGE_FORM_FIELDS.targetId);
    
    // Re-enable all options first
    Array.from(targetSelect.options).forEach(option => {
        option.disabled = false;
    });
    
    // Disable the source option in target select
    if (sourceId) {
        const sourceOption = targetSelect.querySelector(`option[value="${sourceId}"]`);
        if (sourceOption) {
            sourceOption.disabled = true;
        }
        
        // If target is currently set to the same as source, clear it
        if (targetSelect.value === sourceId) {
            targetSelect.value = '';
            updateTargetPreview();
        }
    }
});

// Add change listeners for merge options
document.getElementById(window.MERGE_FORM_FIELDS.mergeAliases).addEventListener('change', updateMergePreview);
document.getElementById(window.MERGE_FORM_FIELDS.mergeDescription).addEventListener('change', updateMergePreview);

// Initialize if values are pre-selected
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById(window.MERGE_FORM_FIELDS.sourceId).value) {
        updateSourcePreview();
    }
    if (document.getElementById(window.MERGE_FORM_FIELDS.targetId).value) {
        updateTargetPreview();
    }
});

// Form validation
document.getElementById('merge-form').addEventListener('submit', function(e) {
    const sourceId = document.getElementById(window.MERGE_FORM_FIELDS.sourceId).value;
    const targetId = document.getElementById(window.MERGE_FORM_FIELDS.targetId).value;
    
    if (sourceId === targetId) {
        e.preventDefault();
        alert('You cannot merge a category with itself.');
        return;
    }
    
    if (!sourceId || !targetId) {
        e.preventDefault();
        alert('Please select both source and target categories.');
        return;
    }
    
    const confirmCheckbox = document.getElementById('confirm-merge');
    if (!confirmCheckbox.checked) {
        e.preventDefault();
        alert('Please confirm that you understand this action cannot be undone.');
        return;
    }
    
    // Final confirmation
    const source = categoryData[sourceId];
    const target = categoryData[targetId];
    const message = `Are you sure you want to merge "${source.name}" into "${target.name}"?\n\nThis will:\n- Move ${source.book_count} books to "${target.name}"\n- Move ${source.children_count} subcategories to "${target.name}"\n- Delete "${source.name}" permanently\n\nThis action cannot be undone.`;
    
    if (!confirm(message)) {
        e.preventDefault();
    }
});

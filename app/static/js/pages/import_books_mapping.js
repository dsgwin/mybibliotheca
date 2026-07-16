// Extracted from app/templates/import_books_mapping.html for browser caching.

// Handle template application
function applyTemplate() {
    const templateSelect = document.getElementById('import_template');
    const selectedOption = templateSelect.options[templateSelect.selectedIndex];
    
    if (selectedOption.value && selectedOption.dataset.mappings) {
        try {
            const mappings = JSON.parse(selectedOption.dataset.mappings);
            
            // Clear all mappings first, then apply template mappings
            document.querySelectorAll('.mapping-select').forEach(select => {
                select.value = '';
                handleFieldSelection(select);
            });
            
            // Apply mappings from template
            document.querySelectorAll('.mapping-select').forEach(select => {
                const csvField = select.dataset.csvField;
                if (mappings[csvField]) {
                    select.value = mappings[csvField];
                    handleFieldSelection(select);
                }
            });
        } catch (e) {
            console.error('Error applying template:', e);
        }
    } else {
        // If no template selected, clear all mappings
        document.querySelectorAll('.mapping-select').forEach(select => {
            select.value = '';
            handleFieldSelection(select);
        });
    }
}

// Handle dynamic field creation options
function handleFieldSelection(selectElement) {
    const createInputs = selectElement.parentElement.querySelector('.create-field-inputs');
    const value = selectElement.value;
    
    if (value === 'create_global_field' || value === 'create_personal_field') {
        createInputs.style.display = 'block';
    } else {
        createInputs.style.display = 'none';
    }
}

// Handle save as template checkbox
document.getElementById('save_as_template').addEventListener('change', function() {
    const templateNameInput = document.getElementById('template_name');
    templateNameInput.disabled = !this.checked;
    if (this.checked) {
        templateNameInput.focus();
    } else {
        templateNameInput.value = '';
    }
});

// Add event listeners to all mapping selects
document.querySelectorAll('.mapping-select').forEach(select => {
    select.addEventListener('change', function() {
        handleFieldSelection(this);
    });
});

// Auto-apply detected template on page load
document.addEventListener('DOMContentLoaded', function() {
    // No longer needed - backend handles template mappings via suggested_mappings
    // when a template is detected
});

// Form submission handling
document.getElementById('mappingForm').addEventListener('submit', function(e) {
    const submitBtn = this.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting Import...';
    
    // Validate template name if saving as template
    const saveAsTemplate = document.getElementById('save_as_template').checked;
    const templateName = document.getElementById('template_name').value.trim();
    
    if (saveAsTemplate && !templateName) {
        e.preventDefault();
        alert('Please enter a template name or uncheck "Save as template"');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-play"></i> Start Import';
        return;
    }
    
    // Validate that at least one field is mapped
    const mappingSelects = document.querySelectorAll('.mapping-select');
    let hasMappings = false;
    
    mappingSelects.forEach(select => {
        if (select.value && select.value !== '') {
            hasMappings = true;
        }
    });
    
    if (!hasMappings) {
        e.preventDefault();
        alert('Please map at least one CSV column to a book field before starting the import.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-play"></i> Start Import';
        return;
    }
});

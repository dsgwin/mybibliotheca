// Extracted from app/templates/edit_book_custom_metadata.html for browser caching.

// Initialize tooltips
document.addEventListener('DOMContentLoaded', function() {
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Handle predefined option checkboxes for list/tags fields
    const checkboxes = document.querySelectorAll('.predefined-options input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const fieldName = this.id.split('_').slice(0, -1).join('_');
            const textInput = document.getElementById(fieldName);
            
            if (textInput) {
                const checkedOptions = Array.from(document.querySelectorAll(`input[id^="${fieldName}_"]:checked`))
                    .map(cb => cb.value);
                textInput.value = checkedOptions.join(', ');
            }
        });
    });
});

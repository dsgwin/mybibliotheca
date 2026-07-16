// Extracted from app/templates/import_reading_history_mapping.html for browser caching.

// Form validation
document.querySelector('form').addEventListener('submit', function(e) {
    // Check if Date field is mapped
    const dateFieldMapped = Array.from(document.querySelectorAll('select[name^="field_"]'))
        .some(select => select.value === 'Date');
    
    if (!dateFieldMapped) {
        e.preventDefault();
        alert('Please map the Date field. It is required for reading history import.');
        return;
    }
    
    // Show loading state
    const submitBtn = document.getElementById('importBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting Import...';
});

// Highlight required fields
document.addEventListener('DOMContentLoaded', function() {
    const selects = document.querySelectorAll('select[name^="field_"]');
    selects.forEach(select => {
        select.addEventListener('change', function() {
            if (this.value === 'Date') {
                this.classList.add('border-danger');
            } else {
                this.classList.remove('border-danger');
            }
        });
        
        // Initial check
        if (select.value === 'Date') {
            select.classList.add('border-danger');
        }
    });
});

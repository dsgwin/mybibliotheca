// Extracted from reading_logs/my_logs.html for browser caching.
// window.MY_LOGS_CONFIG is set by a small inline script before this loads.

document.addEventListener('DOMContentLoaded', function() {
    // Quick log form handling
    const quickLogForm = document.getElementById('quickLogForm');
    const quickLogModal = new bootstrap.Modal(document.getElementById('quickLogModal'));
    
    quickLogForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(quickLogForm);
        const pages = parseInt(formData.get('pages_read')) || 0;
        const minutes = parseInt(formData.get('minutes_read')) || 0;
        
        // Validate that we have either pages or minutes
        if (pages <= 0 && minutes <= 0) {
            alert('Please enter either pages read or minutes read (or both).');
            return;
        }
        
        // Submit the form
        fetch(window.MY_LOGS_CONFIG.quickAddUrl, {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': window.MY_LOGS_CONFIG.csrfToken
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                quickLogModal.hide();
                location.reload(); // Reload to show the new log
            } else {
                alert('Error: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while saving the reading log.');
        });
    });
    
    // Reset form when modal is hidden
    document.getElementById('quickLogModal').addEventListener('hidden.bs.modal', function() {
        quickLogForm.reset();
        document.getElementById('quick_date').value = new Date().toISOString().split('T')[0];
    });
});

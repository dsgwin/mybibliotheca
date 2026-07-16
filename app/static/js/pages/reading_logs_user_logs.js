// Extracted from reading_logs/user_logs.html for browser caching.
// window.USER_LOGS_CONFIG is set by a small inline script before this loads.

// Get CSRF token from meta tag
function getCSRFToken() {
    return document.querySelector('meta[name="csrf-token"]').getAttribute('content');
}

// Quick Log Form Submission
document.getElementById('quickLogForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const submitBtn = this.querySelector('button[type="submit"]');
    
    // Disable submit button and show loading
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Saving...';
    
    fetch(window.USER_LOGS_CONFIG.quickAddUrl, {
        method: 'POST',
        body: formData,
        headers: {
            'X-CSRFToken': getCSRFToken()
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Close modal and refresh page
            const modal = bootstrap.Modal.getInstance(document.getElementById('quickLogModal'));
            modal.hide();
            window.location.reload();
        } else {
            // Show error message
            const alertDiv = document.createElement('div');
            alertDiv.className = 'alert alert-danger mt-2';
            alertDiv.innerHTML = '<i class="bi bi-exclamation-triangle me-2"></i>' + (data.message || 'Failed to save reading log');
            this.querySelector('.modal-body').appendChild(alertDiv);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-danger mt-2';
        alertDiv.innerHTML = '<i class="bi bi-exclamation-triangle me-2"></i>Failed to save reading log. Please try again.';
        this.querySelector('.modal-body').appendChild(alertDiv);
    })
    .finally(() => {
        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-check-lg me-1"></i>Log Reading';
    });
});

// Reset quick log modal when closed
document.getElementById('quickLogModal').addEventListener('hidden.bs.modal', function() {
    const form = this.querySelector('#quickLogForm');
    form.reset();
    form.querySelector('input[name="date"]').value = new Date().toISOString().split('T')[0];
    
    // Remove any error alerts
    const alerts = this.querySelectorAll('.alert-danger');
    alerts.forEach(alert => alert.remove());
});

// Set today's date when modal opens
document.getElementById('quickLogModal').addEventListener('show.bs.modal', function() {
    const dateInput = this.querySelector('input[name="date"]');
    if (!dateInput.value) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
});

// Delete Log Function
function deleteLog(logId) {
    if (confirm('Are you sure you want to delete this reading log?')) {
        // Create a form and submit it (same as card view)
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = `${window.USER_LOGS_CONFIG.deleteLogBaseUrl}${logId}`;
        
        // Add CSRF token
        const csrfInput = document.createElement('input');
        csrfInput.type = 'hidden';
        csrfInput.name = 'csrf_token';
        csrfInput.value = getCSRFToken();
        form.appendChild(csrfInput);
        
        // Add to page and submit
        document.body.appendChild(form);
        form.submit();
    }
}

// Helper function to show alerts
function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        <i class="bi bi-${type === 'success' ? 'check-circle' : 'exclamation-triangle'} me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Insert at top of content
    const container = document.querySelector('.container-fluid');
    container.insertBefore(alertDiv, container.firstChild);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentElement) {
            alertDiv.remove();
        }
    }, 5000);
}

function loadPage(page) {
    const perPage = document.getElementById('per-page-select').value;
    const url = `/stats/reading-logs?page=${page}&per_page=${perPage}`;
    
    const content = document.getElementById('reading-logs-detail-content');
    content.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"></div></div>';
    
    fetch(url)
        .then(response => response.text())
        .then(html => {
            content.innerHTML = html;
        })
        .catch(error => {
            console.error('Error loading page:', error);
            content.innerHTML = '<div class="alert alert-danger">Error loading page. Please try again.</div>';
        });
}

function changePerPage() {
    loadPage(1); // Go to first page when changing per-page count
}

// Delegated handler for pagination links
document.addEventListener('click', function(e) {
    const link = e.target.closest('a.page-link[data-page]');
    if (link) {
        e.preventDefault();
        const page = parseInt(link.getAttribute('data-page'), 10);
        if (!isNaN(page)) {
            loadPage(page);
        }
    }
});

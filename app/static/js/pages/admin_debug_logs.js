// Extracted from app/templates/admin/debug_logs.html for browser caching.

let autoRefreshInterval = null;

function toggleAllDetails() {
    const details = document.querySelectorAll('details');
    const anyOpen = Array.from(details).some(d => d.open);
    
    details.forEach(detail => {
        detail.open = !anyOpen;
    });
}

function autoRefresh() {
    const button = event.target;
    
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
        button.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Auto Refresh';
        button.classList.remove('btn-success');
        button.classList.add('btn-outline-secondary');
    } else {
        autoRefreshInterval = setInterval(() => {
            window.location.reload();
        }, 5000);
        button.innerHTML = '<i class="bi bi-stop-circle"></i> Stop Refresh';
        button.classList.remove('btn-outline-secondary');
        button.classList.add('btn-success');
    }
}

function clearLogs() {
    if (confirm('Are you sure you want to clear today\'s debug logs? This action cannot be undone.')) {
        // This would need a backend endpoint to actually clear logs
        alert('Clear logs functionality would be implemented here');
    }
}

// Auto-scroll to bottom for real-time monitoring
if (autoRefreshInterval) {
    const logContainer = document.querySelector('.log-container');
    if (logContainer) {
        logContainer.scrollTop = logContainer.scrollHeight;
    }
}

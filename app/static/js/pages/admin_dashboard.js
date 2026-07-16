// Extracted from admin/dashboard.html for browser caching.
// window.ADMIN_DASHBOARD_CONFIG is set by a small inline script before this loads.

// Auto-refresh stats every 5 minutes
setInterval(function() {
    fetch(window.ADMIN_DASHBOARD_CONFIG.apiStatsUrl)
        .then(response => response.json())
        .then(data => {
            // Update stats cards (basic implementation)
            console.log('Stats updated:', data);
        })
        .catch(error => console.error('Error updating stats:', error));
}, 300000); // 5 minutes

// Quick backup function
function createQuickBackup() {
    if (confirm('Create a quick backup of your database? This will take just a moment.')) {
        // Create a form to submit the backup request
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = window.ADMIN_DASHBOARD_CONFIG.createBackupUrl;
        
        // Add custom name
        const nameInput = document.createElement('input');
        nameInput.type = 'hidden';
        nameInput.name = 'name';
        nameInput.value = 'quick-backup-' + new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        form.appendChild(nameInput);
        
        // Add description
        const descInput = document.createElement('input');
        descInput.type = 'hidden';
        descInput.name = 'description';
        descInput.value = 'Quick backup created from admin dashboard';
        form.appendChild(descInput);
        
        // Add CSRF token
        const csrfInput = document.createElement('input');
        csrfInput.type = 'hidden';
        csrfInput.name = 'csrf_token';
        csrfInput.value = window.ADMIN_DASHBOARD_CONFIG.csrfToken;
        form.appendChild(csrfInput);
        
        document.body.appendChild(form);
        form.submit();
    }
}

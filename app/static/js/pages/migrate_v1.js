// Extracted from migration/migrate_v1.html for browser caching.
// window.MIGRATE_V1_CONFIG is set by a small inline script before this loads.

function confirmMigration() {
    return confirm(
        'Are you ready to start the migration?\n\n' +
        'This process will:\n' +
        '• Create a backup of your current data\n' +
        '• Import all ' + window.MIGRATE_V1_CONFIG.bookCount + ' books\n' +
        '• Assign them to your admin account (' + window.MIGRATE_V1_CONFIG.adminUsername + ')\n\n' +
        'Click OK to proceed or Cancel to review.'
    );
}

// Add loading state when form is submitted
document.querySelector('form').addEventListener('submit', function(e) {
    if (confirmMigration()) {
        const button = this.querySelector('button[type="submit"]');
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Migrating...';
        
        // Show progress indicator
        const progressDiv = document.createElement('div');
        progressDiv.className = 'alert alert-info mt-3';
        progressDiv.innerHTML = `
            <h6><i class="fas fa-hourglass-half"></i> Migration in Progress</h6>
            <p class="mb-0">Please wait while we migrate your library. This may take a few minutes.</p>
            <div class="progress mt-2">
                <div class="progress-bar progress-bar-striped progress-bar-animated" 
                     role="progressbar" style="width: 100%"></div>
            </div>
        `;
        this.appendChild(progressDiv);
    } else {
        e.preventDefault();
    }
});

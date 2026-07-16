// Extracted from migration/migrate_v2.html for browser caching.
// window.MIGRATE_V2_CONFIG is set by a small inline script before this loads.

function confirmMigration() {
    return confirm(
        'Ready to start the multi-user migration?\n\n' +
        'This process will:\n' +
        '• Create backups of all current data\n' +
        '• Migrate ' + window.MIGRATE_V2_CONFIG.userCount + ' users\n' +
        '• Import ' + window.MIGRATE_V2_CONFIG.bookCount + ' books with proper ownership\n' +
        '• Preserve all reading history\n\n' +
        'This may take several minutes depending on library size.\n\n' +
        'Click OK to proceed.'
    );
}

// Add loading state when form is submitted
document.querySelector('form').addEventListener('submit', function(e) {
    if (confirmMigration()) {
        const button = this.querySelector('button[type="submit"]');
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Migrating Users and Books...';
        
        // Show detailed progress indicator
        const progressDiv = document.createElement('div');
        progressDiv.className = 'alert alert-info mt-3';
        progressDiv.innerHTML = `
            <h6><i class="fas fa-hourglass-half"></i> Multi-User Migration in Progress</h6>
            <p>Please wait while we migrate your multi-user library. This process includes:</p>
            <ul class="mb-2">
                <li>Creating user accounts</li>
                <li>Importing books with ownership</li>
                <li>Preserving reading history</li>
                <li>Verifying data integrity</li>
            </ul>
            <div class="progress">
                <div class="progress-bar progress-bar-striped progress-bar-animated bg-success" 
                     role="progressbar" style="width: 100%"></div>
            </div>
        `;
        this.appendChild(progressDiv);
    } else {
        e.preventDefault();
    }
});

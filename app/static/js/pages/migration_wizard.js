// Extracted from migration/wizard.html for browser caching.
// window.MIGRATION_WIZARD_CONFIG is set by a small inline script before this loads.

function dismissMigration() {
    if (confirm('Are you sure you want to dismiss the migration? You can always access it later from the admin panel.')) {
        fetch(window.MIGRATION_WIZARD_CONFIG.dismissMigrationUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': window.MIGRATION_WIZARD_CONFIG.csrfToken
            }
        }).then(() => {
            window.location.href = window.MIGRATION_WIZARD_CONFIG.indexUrl;
        });
    }
}

// Validate form
document.getElementById('migrationForm').addEventListener('submit', function(e) {
    const checked = document.querySelectorAll('input[name="selected_databases"]:checked');
    if (checked.length === 0) {
        e.preventDefault();
        alert('Please select at least one database to migrate.');
    }
});

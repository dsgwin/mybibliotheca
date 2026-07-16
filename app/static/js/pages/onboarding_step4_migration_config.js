// Extracted from app/templates/onboarding/step4_migration_config.html for browser caching.

function updateSelection() {
    // Remove selected styling from all options
    document.querySelectorAll('[onclick*="updateSelection"]').forEach(option => {
        option.style.borderColor = '#e9ecef';
        option.style.backgroundColor = 'white';
    });
    
    // Add selected styling to clicked option
    const checkedInput = document.querySelector('input[name="admin_user_mapping"]:checked');
    if (checkedInput) {
        const parentDiv = checkedInput.closest('[onclick*="updateSelection"]');
        if (parentDiv) {
            parentDiv.style.borderColor = '#667eea';
            parentDiv.style.backgroundColor = '#f0f2ff';
        }
    }
}

// Initialize selection styling
document.addEventListener('DOMContentLoaded', function() {
    updateSelection();
});

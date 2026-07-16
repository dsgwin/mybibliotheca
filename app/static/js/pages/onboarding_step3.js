// Extracted from app/templates/onboarding/step3_data_options.html for browser caching.

function selectOption(option) {
    // Remove selected class from all cards
    document.querySelectorAll('.option-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Add selected class to clicked card
    document.querySelector(`[data-option="${option}"]`).classList.add('selected');
    
    // Check the corresponding radio button
    document.querySelector(`input[value="${option}"]`).checked = true;
    
    // Show/hide additional options
    const migrationOptions = document.getElementById('migration_options');
    const importOptions = document.getElementById('import_options');
    
    migrationOptions.style.display = 'none';
    importOptions.style.display = 'none';
    
    if (option === 'migrate') {
        migrationOptions.style.display = 'block';
    } else if (option === 'import') {
        importOptions.style.display = 'block';
    }
}

function selectDatabase(path) {
    // Remove selected class from all database options
    document.querySelectorAll('.database-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    // Add selected class to clicked option
    event.currentTarget.classList.add('selected');
    
    // Check the corresponding radio button
    document.querySelector(`input[value="${path}"]`).checked = true;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    const checkedOption = document.querySelector('input[name="data_option"]:checked');
    if (checkedOption) {
        selectOption(checkedOption.value);
    }
});

// Extracted from app/templates/metadata/create_field.html for browser caching.

function toggleFieldOptions() {
    const fieldType = document.getElementById('field_type').value;
    const ratingOptions = document.getElementById('rating_options');
    const listOptions = document.getElementById('list_options');
    
    // Hide all options first
    ratingOptions.style.display = 'none';
    listOptions.style.display = 'none';
    
    // Show relevant options
    if (fieldType === 'rating_5' || fieldType === 'rating_10') {
        ratingOptions.style.display = 'block';
        setupRatingLabels(fieldType === 'rating_5' ? 5 : 10);
    } else if (fieldType === 'list' || fieldType === 'tags') {
        listOptions.style.display = 'block';
    }
}

function setupRatingLabels(maxRating) {
    const container = document.getElementById('rating_labels_container');
    container.innerHTML = '';
    
    for (let i = 1; i <= maxRating; i++) {
        const div = document.createElement('div');
        div.className = 'row mb-2';
        div.innerHTML = `
            <div class="col-2">
                <label class="form-label">${i}:</label>
            </div>
            <div class="col-10">
                <input type="text" class="form-control form-control-sm" 
                       name="rating_label_${i}" placeholder="Label for ${i} (optional)">
            </div>
        `;
        container.appendChild(div);
    }
}

// Update field name based on display name
document.getElementById('display_name').addEventListener('input', function(e) {
    const displayName = e.target.value;
    const nameField = document.getElementById('name');
    
    // Only auto-update if name field is empty
    if (!nameField.value) {
        const autoName = displayName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
        nameField.value = autoName;
    }
});

// Initialize field options on page load
document.addEventListener('DOMContentLoaded', function() {
    toggleFieldOptions();
});

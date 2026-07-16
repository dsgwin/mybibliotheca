// Extracted from genres/add_edit.html for browser caching.
// window.CATEGORY_FORM_FIELDS is set by a small inline script before this loads.

// Real-time preview updates
document.addEventListener('DOMContentLoaded', function() {
    const nameField = document.getElementById(window.CATEGORY_FORM_FIELDS.name);
    const iconField = document.getElementById(window.CATEGORY_FORM_FIELDS.icon);
    const colorField = document.getElementById(window.CATEGORY_FORM_FIELDS.color);
    const colorHex = document.getElementById('color-hex');
    const aliasField = document.getElementById(window.CATEGORY_FORM_FIELDS.aliases);
    
    // Update preview elements
    const previewName = document.getElementById('preview-name');
    const previewIcon = document.getElementById('preview-icon');
    const previewColor = document.getElementById('preview-color');
    const iconPreview = document.getElementById('icon-preview');
    const iconDisplay = document.getElementById('icon-display');
    const aliasPreview = document.getElementById('alias-preview');
    const aliasTags = document.getElementById('alias-tags');
    
    // Name field updates
    nameField.addEventListener('input', function() {
        previewName.textContent = this.value || 'Category Name';
    });
    
    // Icon field updates
    iconField.addEventListener('input', function() {
        const icon = this.value || '🏷️';
        previewIcon.textContent = icon;
        iconDisplay.textContent = icon;
        
        if (this.value) {
            iconPreview.classList.remove('d-none');
        } else {
            iconPreview.classList.add('d-none');
        }
    });
    
    // Color field updates
    colorField.addEventListener('input', function() {
        previewColor.style.backgroundColor = this.value;
        colorHex.value = this.value;
    });
    
    // Make color hex input editable and sync with color picker
    colorHex.addEventListener('input', function() {
        const hexValue = this.value;
        if (/^#[0-9A-Fa-f]{6}$/.test(hexValue)) {
            colorField.value = hexValue;
            previewColor.style.backgroundColor = hexValue;
        }
    });
    
    // Alias field updates
    aliasField.addEventListener('input', function() {
        const aliases = this.value.split('\n').filter(alias => alias.trim());
        
        if (aliases.length > 0) {
            aliasTags.innerHTML = aliases.map(alias => 
                `<span class="badge bg-secondary me-1">${alias.trim()}</span>`
            ).join('');
            aliasPreview.classList.remove('d-none');
        } else {
            aliasPreview.classList.add('d-none');
        }
    });
    
    // Initialize color hex display
    colorHex.value = colorField.value;
    
    // Initialize alias preview
    if (aliasField.value) {
        aliasField.dispatchEvent(new Event('input'));
    }
});

// Icon picker functions
function selectEmoji(emoji) {
    const iconField = document.getElementById(window.CATEGORY_FORM_FIELDS.icon);
    iconField.value = emoji;
    iconField.dispatchEvent(new Event('input'));
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('iconPicker'));
    modal.hide();
}

function clearIcon() {
    const iconField = document.getElementById(window.CATEGORY_FORM_FIELDS.icon);
    iconField.value = '';
    iconField.dispatchEvent(new Event('input'));
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('iconPicker'));
    modal.hide();
}

// Enhanced Color Picker Functions
function initializeColorPicker() {
    // Preset colors (same as server-side random colors)
    const presetColors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
        '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
        '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#F9E79F',
        '#D2B4DE', '#AED6F1', '#A9DFBF', '#F5B7B1', '#D5DBDB',
        '#FF7675', '#74B9FF', '#00B894', '#FDCB6E', '#E17055',
        '#6C5CE7', '#FD79A8', '#00CEC9', '#55A3FF', '#A29BFE'
    ];
    
    // Populate preset colors
    const presetContainer = document.getElementById('preset-colors');
    presetColors.forEach(color => {
        const colorBtn = document.createElement('div');
        colorBtn.className = 'col-2 col-sm-1';
        colorBtn.innerHTML = `
            <button type="button" class="btn p-2 w-100 color-preset-btn" 
                    style="background-color: ${color}; height: 40px;" 
                    onclick="selectPresetColor('${color}')" 
                    title="${color}"></button>
        `;
        presetContainer.appendChild(colorBtn);
    });
    
    // Initialize color wheel
    const colorWheel = document.getElementById('color-wheel');
    const colorHexInput = document.getElementById('color-hex-input');
    const rgbR = document.getElementById('rgb-r');
    const rgbG = document.getElementById('rgb-g');
    const rgbB = document.getElementById('rgb-b');
    const colorPreview = document.getElementById('color-preview');
    
    // Sync color wheel with inputs
    colorWheel.addEventListener('input', function() {
        const color = this.value;
        updateColorInputs(color);
    });
    
    // Sync hex input
    colorHexInput.addEventListener('input', function() {
        const hex = this.value;
        if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
            colorWheel.value = hex;
            updateColorInputs(hex);
        }
    });
    
    // Sync RGB inputs
    [rgbR, rgbG, rgbB].forEach(input => {
        input.addEventListener('input', function() {
            const r = parseInt(rgbR.value) || 0;
            const g = parseInt(rgbG.value) || 0;
            const b = parseInt(rgbB.value) || 0;
            const hex = rgbToHex(r, g, b);
            colorWheel.value = hex;
            colorHexInput.value = hex;
            updateColorInputs(hex);
        });
    });
    
    // Initialize with current color
    const currentColor = document.getElementById(window.CATEGORY_FORM_FIELDS.color).value || '#6c757d';
    updateColorInputs(currentColor);
}

function updateColorInputs(color) {
    const colorPreview = document.getElementById('color-preview');
    const colorHexInput = document.getElementById('color-hex-input');
    const rgbR = document.getElementById('rgb-r');
    const rgbG = document.getElementById('rgb-g');
    const rgbB = document.getElementById('rgb-b');
    
    colorPreview.style.backgroundColor = color;
    colorHexInput.value = color;
    
    // Convert to RGB
    const rgb = hexToRgb(color);
    if (rgb) {
        rgbR.value = rgb.r;
        rgbG.value = rgb.g;
        rgbB.value = rgb.b;
    }
}

function selectPresetColor(color) {
    document.getElementById('color-wheel').value = color;
    updateColorInputs(color);
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function rgbToHex(r, g, b) {
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function randomColor() {
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
        '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
        '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#F9E79F',
        '#D2B4DE', '#AED6F1', '#A9DFBF', '#F5B7B1', '#D5DBDB',
        '#FF7675', '#74B9FF', '#00B894', '#FDCB6E', '#E17055',
        '#6C5CE7', '#FD79A8', '#00CEC9', '#55A3FF', '#A29BFE'
    ];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    // Update main form
    const colorField = document.getElementById(window.CATEGORY_FORM_FIELDS.color);
    const colorHex = document.getElementById('color-hex');
    const previewColor = document.getElementById('preview-color');
    
    colorField.value = randomColor;
    colorHex.value = randomColor;
    previewColor.style.backgroundColor = randomColor;
    
    // Update modal if open
    const colorWheel = document.getElementById('color-wheel');
    if (colorWheel) {
        updateColorInputs(randomColor);
        colorWheel.value = randomColor;
    }
}

function applySelectedColor() {
    const selectedColor = document.getElementById('color-wheel').value;
    const colorField = document.getElementById(window.CATEGORY_FORM_FIELDS.color);
    const colorHex = document.getElementById('color-hex');
    const previewColor = document.getElementById('preview-color');
    
    colorField.value = selectedColor;
    colorHex.value = selectedColor;
    previewColor.style.backgroundColor = selectedColor;
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('colorPicker'));
    modal.hide();
}

// Initialize color picker when modal is shown
document.getElementById('colorPicker').addEventListener('shown.bs.modal', function() {
    if (!this.hasAttribute('data-initialized')) {
        initializeColorPicker();
        this.setAttribute('data-initialized', 'true');
    }
});

function clearColor() {
    const colorField = document.getElementById(window.CATEGORY_FORM_FIELDS.color);
    const colorHex = document.getElementById('color-hex');
    
    colorField.value = '#6c757d';
    colorHex.value = '#6c757d';
    colorField.dispatchEvent(new Event('input'));
}

// Form validation
document.querySelector('form').addEventListener('submit', function(e) {
    const nameField = document.getElementById(window.CATEGORY_FORM_FIELDS.name);
    
    if (!nameField.value.trim()) {
        e.preventDefault();
        nameField.focus();
        nameField.classList.add('is-invalid');
    }
});

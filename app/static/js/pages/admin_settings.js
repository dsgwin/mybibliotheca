// Extracted from admin/settings.html for browser caching.
// window.ADMIN_SETTINGS_CSRF_TOKEN is set by a small inline script before this loads.

                            document.addEventListener('DOMContentLoaded', function() {
                                const input = document.getElementById('ai_max_tokens');
                                const warn = document.getElementById('ai-max-tokens-warning');
                                if (input && warn) {
                                    const toggle = () => {
                                        const val = parseInt(input.value || '0', 10);
                                        warn.style.display = val > 16000 ? 'block' : 'none';
                                    };
                                    input.addEventListener('input', toggle);
                                    toggle();
                                }
                            });

function showPasswordResetModal() {
    new bootstrap.Modal(document.getElementById('passwordResetModal')).show();
}

function showMaintenanceModal() {
    new bootstrap.Modal(document.getElementById('maintenanceModal')).show();
}

function exportData() {
    alert('📤 Data export feature is not yet implemented.');
}

function clearSessions() {
    if (confirm('🚪 Are you sure you want to clear all user sessions? This will log out all users.')) {
        alert('Feature not yet implemented.');
    }
}

async function toggleDebugMode() {
    const btn = document.getElementById('toggleDebugBtn');
    const status = document.getElementById('debugStatus');
    
    btn.disabled = true;
    btn.innerHTML = '⏳ Toggling...';
    
    try {
        const response = await fetch('/admin/debug/toggle', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': window.ADMIN_SETTINGS_CSRF_TOKEN
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            
            // Update status badge
            status.textContent = data.debug_enabled ? 'ON' : 'OFF';
            status.className = data.debug_enabled ? 'badge bg-success fs-6' : 'badge bg-secondary fs-6';
            
            // Update button
            btn.className = data.debug_enabled ? 'btn btn-warning w-100' : 'btn btn-success w-100';
            btn.innerHTML = data.debug_enabled ? '🟡 Disable Debug' : '🟢 Enable Debug';
            
            // Show success message
            const alertDiv = document.createElement('div');
            alertDiv.className = 'alert alert-success alert-dismissible fade show mt-2';
            alertDiv.innerHTML = `
                <strong>✅ Success:</strong> Debug mode ${data.debug_enabled ? 'enabled' : 'disabled'}.
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;
            btn.parentNode.appendChild(alertDiv);
            
            // Auto-dismiss after 3 seconds
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.remove();
                }
            }, 3000);
        } else {
            throw new Error('Failed to toggle debug mode');
        }
    } catch (error) {
        console.error('Error toggling debug mode:', error);
        
        // Show error message
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-danger alert-dismissible fade show mt-2';
        alertDiv.innerHTML = `
            <strong>❌ Error:</strong> Failed to toggle debug mode. Please try again.
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        btn.parentNode.appendChild(alertDiv);
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }
    
    btn.disabled = false;
}

// AI Configuration Functions
function toggleProviderSettings() {
    const provider = document.getElementById('ai_provider').value;
    const openaiSettings = document.getElementById('openai-settings');
    const ollamaSettings = document.getElementById('ollama-settings');
    
    if (provider === 'openai') {
        openaiSettings.style.display = 'block';
        ollamaSettings.style.display = 'none';
    } else if (provider === 'ollama') {
        openaiSettings.style.display = 'none';
        ollamaSettings.style.display = 'block';
    }
}

async function testSMTPConnection() {
    const btn = event.target;
    const originalText = btn.innerHTML;
    
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-arrow-clockwise spin me-1"></i>Testing...';
    
    try {
        const formData = new FormData();
        formData.append('csrf_token', window.ADMIN_SETTINGS_CSRF_TOKEN);
        formData.append('smtp_server', document.getElementById('smtp_server').value);
        formData.append('smtp_port', document.getElementById('smtp_port').value);
        formData.append('smtp_username', document.getElementById('smtp_username').value);
        formData.append('smtp_password', document.getElementById('smtp_password').value);
        const securityField = document.getElementById('smtp_security');
        if (securityField) {
            formData.append('smtp_security', securityField.value);
        }
        
        const response = await fetch('/admin/test-smtp-connection', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        // Remove any existing alerts
        const existingAlerts = document.querySelectorAll('.smtp-test-alert');
        existingAlerts.forEach(alert => alert.remove());
        
        // Create new alert
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${result.success ? 'success' : 'danger'} alert-dismissible fade show mt-3 smtp-test-alert`;
        alertDiv.innerHTML = `
            <strong>${result.success ? '✅ Success:' : '❌ Error:'}</strong> ${result.message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        btn.parentNode.parentNode.appendChild(alertDiv);
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    } catch (error) {
        console.error('Error testing SMTP connection:', error);
        
        // Show error message
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-danger alert-dismissible fade show mt-3 smtp-test-alert';
        alertDiv.innerHTML = `
            <strong>❌ Error:</strong> Failed to test SMTP connection. Please try again.
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        btn.parentNode.parentNode.appendChild(alertDiv);
        
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }
    
    btn.disabled = false;
    btn.innerHTML = originalText;
}

async function testAIConnection() {
    const btn = event.target;
    const originalText = btn.innerHTML;
    
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-arrow-clockwise spin me-1"></i>Testing...';
    
    try {
        const provider = document.getElementById('ai_provider').value;
        const formData = new FormData();
        formData.append('csrf_token', window.ADMIN_SETTINGS_CSRF_TOKEN);
        formData.append('ai_provider', provider);
        
        if (provider === 'openai') {
            formData.append('openai_api_key', document.getElementById('openai_api_key').value);
            formData.append('openai_base_url', document.getElementById('openai_base_url').value);
            formData.append('openai_model', document.getElementById('openai_model').value);
        } else if (provider === 'ollama') {
            formData.append('ollama_base_url', document.getElementById('ollama_base_url').value);
            formData.append('ollama_model', document.getElementById('ollama_model').value);
        }
        
        const response = await fetch('/admin/test-ai-connection', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        // Remove any existing alerts
        const existingAlerts = document.querySelectorAll('.ai-test-alert');
        existingAlerts.forEach(alert => alert.remove());
        
        // Create new alert
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${result.success ? 'success' : 'danger'} alert-dismissible fade show mt-3 ai-test-alert`;
        
        let alertContent = `<strong>${result.success ? '✅ Success:' : '❌ Error:'}</strong> ${result.message}`;
        
        // Add model information for successful Ollama connections
        if (result.success && result.models && Array.isArray(result.models) && result.models.length > 0) {
            alertContent += `<br><br><strong>Available Models:</strong><ul class="mt-2 mb-1">`;
            result.models.forEach(model => {
                alertContent += `<li><code>${model}</code></li>`;
            });
            alertContent += `</ul>`;
        }
        
        alertContent += `<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
        alertDiv.innerHTML = alertContent;
        btn.parentNode.appendChild(alertDiv);
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
        
    } catch (error) {
        // Remove any existing alerts
        const existingAlerts = document.querySelectorAll('.ai-test-alert');
        existingAlerts.forEach(alert => alert.remove());
        
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-danger alert-dismissible fade show mt-3 ai-test-alert';
        alertDiv.innerHTML = `
            <strong>❌ Error:</strong> Failed to test AI connection. Please try again.
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        btn.parentNode.appendChild(alertDiv);
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }
    
    btn.disabled = false;
    btn.innerHTML = originalText;
}

async function testOllamaConnection() {
    const btn = event.target;
    const originalText = btn.innerHTML;
    const ollamaUrl = document.getElementById('ollama_base_url').value;
    const resultsDiv = document.getElementById('ollama-test-results');
    
    if (!ollamaUrl) {
        alert('Please enter the Ollama server URL first');
        return;
    }
    
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-arrow-clockwise spin me-1"></i>Testing...';
    
    // Clear previous results
    resultsDiv.innerHTML = '';
    
    try {
        const formData = new FormData();
        formData.append('csrf_token', window.ADMIN_SETTINGS_CSRF_TOKEN);
        formData.append('ollama_base_url', ollamaUrl);
        
        const response = await fetch('/admin/test-ollama-connection', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success && result.models) {
            // Populate model dropdown
            const modelSelect = document.getElementById('ollama_model');
            modelSelect.innerHTML = '<option value="">Select a model</option>';
            
            result.models.forEach(model => {
                const option = document.createElement('option');
                option.value = model.name;
                option.textContent = `${model.name} (${model.size})`;
                modelSelect.appendChild(option);
            });
            
            // Show success message
            resultsDiv.innerHTML = `
                <div class="alert alert-success alert-dismissible fade show">
                    <i class="bi bi-check-circle me-1"></i>
                    <strong>Connection successful!</strong> Found ${result.models.length} models. Please select one from the dropdown above.
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            `;
        } else {
            // Show error message
            resultsDiv.innerHTML = `
                <div class="alert alert-danger alert-dismissible fade show">
                    <i class="bi bi-exclamation-triangle me-1"></i>
                    <strong>Connection failed:</strong> ${result.message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            `;
        }
        
    } catch (error) {
        resultsDiv.innerHTML = `
            <div class="alert alert-danger alert-dismissible fade show">
                <i class="bi bi-exclamation-triangle me-1"></i>
                <strong>Error:</strong> Failed to test connection. Please try again.
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
    }
    
    btn.disabled = false;
    btn.innerHTML = originalText;
}

// Handle manual model entry toggle
document.addEventListener('DOMContentLoaded', function() {
    const manualCheckbox = document.getElementById('ollama_manual_model');
    const modelSelect = document.getElementById('ollama_model');
    const manualInput = document.getElementById('ollama_model_manual');
    
    if (manualCheckbox) {
        manualCheckbox.addEventListener('change', function() {
            if (this.checked) {
                modelSelect.style.display = 'none';
                manualInput.style.display = 'block';
                manualInput.required = true;
                modelSelect.required = false;
            } else {
                modelSelect.style.display = 'block';
                manualInput.style.display = 'none';
                manualInput.required = false;
                modelSelect.required = true;
            }
        });
    }
});

// Initialize provider settings on page load
document.addEventListener('DOMContentLoaded', function() {
    toggleProviderSettings();
    toggleBackgroundOptions();
    updateBackgroundPreview();

    try {
        const params = new URLSearchParams(window.location.search);
        if ((params.get('section') || '').toLowerCase() === 'ai') {
            const aiCollapse = document.getElementById('collapseAIConfig');
            if (aiCollapse && typeof bootstrap !== 'undefined' && bootstrap.Collapse) {
                const instance = bootstrap.Collapse.getOrCreateInstance(aiCollapse, { toggle: false });
                instance.show();
                setTimeout(() => {
                    try {
                        aiCollapse.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    } catch (err) {
                        console.debug('AI collapse scroll failed', err);
                    }
                }, 250);
            }
        }
    } catch (err) {
        console.debug('AI collapse init failed', err);
    }
});

// Background configuration functions
function toggleBackgroundOptions() {
    const backgroundType = document.getElementById('background_type').value;
    const solidOptions = document.getElementById('solid-color-options');
    const gradientOptions = document.getElementById('gradient-options');
    const imageOptions = document.getElementById('image-options');
    
    // Hide all options first
    solidOptions.style.display = 'none';
    gradientOptions.style.display = 'none';
    imageOptions.style.display = 'none';
    
    // Clear file input and URL when switching away from image mode
    if (backgroundType !== 'image') {
        const fileInput = document.getElementById('background_image_file');
        const urlInput = document.getElementById('background_image_url');
        if (fileInput) fileInput.value = '';
        if (urlInput) urlInput.value = '';
    }
    
    // Show relevant options
    switch(backgroundType) {
        case 'solid':
            solidOptions.style.display = 'block';
            break;
        case 'gradient':
            gradientOptions.style.display = 'block';
            break;
        case 'image':
            imageOptions.style.display = 'block';
            break;
    }
    
    updateBackgroundPreview();
}

function updateBackgroundPreview() {
    const backgroundType = document.getElementById('background_type').value;
    const previewBox = document.getElementById('background-preview-box');
    
    // Clear previous styles first
    previewBox.style.background = '';
    previewBox.style.backgroundSize = '';
    previewBox.style.backgroundRepeat = '';
    previewBox.style.backgroundPosition = '';
    previewBox.innerHTML = '';
    
    switch(backgroundType) {
        case 'default':
            previewBox.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            previewBox.innerHTML = '<small>Background Preview</small>';
            break;
        case 'solid':
            const solidColor = document.getElementById('solid_color').value;
            previewBox.style.background = solidColor;
            previewBox.innerHTML = '<small>Background Preview</small>';
            break;
        case 'gradient':
            const startColor = document.getElementById('gradient_start').value;
            const endColor = document.getElementById('gradient_end').value;
            const direction = document.getElementById('gradient_direction').value;
            previewBox.style.background = `linear-gradient(${direction}, ${startColor} 0%, ${endColor} 100%)`;
            previewBox.innerHTML = '<small>Background Preview</small>';
            break;
        case 'image':
            const imageUrl = document.getElementById('background_image_url').value;
            const imageFile = document.getElementById('background_image_file').files[0];
            const imagePosition = document.getElementById('image_position').value;
            
            if (imageFile) {
                // If there's an uploaded file, preview that
                const reader = new FileReader();
                reader.onload = function(e) {
                    const fileUrl = e.target.result;
                    applyImageBackground(previewBox, fileUrl, imagePosition);
                    previewBox.innerHTML = '<small>Uploaded Image Preview</small>';
                };
                reader.readAsDataURL(imageFile);
            } else if (imageUrl) {
                // Fall back to URL if no file uploaded
                applyImageBackground(previewBox, imageUrl, imagePosition);
                previewBox.innerHTML = '<small>URL Image Preview</small>';
            } else {
                previewBox.style.background = '#f8f9fa';
                previewBox.innerHTML = '<small class="text-muted">Upload file or enter image URL to preview</small>';
            }
            break;
    }
}

function applyImageBackground(element, imageUrl, position) {
    switch(position) {
        case 'cover':
            element.style.background = `url('${imageUrl}') center center`;
            element.style.backgroundSize = 'cover';
            element.style.backgroundRepeat = 'no-repeat';
            break;
        case 'contain':
            element.style.background = `url('${imageUrl}') center center`;
            element.style.backgroundSize = 'contain';
            element.style.backgroundRepeat = 'no-repeat';
            break;
        case 'center':
            element.style.background = `url('${imageUrl}') center center`;
            element.style.backgroundSize = 'auto';
            element.style.backgroundRepeat = 'no-repeat';
            break;
        case 'repeat':
            element.style.background = `url('${imageUrl}')`;
            element.style.backgroundSize = 'auto';
            element.style.backgroundRepeat = 'repeat';
            break;
    }
}

// Add spinning animation for loading states
const style = document.createElement('style');
style.textContent = `
    .spin {
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

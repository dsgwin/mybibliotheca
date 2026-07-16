// Extracted from admin/partials/smtp_config.html for browser caching.
// window.SMTP_CONFIG is set by a small inline script before this loads.

document.getElementById('testSmtpBtn').addEventListener('click', async function() {
    const btn = this;
    const resultDiv = document.getElementById('smtpTestResult');
    const form = document.getElementById('smtpConfigForm');
    
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Testing...';
    resultDiv.style.display = 'none';
    
    try {
        const formData = new FormData(form);
        const response = await fetch(window.SMTP_CONFIG.testConnectionUrl, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            resultDiv.className = 'alert alert-success mt-3';
            resultDiv.innerHTML = '<i class="bi bi-check-circle me-1"></i>' + data.message;
        } else {
            resultDiv.className = 'alert alert-danger mt-3';
            resultDiv.innerHTML = '<i class="bi bi-x-circle me-1"></i>' + data.message;
        }
        resultDiv.style.display = 'block';
    } catch (error) {
        resultDiv.className = 'alert alert-danger mt-3';
        resultDiv.innerHTML = '<i class="bi bi-x-circle me-1"></i>Error testing connection: ' + error.message;
        resultDiv.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-check-circle me-1"></i>Test Connection';
    }
});

// Handle form submission via AJAX for inline mode
document.getElementById('smtpConfigForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const form = this;
    const btn = form.querySelector('button[type="submit"]');
    
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Saving...';
    
    try {
        const formData = new FormData(form);
        const response = await fetch(form.action, {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const alert = document.createElement('div');
            alert.className = 'alert alert-success alert-dismissible fade show mt-3';
            alert.innerHTML = '<i class="bi bi-check-circle me-1"></i>SMTP settings saved successfully! <button type="button" class="btn-close" data-bs-dismiss="alert"></button>';
            form.parentNode.insertBefore(alert, form.nextSibling);
            setTimeout(() => alert.remove(), 3000);
        } else {
            throw new Error('Save failed');
        }
    } catch (error) {
        const alert = document.createElement('div');
        alert.className = 'alert alert-danger alert-dismissible fade show mt-3';
        alert.innerHTML = '<i class="bi bi-x-circle me-1"></i>Error saving settings. Please try again. <button type="button" class="btn-close" data-bs-dismiss="alert"></button>';
        form.parentNode.insertBefore(alert, form.nextSibling);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-save me-1"></i>Save SMTP Settings';
    }
});

// Extracted from app/templates/admin/partials/backup_config.html for browser caching.

// Handle form submission via AJAX for inline mode
document.getElementById('backupConfigForm').addEventListener('submit', async function(e) {
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
            alert.innerHTML = '<i class="bi bi-check-circle me-1"></i>Backup settings saved successfully! <button type="button" class="btn-close" data-bs-dismiss="alert"></button>';
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
        btn.innerHTML = '<i class="bi bi-save me-1"></i>Save Backup Settings';
    }
});

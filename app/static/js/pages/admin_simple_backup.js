// Extracted from admin/simple_backup.html for browser caching.
// window.BACKUP_CONFIG is set by a small inline script before this loads.

// Confirmation functions
function confirmRestore(backupId, backupName) {
    if (confirm(`Are you sure you want to restore backup "${backupName}"?\n\nThis will:\n- Stop the current database\n- Replace all current data\n- Restart with the backup data\n\nThis action cannot be undone!`)) {
        const form = document.createElement('form');
        form.method = 'post';
        form.action = window.BACKUP_CONFIG.restoreBackupUrlTemplate.replace('BACKUP_ID', backupId);
        
        // Add CSRF token
        const csrfToken = document.createElement('input');
        csrfToken.type = 'hidden';
        csrfToken.name = 'csrf_token';
        csrfToken.value = window.BACKUP_CONFIG.csrfToken;
        form.appendChild(csrfToken);
        
        // Add confirmation field
        const confirmField = document.createElement('input');
        confirmField.type = 'hidden';
        confirmField.name = 'confirm';
        confirmField.value = 'yes';
        form.appendChild(confirmField);
        
        document.body.appendChild(form);
        form.submit();
    }
}

function confirmDelete(backupId, backupName) {
    if (confirm(`Are you sure you want to delete backup "${backupName}"?\n\nThis action cannot be undone!`)) {
        const form = document.getElementById('deleteForm');
        form.action = window.BACKUP_CONFIG.deleteBackupUrlTemplate.replace('BACKUP_ID', backupId);
        
        // Ensure CSRF token is present
        if (!form.querySelector('input[name="csrf_token"]')) {
            const csrfToken = document.createElement('input');
            csrfToken.type = 'hidden';
            csrfToken.name = 'csrf_token';
            csrfToken.value = window.BACKUP_CONFIG.csrfToken;
            form.appendChild(csrfToken);
        }
        
        form.submit();
    }
}

// Auto-refresh stats every 30 seconds
setInterval(() => {
    fetch(window.BACKUP_CONFIG.apiBackupStatsUrl)
        .then(response => response.json())
        .then(data => {
            // Update stats if needed
            console.log('Stats refreshed:', data);
        })
        .catch(error => console.error('Error refreshing stats:', error));
}, 30000);

// Backup settings form submission
document.getElementById('backupSettingsForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const el = document.getElementById('settingsFeedback');
    // Safely show saving message
    const savingSpan = document.createElement('span');
    savingSpan.className = 'text-info';
    const savingIcon = document.createElement('i');
    savingIcon.className = 'bi bi-hourglass-split me-1';
    savingSpan.appendChild(savingIcon);
    savingSpan.appendChild(document.createTextNode('Saving...'));
    el.innerHTML = '';
    el.appendChild(savingSpan);
    
    const payload = {
        enabled: document.getElementById('enabledToggle').checked,
        retention_days: parseInt(document.getElementById('retentionDays').value, 10),
        scheduled_hour: parseInt(document.getElementById('scheduledHour').value, 10),
        scheduled_minute: parseInt(document.getElementById('scheduledMinute').value, 10),
        frequency: document.getElementById('frequency').value
    };
    
    fetch(window.BACKUP_CONFIG.apiBackupSettingsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(r => {
        if (!r.ok) {
            return r.json().then(err => {
                throw new Error(err.error || 'Save failed');
            });
        }
        return r.json();
    })
    .then(data => {
        if (data.status === 'ok') {
            // Safely construct the message using textContent to prevent XSS
            const successSpan = document.createElement('span');
            successSpan.className = 'text-success';
            const icon = document.createElement('i');
            icon.className = 'bi bi-check-circle me-1';
            successSpan.appendChild(icon);
            const changedKeys = Object.keys(data.changed).join(', ');
            successSpan.appendChild(document.createTextNode('Settings saved successfully! Changes: ' + changedKeys));
            el.innerHTML = '';
            el.appendChild(successSpan);
            
            // Update form with confirmed values from server
            if (data.settings) {
                document.getElementById('enabledToggle').checked = data.settings.enabled;
                document.getElementById('retentionDays').value = data.settings.retention_days;
                document.getElementById('scheduledHour').value = data.settings.scheduled_hour;
                document.getElementById('scheduledMinute').value = data.settings.scheduled_minute;
                document.getElementById('frequency').value = data.settings.frequency;
            }
        } else {
            // Safely construct error message
            const errorSpan = document.createElement('span');
            errorSpan.className = 'text-danger';
            const icon = document.createElement('i');
            icon.className = 'bi bi-exclamation-triangle me-1';
            errorSpan.appendChild(icon);
            errorSpan.appendChild(document.createTextNode(data.error || 'Save failed'));
            el.innerHTML = '';
            el.appendChild(errorSpan);
        }
    })
    .catch(err => {
        // Safely construct error message
        const errorSpan = document.createElement('span');
        errorSpan.className = 'text-danger';
        const icon = document.createElement('i');
        icon.className = 'bi bi-exclamation-triangle me-1';
        errorSpan.appendChild(icon);
        errorSpan.appendChild(document.createTextNode('Error: ' + err.message));
        el.innerHTML = '';
        el.appendChild(errorSpan);
        console.error('Backup settings save error:', err);
    });
});

// Extracted from settings/partials/data_backup_manager.html for browser caching.
// window.DATA_BACKUP_CONFIG is set by a small inline script before this loads.

function refreshBackupPanel(){
  const container = document.getElementById('dataDynamicContainer');
  if(!container) return;
  fetch(window.DATA_BACKUP_CONFIG.settingsDataPartialUrl)
    .then(r=>r.text())
    .then(html=> container.innerHTML = html)
    .catch(()=>{
      const m=document.getElementById('backupInlineMessages');
      if(m) m.innerHTML='<div class="alert alert-danger py-1 mb-2 small">Failed to refresh backups.</div>';
    });
}
function confirmRestore(id,name){
  if(!confirm('Restore backup "'+name+'"? This replaces all current data.')) return;
  const form = new FormData();
  form.append('csrf_token', window.DATA_BACKUP_CONFIG.csrfToken);
  form.append('confirm','yes');
  fetch(window.DATA_BACKUP_CONFIG.restoreBackupUrlTemplate.replace('__ID__',id), {method:'POST', body:form, headers:{'X-Requested-With':'XMLHttpRequest'}})
    .then(r=>r.text())
    .then(()=>{ const m=document.getElementById('backupInlineMessages'); if(m) m.innerHTML='<div class="alert alert-warning py-1 mb-2 small">Restore initiated. Page may reload after completion.</div>'; refreshBackupPanel(); })
    .catch(()=>{ const m=document.getElementById('backupInlineMessages'); if(m) m.innerHTML='<div class="alert alert-danger py-1 mb-2 small">Restore failed.</div>'; });
}
function confirmDelete(id,name){
  if(!confirm('Delete backup "'+name+'"?')) return;
  const form = new FormData();
  form.append('csrf_token', window.DATA_BACKUP_CONFIG.csrfToken);
  fetch(window.DATA_BACKUP_CONFIG.deleteBackupUrlTemplate.replace('__ID__',id), {method:'POST', body:form, headers:{'X-Requested-With':'XMLHttpRequest'}})
    .then(r=>r.text())
    .then(()=>{ const m=document.getElementById('backupInlineMessages'); if(m) m.innerHTML='<div class="alert alert-success py-1 mb-2 small">Backup deleted.</div>'; refreshBackupPanel(); })
    .catch(()=>{ const m=document.getElementById('backupInlineMessages'); if(m) m.innerHTML='<div class="alert alert-danger py-1 mb-2 small">Delete failed.</div>'; });
}
var settingsForm = document.getElementById('backupSettingsForm');
if(settingsForm){
  settingsForm.addEventListener('submit', function(e){
    e.preventDefault();
    var fb = document.getElementById('settingsFeedback');
    if(fb) {
      // Safely show saving message
      var savingSpan = document.createElement('span');
      savingSpan.className = 'text-info';
      var savingIcon = document.createElement('i');
      savingIcon.className = 'bi bi-hourglass-split me-1';
      savingSpan.appendChild(savingIcon);
      savingSpan.appendChild(document.createTextNode('Saving...'));
      fb.innerHTML = '';
      fb.appendChild(savingSpan);
    }
    
    var payload = {
      enabled: document.getElementById('enabledToggle').checked,
      retention_days: parseInt(document.getElementById('retentionDays').value,10),
      scheduled_hour: parseInt(document.getElementById('scheduledHour').value,10),
      scheduled_minute: parseInt(document.getElementById('scheduledMinute').value,10),
      frequency: document.getElementById('frequency').value
    };
  fetch(window.DATA_BACKUP_CONFIG.apiBackupSettingsUrl, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    }).then(r=>{
      if(!r.ok) {
        return r.json().then(err=>{ throw new Error(err.error||'Save failed'); });
      }
      return r.json();
    }).then(d=>{
      if(!fb) return;
      if(d.status==='ok') {
        // Safely construct the message to prevent XSS
        var successSpan = document.createElement('span');
        successSpan.className = 'text-success';
        var icon = document.createElement('i');
        icon.className = 'bi bi-check-circle me-1';
        successSpan.appendChild(icon);
        var changedKeys = Object.keys(d.changed).join(', ');
        successSpan.appendChild(document.createTextNode('Saved: ' + changedKeys));
        fb.innerHTML = '';
        fb.appendChild(successSpan);
        
        // Update form with confirmed values from server
        if(d.settings){
          document.getElementById('enabledToggle').checked = d.settings.enabled;
          document.getElementById('retentionDays').value = d.settings.retention_days;
          document.getElementById('scheduledHour').value = d.settings.scheduled_hour;
          document.getElementById('scheduledMinute').value = d.settings.scheduled_minute;
          document.getElementById('frequency').value = d.settings.frequency;
        }
      }
      else {
        // Safely construct error message
        var errorSpan = document.createElement('span');
        errorSpan.className = 'text-danger';
        errorSpan.appendChild(document.createTextNode(d.error||'Failed'));
        fb.innerHTML = '';
        fb.appendChild(errorSpan);
      }
    }).catch(err=>{
      if(fb) {
        // Safely construct error message
        var errorSpan = document.createElement('span');
        errorSpan.className = 'text-danger';
        var icon = document.createElement('i');
        icon.className = 'bi bi-exclamation-triangle me-1';
        errorSpan.appendChild(icon);
        errorSpan.appendChild(document.createTextNode(err.message));
        fb.innerHTML = '';
        fb.appendChild(errorSpan);
      }
      console.error('Backup settings error:',err);
    });
  });
}
// Inline create backup form submission
const createForm = document.getElementById('createBackupInlineForm');
if(createForm){
  createForm.addEventListener('submit', function(e){
    e.preventDefault();
    const fd = new FormData(createForm);
    fetch(createForm.action, {method:'POST', body:fd, headers:{'X-Requested-With':'XMLHttpRequest'}})
      .then(r=>r.text())
      .then(()=>{ const m=document.getElementById('backupInlineMessages'); if(m) m.innerHTML='<div class="alert alert-success py-1 mb-2 small">Backup created.</div>'; refreshBackupPanel(); })
      .catch(()=>{ const m=document.getElementById('backupInlineMessages'); if(m) m.innerHTML='<div class="alert alert-danger py-1 mb-2 small">Create failed.</div>'; });
    const modalEl=document.getElementById('createBackupModal');
    if(modalEl){ try { const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl); modal.hide(); } catch(err){} }
  });
}

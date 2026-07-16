// Extracted from settings/partials/server_audiobookshelf.html for browser caching.
// window.ABS_CONFIG is set by a small inline script before this loads.

(function(){
  const root = document.currentScript && document.currentScript.parentElement || document;
  const form = root.querySelector('#absSettingsForm');
  const status = root.querySelector('#absStatus');
  const testBtn = root.querySelector('#absTestBtn');
  const syncTestBtn = root.querySelector('#absSyncTestBtn');
  const listenTestBtn = root.querySelector('#absListenTestBtn');
  const fullSyncBtn = root.querySelector('#absFullSyncBtn');
  const schedForm = root.querySelector('#absSchedulerForm');
  const schedStatus = root.querySelector('#absSchedulerStatus');
  if (form) {
    form.addEventListener('submit', function(ev){
      ev.preventDefault();
      status.textContent = 'Saving...';
      const fd = new FormData(form);
      fetch(form.action, {
        method: 'POST',
        body: fd,
        credentials: 'same-origin',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      })
        .then(r => r.text())
        .then(html => { document.getElementById('serverDynamicContainer').innerHTML = html; })
        .catch(() => { status.textContent = 'Save failed'; });
    });
  }
  if (schedForm) {
    schedForm.addEventListener('submit', function(ev){
      ev.preventDefault();
      if (schedStatus) schedStatus.textContent = 'Saving scheduler...';
      const fd = new FormData(schedForm);
      // Normalize boolean
      if (!fd.get('auto_sync_enabled')) fd.set('auto_sync_enabled', '');
      fetch(schedForm.action, {
        method:'POST',
        body: fd,
        credentials:'same-origin',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      })
        .then(r=>r.text())
        .then(html=>{
          document.getElementById('serverDynamicContainer').innerHTML = html;
        })
        .catch(()=>{ if(schedStatus) schedStatus.textContent = 'Save failed'; });
    });
  }
  if (testBtn) {
    testBtn.addEventListener('click', function(){
      status.textContent = 'Testing...';
      const csrfMeta = document.querySelector('meta[name="csrf-token"]');
      const headers = {};
      if (csrfMeta && csrfMeta.content) headers['X-CSRFToken'] = csrfMeta.content;
      fetch(window.ABS_CONFIG.testConnectionUrl, { method: 'POST', credentials: 'same-origin', headers })
        .then(r => r.json())
        .then(j => {
          status.textContent = (j.ok ? 'OK: ' : 'Fail: ') + (j.message || '');
          // Reload panel with ?test=1 to show libraries list
          fetch(window.ABS_CONFIG.serverPartialTestUrl, { credentials: 'same-origin' })
            .then(r => r.text()).then(html => { document.getElementById('serverDynamicContainer').innerHTML = html; });
        })
        .catch(() => { status.textContent = 'Test failed'; });
    });
  }
  // Helper: start inline progress polling
  function startInlineProgressPolling(taskInfo){
    try { if (window.__absProgressPoll) { clearInterval(window.__absProgressPoll); } } catch(e){}
    if (!taskInfo || !taskInfo.api_progress_url) return;
    const startedAt = Date.now();
    window.__absProgressPoll = setInterval(async () => {
      try {
        const r = await fetch(taskInfo.api_progress_url, { credentials: 'same-origin' });
        if (!r.ok) return;
        const j = await r.json();
        const processed = j.processed || 0;
        const total = j.total || j.total_books || 0;
        const st = (j.status || '').toLowerCase();
        if (status) {
          const pct = total > 0 ? Math.min(100, Math.round((processed/total)*100)) : 0;
          let line = `Running: ${processed}/${total}${total?` (${pct}%)`:''}. `;
          if (taskInfo.progress_url) {
            line += `<a href="${taskInfo.progress_url}" class="link-primary">View progress</a>`;
          }
          status.innerHTML = line;
        }
        if (st === 'completed' || st === 'failed' || (total > 0 && processed >= total)) {
          clearInterval(window.__absProgressPoll);
          if (status) {
            const doneLine = `${st === 'failed' ? 'Failed' : 'Completed'}: ${processed}/${total}.` + (taskInfo.progress_url?` <a href="${taskInfo.progress_url}" class="link-primary">Details</a>`:'');
            status.innerHTML = doneLine;
          }
        }
        // Safety: stop polling after 15 minutes
        if (Date.now() - startedAt > 15*60*1000) {
          clearInterval(window.__absProgressPoll);
        }
      } catch(e) {
        // Ignore transient errors
      }
    }, 1500);
  }
  if (syncTestBtn) {
    syncTestBtn.addEventListener('click', async function(){
      status.textContent = 'Starting test sync...';
      const csrfMeta = document.querySelector('meta[name="csrf-token"]');
      const headers = {'Content-Type':'application/json'};
      if (csrfMeta && csrfMeta.content) headers['X-CSRFToken'] = csrfMeta.content;
      try {
        const resp = await fetch(window.ABS_CONFIG.testSyncUrl, {method:'POST', headers, credentials:'same-origin', body: JSON.stringify({limit:5})});
        const j = await resp.json();
        if(j.ok){
          // Begin inline polling immediately so progress starts updating even before navigation
          try { startInlineProgressPolling(j); } catch(e) {}
          const to = j.progress_url || j.api_progress_url || '#';
          if (to && to !== '#') {
            // Small delay so the status line updates before redirect
            setTimeout(()=>{ window.location.assign(to); }, 150);
          } else {
            status.innerHTML = 'Sync started. <a href="'+ (j.progress_url||'#') +'" class="link-primary">View progress</a>';
          }
        } else {
          status.textContent = 'Failed: ' + (j.message||'');
        }
      } catch(e){
        status.textContent = 'Failed to start test sync';
      }
    });
  }
  if (fullSyncBtn) {
    fullSyncBtn.addEventListener('click', async function(){
      status.textContent = 'Starting full sync...';
      const csrfMeta = document.querySelector('meta[name="csrf-token"]');
      const headers = {'Content-Type':'application/json'};
      if (csrfMeta && csrfMeta.content) headers['X-CSRFToken'] = csrfMeta.content;
      try {
        const resp = await fetch(window.ABS_CONFIG.fullSyncUrl, {method:'POST', headers, credentials:'same-origin'});
        const j = await resp.json();
        if(j.ok){
          const queued = j.queued || (j.task_ids ? j.task_ids.length : 0);
          // Show queued count immediately
          status.textContent = `Queued ${queued} user job${queued===1?'':'s'}...`;
          // If we got progress URLs for the first task, start polling and optionally navigate
          if (j.api_progress_url) {
            try { startInlineProgressPolling(j); } catch(e) {}
            setTimeout(()=>{ window.location.assign(j.progress_url); }, 200);
          }
        } else {
          status.textContent = 'Failed: ' + (j.message||'');
        }
      } catch(e){
        status.textContent = 'Failed to start full sync';
      }
    });
  }
  async function startListenTest(){
    if (status) status.textContent = 'Starting listening-only test...';
    const csrf = (document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || document.querySelector('input[name="csrf_token"]')?.value || '').trim();
    const headers = {'Content-Type':'application/json'};
    if (csrf) headers['X-CSRFToken'] = csrf;
    try {
      const resp = await fetch(window.ABS_CONFIG.listenTestUrl, {method:'POST', headers, credentials:'same-origin', body: JSON.stringify({page_size: 200})});
      const j = await resp.json();
      if(j.ok){
        try { startInlineProgressPolling(j); } catch(e) {}
        const to = j.progress_url || j.api_progress_url || '#';
        if (to && to !== '#') {
          setTimeout(()=>{ window.location.assign(to); }, 150);
        } else if (status) {
          status.innerHTML = 'Listening sync started. <a href="'+ (j.progress_url||'#') +'" class="link-primary">View progress</a>';
        }
      } else if (status) {
        status.textContent = 'Failed: ' + (j.message||j.error||'');
      }
    } catch(e){
      if (status) status.textContent = 'Failed to start listening-only test';
    }
  }
  if (listenTestBtn) {
    listenTestBtn.addEventListener('click', startListenTest);
  }
  // Event delegation fallback in case the panel re-renders
  root.addEventListener('click', function(e){
    const t = e.target && e.target.closest && e.target.closest('#absListenTestBtn');
    if (t) {
      e.preventDefault();
      startListenTest();
    }
  });
})();

// Extracted from settings/partials/server_jobs.html for browser caching.
// window.SERVER_JOBS_CONFIG is set by a small inline script before this loads.

(function(){
  const container = document.currentScript.closest('.card').parentElement;
  const bodyEl = container.querySelector('#jobsTableBody');
  const btn = container.querySelector('#refreshJobsBtn');
  const auto = container.querySelector('#autoRefreshJobs');
  const stamp = container.querySelector('#jobsLastRefreshed');
  const partialUrl = window.SERVER_JOBS_CONFIG.partialUrl;
  const csrfToken = (document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || document.querySelector('input[name="csrf_token"]').value || '').trim();

  function refresh(){
    fetch(partialUrl, { credentials: 'same-origin' })
      .then(r=> r.text())
      .then(html=>{
        // Replace entire card to ensure updated stats and rows
        document.getElementById('serverDynamicContainer').innerHTML = html;
      })
      .catch(()=>{});
    try{ stamp.textContent = 'Updated ' + new Date().toLocaleTimeString(); }catch(e){}
  }
  // Apply progress widths from data attributes
  function applyWidths(root){
    const bars = (root||document).querySelectorAll('.progress-bar[data-pct]');
    bars.forEach(b=>{
      const pct = parseInt(b.getAttribute('data-pct')||'0',10);
      b.style.width = (isFinite(pct)?Math.max(0,Math.min(100,pct)):0) + '%';
    });
  }
  applyWidths(container);
  // If runner is stopped, prompt a refresh hint
  try{
    const stopped = window.SERVER_JOBS_CONFIG.absRunnerStopped;
    if(stopped){
      const note = document.createElement('div');
      note.className = 'alert alert-warning py-2 small mt-2';
      note.innerHTML = '<i class="bi bi-exclamation-triangle me-1"></i> The ABS runner appears stopped. Triggering a Full Sync or Test Sync should auto-start it. You can also refresh this panel.';
      container.prepend(note);
    }
  }catch(e){}
  if(btn){ btn.addEventListener('click', refresh); }
  // Wire cancel buttons
  bodyEl.addEventListener('click', async (ev)=>{
    const btn = ev.target.closest('.btn-cancel-job');
    if(!btn) return;
    const taskId = btn.getAttribute('data-task-id');
    if(!taskId) return;
    btn.disabled = true;
    try{
      await fetch(window.SERVER_JOBS_CONFIG.apiImportCancelUrlTemplate.replace('__TASK__', taskId), {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'X-CSRFToken': csrfToken
        }
      });
    }catch(e){}
    // Give workers a moment to flip state, then refresh
    setTimeout(refresh, 400);
  });
  let timer = null;
  function ensureTimer(){
    if(auto && auto.checked){
      if(timer) clearInterval(timer);
      timer = setInterval(refresh, 2500);
    } else if(timer){
      clearInterval(timer); timer = null;
    }
  }
  if(auto){ auto.addEventListener('change', ensureTimer); ensureTimer(); }
})();

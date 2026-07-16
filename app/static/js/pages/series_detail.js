// Extracted from series/series_detail.html for browser caching.
// window.SERIES_DETAIL_CONFIG is set by a small inline script before this loads.

(function(){
  console.debug('[Series Detail] enhancement script executing');
  // Title now spans full width so columns naturally align; no JS offset needed
  const applySorting = document.getElementById('applySortingBtn');
  if(applySorting){
    applySorting.addEventListener('click', () => {
      const form = document.getElementById('sortingForm');
      const fd = new FormData(form);
      const val = fd.get('order');
      const url = new URL(window.location.href);
      if(val){ url.searchParams.set('order', val); } else { url.searchParams.delete('order'); }
      window.location = url.toString();
    });
  }
  const uploadBtn = document.getElementById('uploadCoverSubmit');
  const form = document.getElementById('seriesCoverUploadForm');
  const errorBox = document.getElementById('coverUploadError');
  const clearBtn = document.getElementById('clearCoverBtn');
  const deleteBtn = document.getElementById('deleteSeriesBtn');
  const coverImg = document.getElementById('series-cover');
  const fallback = document.getElementById('series-cover-fallback');
  const seriesId = window.SERIES_DETAIL_CONFIG.seriesId;

  function showError(msg){
    if(!errorBox) return;
    errorBox.textContent = msg;
    errorBox.classList.remove('d-none');
  }

  if(uploadBtn){
    uploadBtn.addEventListener('click', async () => {
      errorBox.classList.add('d-none');
      const fd = new FormData(form);
      // Ensure CSRF token present (fallback if global injector missed)
      if(!fd.get('csrf_token') && window.csrfToken){ fd.append('csrf_token', window.csrfToken); }
      try {
        const resp = await fetch(`/series/${seriesId}/upload_cover`, {method:'POST', body: fd});
        const data = await resp.json();
        if(!data.success){
          showError(data.error || 'Upload failed');
          return;
        }
        if(coverImg){
          coverImg.src = data.cover_url + '?v=' + Date.now();
        } else if(fallback){
          const img = document.createElement('img');
          img.id = 'series-cover';
            img.className = 'img-fluid';
            img.alt = 'Series cover';
            img.src = data.cover_url;
            fallback.parentNode.replaceChild(img, fallback);
        }
        const modalEl = document.getElementById('uploadCoverModal');
        if(modalEl){
          // If using native dialog
          if(modalEl.nodeName === 'DIALOG' && typeof modalEl.close === 'function'){
            modalEl.close();
          } else if(window.bootstrap && window.bootstrap.Modal){
            let m = bootstrap.Modal.getInstance(modalEl);
            if(!m) m = new bootstrap.Modal(modalEl);
            m.hide();
          } else {
            modalEl.classList.remove('show');
            modalEl.style.display='none';
          }
        }
      } catch(e){
        showError('Unexpected error');
      }
    });
  }

  if(clearBtn){
    console.debug('[SeriesDetail][Bind] clearCoverBtn found, attaching handler');
    clearBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.debug('[SeriesDetail][ClearCover] click start');
      if(!confirm('Remove custom cover and revert to default?')) { console.debug('[SeriesDetail][ClearCover] user cancelled'); return; }
      try {
        clearBtn.disabled = true;
        const headers = { 'X-Requested-With': 'XMLHttpRequest' };
        if(window.csrfToken){ headers['X-CSRFToken'] = window.csrfToken; }
        console.debug('[SeriesDetail][ClearCover] sending fetch to clear_cover', {seriesId});
        const resp = await fetch(`/series/${seriesId}/clear_cover`, {method:'POST', headers});
        console.debug('[SeriesDetail][ClearCover] response status', resp.status);
        let data = {};
        try { data = await resp.json(); } catch(parseErr){ console.warn('[SeriesDetail][ClearCover] failed parse JSON', parseErr); }
        console.debug('[SeriesDetail][ClearCover] response JSON', data);
        if(data.success){
          // Server now returns fallback (first-book) cover_url if present
          if(data.cover_url){
            if(coverImg){
              coverImg.src = data.cover_url + '?v=' + Date.now();
            } else if(fallback){
              const img = document.createElement('img');
              img.id = 'series-cover';
              img.className = 'img-fluid';
              img.alt = 'Series cover';
              img.src = data.cover_url;
              fallback.parentNode.replaceChild(img, fallback);
            }
          } else {
            // No fallback available -> show text label
            if(coverImg){
              const span = document.createElement('span');
              span.id = 'series-cover-fallback';
              span.className = 'text-muted small text-center px-2';
              span.textContent = window.SERIES_DETAIL_CONFIG.seriesName;
              coverImg.parentNode.replaceChild(span, coverImg);
            }
          }
        } else {
          alert((data && data.error) || 'Failed to clear cover');
        }
      } catch(e){
        console.error('[SeriesDetail][ClearCover] network/error', e);
        alert('Error clearing cover');
      } finally {
        clearBtn.disabled = false;
      }
    }, {capture:true});
  } else {
    console.warn('[SeriesDetail] clearCoverBtn NOT FOUND at script load');
  }

  if(deleteBtn){
    deleteBtn.addEventListener('click', async () => {
      const warn = 'Delete this series?\n\nThis will detach all books from the series and permanently remove the series record. Books remain unchanged.';
      if(!confirm(warn)) return;
      try {
        deleteBtn.disabled = true;
        const resp = await fetch(`/series/${seriesId}/delete`, {method:'POST'});
        const data = await resp.json();
        if(data.success){
            window.location = data.redirect || '/series/';
        } else {
            alert(data.error || 'Failed to delete series');
        }
      } catch(e){
        alert('Error deleting series');
      } finally {
        deleteBtn.disabled = false;
      }
    });
  }

  // Manual modal fallback for buttons if data API not working
  // Native dialog open / close
  document.querySelectorAll('.series-modal-btn[data-target]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      const sel = btn.getAttribute('data-target');
      const dlg = document.querySelector(sel);
      if(dlg && typeof dlg.showModal === 'function') { try { dlg.showModal(); } catch(_) { dlg.setAttribute('open',''); } }
    });
  });
  document.addEventListener('click', e => {
    if(e.target.matches('[data-close]')){
      const dlg = e.target.closest('dialog');
      if(dlg) dlg.close();
    }
  });
  // Focus trap & ESC support
  function trapFocus(dlg){
    const sel = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
    const focusables = Array.from(dlg.querySelectorAll(sel)).filter(el=>!el.hasAttribute('disabled'));
    if(!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length-1];
    function handler(e){
      if(e.key === 'Tab'){
        if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
        else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
      } else if(e.key === 'Escape'){ dlg.close(); }
    }
    dlg.addEventListener('keydown', handler);
    setTimeout(()=>first.focus(), 15);
  }
  // Polyfill showModal if missing
  if(!HTMLDialogElement.prototype.showModal){
    HTMLDialogElement.prototype.showModal = function(){ this.setAttribute('open',''); trapFocus(this); };
    HTMLDialogElement.prototype.close = function(ret){ this.removeAttribute('open'); this.returnValue = ret || ''; };
  } else {
    const nativeShow = HTMLDialogElement.prototype.showModal;
    HTMLDialogElement.prototype.showModal = function(){ nativeShow.call(this); trapFocus(this); };
  }
  // --- AJAX form submissions for description & notes ---
  function ajaxifyModalForm(modalId, viewSelector, fieldName){
    const dlg = document.getElementById(modalId);
    if(!dlg) return;
    const form = dlg.querySelector('form');
    if(!form) return;
    form.addEventListener('submit', async (e)=>{
      // If form method standard submit (not intercepted) it would reload; intercept to AJAX
      e.preventDefault();
      const fd = new FormData(form);
      const value = fd.get(fieldName) || '';
      try {
        const resp = await fetch(form.action, { method:'POST', body: fd, headers: { 'X-Requested-With':'XMLHttpRequest' }});
        const data = await resp.json();
        if(data.success){
          const viewEl = document.querySelector(viewSelector);
            if(viewEl){
              viewEl.textContent = (data[fieldName] || '').trim() || (fieldName==='description' ? 'No description added.' : 'No notes yet.');
            }
            dlg.close();
        } else {
          alert(data.error || 'Update failed');
        }
      } catch(err){
        alert('Network error updating');
      }
    });
  }
  ajaxifyModalForm('editDescriptionModal', '#series-description-view', 'description');
  ajaxifyModalForm('editNotesModal', '#series-notes-view', 'notes');

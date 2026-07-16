// Extracted from app/templates/admin/partials/server_config.html for browser caching.

(function(){
  const typeSel = document.getElementById('bgType');
  const toggleScope = typeSel ? (typeSel.closest('form') || document) : document;
  function sync(){
    if(!typeSel) return;
    const type = typeSel.value;
    toggleScope.querySelectorAll('[data-bg]').forEach(el=>{
      const match = el.getAttribute('data-bg')===type;
      el.style.display = match ? '' : 'none';
      if(match && type==='gradient'){
        el.style.display = 'flex';
      }
    });
  }
  if(typeSel && !typeSel.dataset.bgBoundLegacy){
    typeSel.addEventListener('change', sync);
    typeSel.dataset.bgBoundLegacy = '1';
  }
  sync();
  if(typeof window.ensureServerConfigBindings === 'function'){
    try { window.ensureServerConfigBindings(); } catch(_) {}
  }
})();

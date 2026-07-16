// Extracted from settings/partials/server_users_full.html for browser caching.
// window.SERVER_USERS_CONFIG is set by a small inline script before this loads.

function loadServerUsersFull(search){
  const container = document.getElementById('serverDynamicContainer');
  if(!container) return;
  const url = new URL(window.SERVER_USERS_CONFIG.usersPartialUrl, window.location.origin);
  if(search) url.searchParams.set('search', search);
  container.innerHTML = '<div class="text-muted small p-3">Loading...</div>';
  fetch(url.toString())
    .then(r=>r.text())
    .then(html=> container.innerHTML = html)
    .catch(()=> container.innerHTML = '<div class="text-danger small p-3">Failed to load users.</div>');
}
function editUserInline(uid){
  const container = document.getElementById('serverDynamicContainer');
  if(!container) return;
  const url = `${window.SERVER_USERS_CONFIG.userEditPartialUrl}?user_id=${encodeURIComponent(uid)}`;
  container.innerHTML = '<div class="text-muted small p-3">Loading editor...</div>';
  fetch(url, {credentials:'same-origin'})
    .then(r=>{ if(!r.ok) throw new Error(r.status); return r.text(); })
    .then(html=> container.innerHTML = html)
    .catch(err=> container.innerHTML = '<div class="text-danger small p-3">Failed to load editor ('+err+').</div>');
}

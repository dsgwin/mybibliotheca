// Extracted from auth/privacy_settings.html for browser caching.
// window.PRIVACY_SETTINGS_CONFIG is set by a small inline script before this loads.

// Update current time every minute
function updateCurrentTime() {
    const timeElement = document.getElementById('current-time');
    if (timeElement) {
        const now = new Date();
        const timeString = now.toLocaleString('en-US', {
            timeZone: window.PRIVACY_SETTINGS_CONFIG.timezoneName,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZoneName: 'short'
        });
        timeElement.textContent = timeString;
    }
}

// Update time immediately and then every 30 seconds
updateCurrentTime();
setInterval(updateCurrentTime, 30000);

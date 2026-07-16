// Extracted from onboarding/import_splash.html for browser caching.
// window.IMPORT_SPLASH_CONFIG is set by a small inline script before this loads.

// Auto-check for completion and redirect
let checkInterval;
let maxWaitTime = 60000; // 1 minute max wait
let checkStartTime = Date.now();

function checkImportStatus() {
    // Check if we've been waiting too long
    if (Date.now() - checkStartTime > maxWaitTime) {
        console.log('Max wait time reached, redirecting to library');
        clearInterval(checkInterval);
        window.location.href = '/library';
        return;
    }
    
    fetch(`${window.IMPORT_SPLASH_CONFIG.progressJsonBaseUrl}${window.IMPORT_SPLASH_CONFIG.taskId}`)
        .then(response => {
            // If we get a redirect response, it means onboarding is complete
            if (response.redirected || response.status === 302) {
                console.log('Received redirect - onboarding complete, redirecting to library');
                clearInterval(checkInterval);
                window.location.href = '/library';
                return;
            }
            return response.json();
        })
        .then(data => {
            if (!data) return; // Skip if no data (redirect case)
            
            console.log('Import status:', data);
            
            // Check if import is complete
            if (data.status === 'completed' || data.status === 'success') {
                console.log('Import completed, redirecting to library');
                clearInterval(checkInterval);
                
                // Short delay for user to see completion, then redirect
                setTimeout(() => {
                    window.location.href = '/library';
                }, 2000);
            } else if (data.status === 'failed' || data.status === 'error') {
                console.log('Import failed, redirecting to library anyway');
                clearInterval(checkInterval);
                
                // Even if import failed, redirect to library (user account was created)
                setTimeout(() => {
                    window.location.href = '/library';
                }, 3000);
            }
            // If status is still 'pending' or 'running', keep checking
        })
        .catch(error => {
            console.log('Error checking import status:', error);
            // If we get a 401 or 403, user might be logged in and redirected
            if (error.status === 401 || error.status === 403) {
                console.log('Authentication error - redirecting to library');
                clearInterval(checkInterval);
                window.location.href = '/library';
                return;
            }
            // Continue checking - network errors happen
        });
}

// Start checking import status every 2 seconds
checkInterval = setInterval(checkImportStatus, 2000);

// Initial check after 1 second
setTimeout(checkImportStatus, 1000);

// Fallback: redirect to library after 2 minutes no matter what
setTimeout(() => {
    console.log('Fallback timeout reached, redirecting to library');
    clearInterval(checkInterval);
    window.location.href = '/library';
}, 120000); // 2 minutes

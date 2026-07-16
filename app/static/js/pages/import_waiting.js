// Extracted from import_waiting.html for browser caching.
// window.IMPORT_WAITING_CONFIG is set by a small inline script before this loads.

// Auto-check for completion and redirect
let checkInterval;
let maxWaitTime = 300000; // 5 minutes max wait
let checkStartTime = Date.now();

function checkImportStatus() {
    // Check if we've been waiting too long
    if (Date.now() - checkStartTime > maxWaitTime) {
        console.log('Max wait time reached, redirecting to library');
        clearInterval(checkInterval);
        window.location.href = window.IMPORT_WAITING_CONFIG.libraryUrl;
        return;
    }
    
    fetch(`${window.IMPORT_WAITING_CONFIG.apiProgressBaseUrl}${task_id}`)
        .then(response => response.json())
        .then(data => {
            console.log('Import status:', data);
            
            // Check if import is complete
            if (data.status === 'completed' || data.status === 'success') {
                console.log('Import completed, redirecting to library');
                clearInterval(checkInterval);
                
                // Show success message and redirect
                document.querySelector('.card-title').textContent = 'Import Complete!';
                document.querySelector('.card-text').innerHTML = 
                    `✅ Successfully imported ${data.success || 0} books from your ${window.IMPORT_WAITING_CONFIG.importType} library!`;
                document.querySelector('.spinner').style.display = 'none';
                document.querySelector('.pulse').textContent = '🎉 Import Complete!';
                
                setTimeout(() => {
                    window.location.href = window.IMPORT_WAITING_CONFIG.libraryUrl;
                }, 3000);
            } else if (data.status === 'failed' || data.status === 'error') {
                console.log('Import failed, showing error and redirecting');
                clearInterval(checkInterval);
                
                // Show error message and redirect
                document.querySelector('.card-title').textContent = 'Import Issues';
                document.querySelector('.card-text').innerHTML = 
                    `⚠️ Import completed with some issues. ${data.success || 0} books imported, ${data.errors || 0} errors.`;
                document.querySelector('.spinner').style.display = 'none';
                document.querySelector('.pulse').textContent = '⚠️ Import Complete';
                
                setTimeout(() => {
                    window.location.href = window.IMPORT_WAITING_CONFIG.libraryUrl;
                }, 5000);
            }
            // If status is still 'pending' or 'running', keep checking
        })
        .catch(error => {
            console.log('Error checking import status:', error);
            // Continue checking - network errors happen
        });
}

// Start checking import status every 3 seconds
checkInterval = setInterval(checkImportStatus, 3000);

// Initial check after 2 seconds
setTimeout(checkImportStatus, 2000);

// Fallback: redirect to library after max wait time
setTimeout(() => {
    console.log('Fallback timeout reached, redirecting to library');
    clearInterval(checkInterval);
    window.location.href = window.IMPORT_WAITING_CONFIG.libraryUrl;
}, maxWaitTime + 10000); // 10 seconds after max wait time

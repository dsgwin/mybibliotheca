// Extracted from migrate_sqlite.html for browser caching.
// window.MIGRATE_SQLITE_CONFIG is set by a small inline script before this loads.

document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('sqlite_file');
    const detectionResults = document.getElementById('detectionResults');
    const detectionContent = document.getElementById('detectionContent');
    const migrationOptions = document.getElementById('migrationOptions');
    const adminUserOption = document.getElementById('adminUserOption');
    const submitBtn = document.getElementById('submitBtn');
    
    fileInput.addEventListener('change', function() {
        if (this.files.length > 0) {
            analyzeDatabase(this.files[0]);
        } else {
            hideResults();
        }
    });
    
    function analyzeDatabase(file) {
        const formData = new FormData();
        formData.append('sqlite_file', file);
        
        detectionContent.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing database...';
        detectionResults.style.display = 'block';
        
        fetch(window.MIGRATE_SQLITE_CONFIG.detectSqliteUrl, {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                showError(data.error);
            } else {
                showResults(data);
            }
        })
        .catch(error => {
            showError('Failed to analyze database: ' + error.message);
        });
    }
    
    function showResults(data) {
        let html = '';
        
        if (data.supported) {
            html += '<div class="row">';
            html += '<div class="col-6"><strong>Version:</strong> ' + data.version + '</div>';
            html += '<div class="col-6"><strong>Books:</strong> ' + data.book_count + '</div>';
            html += '</div>';
            
            if (data.user_info) {
                html += '<div class="mt-2">';
                html += '<strong>Admin User:</strong> ' + data.user_info.username + ' (' + data.user_info.email + ')';
                html += '</div>';
                
                // Show admin user option for v1.5
                if (data.version === 'v1.5') {
                    adminUserOption.style.display = 'block';
                }
            }
            
            detectionResults.className = 'alert alert-success';
            migrationOptions.style.display = 'block';
            submitBtn.disabled = false;
        } else {
            html = '<strong>Unsupported database format:</strong> ' + data.version;
            detectionResults.className = 'alert alert-warning';
            migrationOptions.style.display = 'none';
            submitBtn.disabled = true;
        }
        
        detectionContent.innerHTML = html;
    }
    
    function showError(message) {
        detectionContent.innerHTML = '<strong>Error:</strong> ' + message;
        detectionResults.className = 'alert alert-danger';
        migrationOptions.style.display = 'none';
        submitBtn.disabled = true;
    }
    
    function hideResults() {
        detectionResults.style.display = 'none';
        migrationOptions.style.display = 'none';
        adminUserOption.style.display = 'none';
        submitBtn.disabled = true;
    }
});

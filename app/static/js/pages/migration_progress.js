// Extracted from migration/progress.html for browser caching.
// window.MIGRATION_PROGRESS_CONFIG is set by a small inline script before this loads.

let migrationStarted = false;

function addLogEntry(message, type = 'info') {
    const log = document.getElementById('migrationLog');
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    entry.textContent = `${new Date().toLocaleTimeString()} - ${message}`;
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
}

function updateProgress(percent, message) {
    document.getElementById('progressBar').style.width = percent + '%';
    document.getElementById('progressPercent').textContent = percent + '%';
    document.getElementById('statusText').textContent = message;
}

function showResults(results) {
    const resultsDiv = document.getElementById('migrationResults');
    const resultsList = document.getElementById('resultsList');
    
    resultsList.innerHTML = '';
    
    results.forEach(result => {
        const card = document.createElement('div');
        card.className = 'card mb-2';
        
        const cardBody = document.createElement('div');
        cardBody.className = 'card-body py-2';
        
        if (result.success) {
            cardBody.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <i class="fas fa-check-circle text-success me-2"></i>
                        <strong>${result.database}</strong> - Migration successful
                    </div>
                    <div class="text-end small">
                        <div>📚 ${result.books_migrated} books</div>
                        ${result.users_migrated > 0 ? `<div>👥 ${result.users_migrated} users</div>` : ''}
                        ${result.reading_logs_migrated > 0 ? `<div>📖 ${result.reading_logs_migrated} reading logs</div>` : ''}
                    </div>
                </div>
            `;
        } else {
            cardBody.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <i class="fas fa-times-circle text-danger me-2"></i>
                        <strong>${result.database}</strong> - Migration failed
                    </div>
                    <div class="text-danger small">${result.error}</div>
                </div>
            `;
        }
        
        card.appendChild(cardBody);
        resultsList.appendChild(card);
    });
    
    resultsDiv.style.display = 'block';
}

function startMigration() {
    if (migrationStarted) return;
    migrationStarted = true;
    
    addLogEntry('Starting migration process...', 'info');
    updateProgress(10, 'Initializing migration...');
    
    const configFile = window.MIGRATION_PROGRESS_CONFIG.configFile;
    
    fetch(`${window.MIGRATION_PROGRESS_CONFIG.runMigrationBaseUrl}${migration_id}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': window.MIGRATION_PROGRESS_CONFIG.csrfToken
        },
        body: JSON.stringify({
            config_file: configFile
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            addLogEntry('Migration completed successfully!', 'success');
            updateProgress(100, 'Migration completed');
            
            showResults(data.results);
            
            document.getElementById('statusAlert').className = 'alert alert-success';
            document.getElementById('statusAlert').innerHTML = `
                <i class="fas fa-check-circle me-2"></i>
                Migration completed successfully! Migrated ${data.total_migrated} books total.
            `;
            
            document.getElementById('cancelBtn').style.display = 'none';
            document.getElementById('continueBtn').style.display = 'inline-block';
            
            // Auto-redirect to library after 3 seconds
            addLogEntry('Redirecting to your library in 3 seconds...', 'info');
            setTimeout(() => {
                window.location.href = window.MIGRATION_PROGRESS_CONFIG.libraryUrl;
            }, 3000);
            
        } else {
            addLogEntry(`Migration failed: ${data.error}`, 'error');
            updateProgress(0, 'Migration failed');
            
            document.getElementById('statusAlert').className = 'alert alert-danger';
            document.getElementById('statusAlert').innerHTML = `
                <i class="fas fa-times-circle me-2"></i>
                Migration failed: ${data.error}
            `;
        }
    })
    .catch(error => {
        addLogEntry(`Error: ${error.message}`, 'error');
        document.getElementById('statusAlert').className = 'alert alert-danger';
        document.getElementById('statusAlert').innerHTML = `
            <i class="fas fa-times-circle me-2"></i>
            Migration failed due to an error.
        `;
    });
}

function cancelMigration() {
    if (confirm('Are you sure you want to cancel the migration?')) {
        window.location.href = window.MIGRATION_PROGRESS_CONFIG.migrationWizardUrl;
    }
}

// Start migration automatically when page loads
window.addEventListener('load', function() {
    setTimeout(startMigration, 1000);
});

// Extracted from app/templates/migration/admin_databases.html for browser caching.

function showDatabaseDetails(name, analysis) {
    const content = `
        <h6>Database: ${name}</h6>
        <div class="row">
            <div class="col-md-6">
                <h7>Statistics:</h7>
                <ul>
                    <li>Books: ${analysis.book_count || 0}</li>
                    <li>Users: ${analysis.user_count || 'N/A'}</li>
                    <li>Reading Logs: ${analysis.reading_log_count || 0}</li>
                </ul>
            </div>
            <div class="col-md-6">
                <h7>Tables:</h7>
                <ul>
                    ${analysis.tables ? analysis.tables.map(table => `<li>${table}</li>`).join('') : '<li>No table info</li>'}
                </ul>
            </div>
        </div>
        
        ${analysis.users ? `
            <h7>Users in Database:</h7>
            <div class="table-responsive">
                <table class="table table-sm">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Username</th>
                            <th>Email</th>
                            <th>Admin</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${analysis.users.map(user => `
                            <tr>
                                <td>${user.id}</td>
                                <td>${user.username}</td>
                                <td>${user.email}</td>
                                <td>${user.is_admin ? '<i class="fas fa-crown text-warning"></i>' : ''}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        ` : ''}
    `;
    
    document.getElementById('modalContent').innerHTML = content;
    $('#databaseModal').modal('show');
}

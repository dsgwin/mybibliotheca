// Extracted from app/templates/import_books.html for browser caching.

document.getElementById('uploadForm').addEventListener('submit', function(e) {
    const fileInput = document.getElementById('csv_file');
    const file = fileInput.files[0];
    
    if (file) {
        if (file.size > 100 * 1024 * 1024) { // 100MB
            e.preventDefault();
            alert('File size must be less than 100MB');
            return;
        }
        
        // Show loading state
        const submitBtn = this.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
    }
});

// Extracted from app/templates/edit_person.html for browser caching.

document.addEventListener('DOMContentLoaded', function() {
    const birthYearInput = document.getElementById('birth_year');
    const deathYearInput = document.getElementById('death_year');
    
    // Validate death year is not before birth year
    function validateYears() {
        const birthYear = parseInt(birthYearInput.value);
        const deathYear = parseInt(deathYearInput.value);
        
        if (birthYear && deathYear && deathYear < birthYear) {
            deathYearInput.setCustomValidity('Death year cannot be before birth year');
        } else {
            deathYearInput.setCustomValidity('');
        }
    }
    
    birthYearInput.addEventListener('input', validateYears);
    deathYearInput.addEventListener('input', validateYears);
    
    // Set max year to current year
    const currentYear = new Date().getFullYear();
    birthYearInput.max = currentYear;
    deathYearInput.max = currentYear;
});

// Photo preview scripts
document.addEventListener('DOMContentLoaded', function() {
  const urlInput = document.getElementById('photo_url');
  const urlBtn = document.getElementById('photo-preview-url-btn');
  const fileInput = document.getElementById('photo_file');
  const newPreview = document.getElementById('new-photo-preview');

  urlBtn.addEventListener('click', function() {
    const url = urlInput.value;
    if (url) {
      newPreview.innerHTML = `<img src="${url}" class="img-fluid rounded shadow-sm" style="max-height: 200px;">`;
    }
  });

  fileInput.addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        newPreview.innerHTML = `<img src="${e.target.result}" class="img-fluid rounded shadow-sm" style="max-height: 200px;">`;
      };
      reader.readAsDataURL(file);
    }
  });
});

// Extracted from app/templates/add_person.html for browser caching.

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

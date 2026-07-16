// Extracted from app/templates/merge_persons.html for browser caching.

document.addEventListener('DOMContentLoaded', function() {
    const primarySelect = document.getElementById('primary_person_id');
    const mergeCheckboxes = document.querySelectorAll('input[name="merge_person_ids"]');
    const mergeButton = document.getElementById('mergeButton');
    const primaryPreview = document.getElementById('primaryPersonPreview');
    const primaryInfo = document.getElementById('primaryPersonInfo');
    const mergePreview = document.getElementById('mergePreview');
    const mergePreviewContent = document.getElementById('mergePreviewContent');
    const mergeForm = document.getElementById('mergeForm');
    
    function updateUI() {
        const primaryId = primarySelect.value;
        const selectedMergeIds = Array.from(mergeCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);
        
        // Enable/disable merge options based on primary selection
        document.querySelectorAll('.merge-person-option').forEach(option => {
            const personId = option.dataset.personId;
            if (personId === primaryId) {
                option.classList.add('disabled');
                option.querySelector('input').checked = false;
                option.querySelector('input').disabled = true;
            } else {
                option.classList.remove('disabled');
                option.querySelector('input').disabled = false;
            }
        });
        
        // Show/hide primary person preview
        if (primaryId) {
            const primaryOption = primarySelect.querySelector(`option[value="${primaryId}"]`);
            const name = primaryOption.dataset.name;
            const bio = primaryOption.dataset.bio;
            const books = primaryOption.dataset.books;
            
            primaryInfo.innerHTML = `
                <h6>${name}</h6>
                ${bio ? `<p class="text-muted mb-1">${bio}</p>` : ''}
                <p class="mb-0"><strong>${books} books</strong> will be kept and additional books will be added from merged people.</p>
            `;
            primaryPreview.classList.remove('d-none');
        } else {
            primaryPreview.classList.add('d-none');
        }
        
        // Show/hide merge preview
        if (primaryId && selectedMergeIds.length > 0) {
            const selectedPersons = selectedMergeIds.map(id => {
                const checkbox = document.querySelector(`input[value="${id}"]`);
                const label = checkbox.nextElementSibling;
                const name = label.querySelector('strong').textContent;
                const badge = label.querySelector('.badge');
                const books = badge ? badge.textContent : '0 books';
                return { name, books };
            });
            
            let totalBooks = 0;
            selectedPersons.forEach(person => {
                // Extract book count more safely
                const bookText = person.books || '0 books';
                const matches = bookText.match(/(\d+)/);
                const bookCount = matches ? parseInt(matches[0]) : 0;
                if (!isNaN(bookCount)) {
                    totalBooks += bookCount;
                }
            });
            
            mergePreviewContent.innerHTML = `
                <p><strong>The following ${selectedPersons.length} person(s) will be deleted:</strong></p>
                <ul>
                    ${selectedPersons.map(person => `<li>${person.name} (${person.books})</li>`).join('')}
                </ul>
                <p><strong>Total books to be transferred:</strong> ${totalBooks}</p>
                <p class="text-danger mb-0">
                    <i class="bi bi-exclamation-triangle"></i>
                    These people will be permanently deleted and cannot be recovered.
                </p>
            `;
            mergePreview.classList.remove('d-none');
        } else {
            mergePreview.classList.add('d-none');
        }
        
        // Enable/disable merge button
        mergeButton.disabled = !primaryId || selectedMergeIds.length === 0;
    }
    
    // Event listeners
    primarySelect.addEventListener('change', updateUI);
    mergeCheckboxes.forEach(cb => cb.addEventListener('change', updateUI));
    
    // Form submission confirmation
    mergeForm.addEventListener('submit', function(e) {
        const primaryOption = primarySelect.querySelector(`option[value="${primarySelect.value}"]`);
        const primaryName = primaryOption.dataset.name;
        const selectedMergeIds = Array.from(mergeCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);
        
        const mergeNames = selectedMergeIds.map(id => {
            const checkbox = document.querySelector(`input[value="${id}"]`);
            const label = checkbox.nextElementSibling;
            return label.querySelector('strong').textContent;
        });
        
        const confirmMessage = `Are you absolutely sure you want to merge the following people into "${primaryName}"?\n\n` +
            `People to be deleted:\n${mergeNames.map(name => `• ${name}`).join('\n')}\n\n` +
            `This action CANNOT be undone!`;
        
        if (!confirm(confirmMessage)) {
            e.preventDefault();
        }
    });
    
    // Initial UI update
    updateUI();
});

// Extracted from genres/search.html for browser caching.
// window.SEARCH_QUERY is set by a small inline script before this loads.

// Highlight search terms in results
document.addEventListener('DOMContentLoaded', function() {
    const query = window.SEARCH_QUERY;
    if (query && query.length > 2) {
        highlightSearchTerms(query.toLowerCase());
    }
});

function highlightSearchTerms(searchTerm) {
    const categoryCards = document.querySelectorAll('.category-result');
    
    categoryCards.forEach(card => {
        const textElements = card.querySelectorAll('h5, p, .badge');
        
        textElements.forEach(element => {
            if (element.textContent.toLowerCase().includes(searchTerm)) {
                const text = element.innerHTML;
                const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi');
                element.innerHTML = text.replace(regex, '<mark>$1</mark>');
            }
        });
    });
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Form enhancement
document.querySelector('form input[name="q"]').addEventListener('keyup', function(e) {
    if (e.key === 'Enter') {
        this.form.submit();
    }
});

// Extracted from loans/manage.html for browser caching.
// window.LOANS_CONFIG is set by a small inline script before this loads.

(function () {
  const searchInput   = document.getElementById('loan-search');
  const spinner       = document.getElementById('loan-search-spinner');
  const resultsList   = document.getElementById('loan-search-results');
  const display       = document.getElementById('selected-book-display');
  const selectedCover = document.getElementById('selected-cover');
  const selectedTitle = document.getElementById('selected-title');
  const selectedAuthors = document.getElementById('selected-authors');
  const clearBtn      = document.getElementById('clear-selection');
  const bookIdInput   = document.getElementById('loan-book-id');
  const submitBtn     = document.getElementById('loan-submit-btn');

  let debounceTimer = null;

  function clearSelection() {
    bookIdInput.value = '';
    submitBtn.disabled = true;
    display.classList.add('d-none');
    searchInput.value = '';
    resultsList.style.display = 'none';
    resultsList.innerHTML = '';
  }

  function selectBook(book) {
    bookIdInput.value   = book.id;
    selectedTitle.textContent   = book.title;
    selectedAuthors.textContent = book.authors || '';
    if (book.cover_url) {
      selectedCover.src = book.cover_url;
      selectedCover.style.display = '';
    } else {
      selectedCover.style.display = 'none';
    }
    display.classList.remove('d-none');
    submitBtn.disabled = false;
    resultsList.style.display = 'none';
    resultsList.innerHTML = '';
    searchInput.value = book.title;
  }

  function renderResults(books) {
    resultsList.innerHTML = '';
    if (!books.length) {
      resultsList.innerHTML = '<div class="list-group-item text-muted small py-2">No books found.</div>';
      resultsList.style.display = 'block';
      return;
    }
    books.forEach(function (book) {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'list-group-item list-group-item-action py-2 px-3';
      item.innerHTML = `
        <div class="fw-medium text-truncate">${book.title}</div>
        ${book.authors ? `<div class="text-muted small text-truncate">${book.authors}</div>` : ''}
      `;
      item.addEventListener('click', function () { selectBook(book); });
      resultsList.appendChild(item);
    });
    resultsList.style.display = 'block';
  }

  searchInput.addEventListener('input', function () {
    clearTimeout(debounceTimer);
    const q = searchInput.value.trim();
    if (!q) {
      resultsList.style.display = 'none';
      return;
    }
    debounceTimer = setTimeout(function () {
      spinner.classList.remove('d-none');
      fetch(`${window.LOANS_CONFIG.apiSearchUrl}?q=${encodeURIComponent(q)}`, {
        headers: { 'X-CSRFToken': window.csrfToken || '' }
      })
      .then(r => r.json())
      .then(function (data) {
        spinner.classList.add('d-none');
        renderResults(data.books || []);
      })
      .catch(function () {
        spinner.classList.add('d-none');
        resultsList.innerHTML = '<div class="list-group-item text-danger small py-2">Search failed.</div>';
        resultsList.style.display = 'block';
      });
    }, 280);
  });

  // Hide dropdown when clicking outside
  document.addEventListener('click', function (e) {
    if (!searchInput.contains(e.target) && !resultsList.contains(e.target)) {
      resultsList.style.display = 'none';
    }
  });

  clearBtn.addEventListener('click', clearSelection);

  // Prevent form submit without a book selected
  document.getElementById('loan-form').addEventListener('submit', function (e) {
    if (!bookIdInput.value) {
      e.preventDefault();
      searchInput.focus();
      searchInput.classList.add('is-invalid');
      setTimeout(() => searchInput.classList.remove('is-invalid'), 2000);
    }
  });
})();

// Extracted from base.html for browser caching. CSRF utilities, theme toggle,
// navbar scroll, and the card-header radius fix. window.APP_URLS.toggleTheme is
// set by a small inline script in base.html before this file loads.

    document.addEventListener('DOMContentLoaded', function() {
      document.querySelectorAll('.card > .card-header + .collapse').forEach(function(panel) {
        const header = panel.previousElementSibling;
        if (!header) return;
        function syncHeaderRadius() {
          const bottomRadius = panel.classList.contains('show') ? '0' : '17px';
          header.style.borderBottomLeftRadius = bottomRadius;
          header.style.borderBottomRightRadius = bottomRadius;
        }
        panel.addEventListener('shown.bs.collapse', syncHeaderRadius);
        panel.addEventListener('hidden.bs.collapse', syncHeaderRadius);
        syncHeaderRadius();
      });
    });

    // Make CSRF token globally available
    window.csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
    
    // Utility function to add CSRF token to forms
    function addCSRFToForm(form) {
      if (!form.querySelector('input[name="csrf_token"]')) {
        const csrfInput = document.createElement('input');
        csrfInput.type = 'hidden';
        csrfInput.name = 'csrf_token';
        csrfInput.value = window.csrfToken;
        form.appendChild(csrfInput);
      }
    }
    
    // Utility function for CSRF-protected fetch requests
    function csrfFetch(url, options = {}) {
      options.headers = options.headers || {};
      options.headers['X-CSRFToken'] = window.csrfToken;
      return fetch(url, options);
    }
    
    // Auto-add CSRF to all forms on page load
    document.addEventListener('DOMContentLoaded', function() {
      const forms = document.querySelectorAll('form[method="post"], form[method="POST"]');
      forms.forEach(addCSRFToForm);
      
      // Initialize theme toggle
      initThemeToggle();
    });
    
    // Theme toggle functionality
    function initThemeToggle() {
      const themeToggle = document.getElementById('theme-toggle');
      const themeIcon = document.getElementById('theme-icon');
      const htmlElement = document.documentElement;
      
      // Check if localStorage has a different theme than server-side
      const serverTheme = htmlElement.getAttribute('data-theme') || 'light';
      const localStorageTheme = localStorage.getItem('mybibliotheca_theme');
      
      // If localStorage has a different theme, use that and sync with server
      if (localStorageTheme && localStorageTheme !== serverTheme) {
        htmlElement.setAttribute('data-theme', localStorageTheme);
        // Sync with server in background
        csrfFetch(window.APP_URLS.toggleTheme, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            current_theme: serverTheme
          })
        }).catch(error => {
          console.log('Failed to sync theme with server:', error);
        });
      }
      
      // Update icon based on current theme
      function updateThemeIcon(theme) {
        if (theme === 'dark') {
          themeIcon.className = 'bi bi-sun-fill';
        } else {
          themeIcon.className = 'bi bi-moon-fill';
        }
      }
      
      // Initialize icon
      const currentTheme = htmlElement.getAttribute('data-theme') || 'light';
      updateThemeIcon(currentTheme);
      
      // Theme toggle click handler
      themeToggle.addEventListener('click', function() {
        const currentTheme = htmlElement.getAttribute('data-theme') || 'light';
        
        // Send theme toggle request
        csrfFetch(window.APP_URLS.toggleTheme, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            current_theme: currentTheme
          })
        })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            // Update theme immediately
            htmlElement.setAttribute('data-theme', data.new_theme);
            updateThemeIcon(data.new_theme);
            
            // Store theme preference in localStorage as backup
            localStorage.setItem('mybibliotheca_theme', data.new_theme);
          } else {
            console.error('Failed to toggle theme:', data.error);
          }
        })
        .catch(error => {
          console.error('Error toggling theme:', error);
          // If server request fails, toggle locally and store in localStorage
          const newTheme = currentTheme === 'light' ? 'dark' : 'light';
          htmlElement.setAttribute('data-theme', newTheme);
          updateThemeIcon(newTheme);
          localStorage.setItem('mybibliotheca_theme', newTheme);
        });
      });
    }
    
    // Navbar scroll behavior
    let ticking = false;
    
    function updateNavbar() {
      const navbar = document.querySelector('.navbar');
      if (window.scrollY > 10) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
      ticking = false;
    }
    
    window.addEventListener('scroll', function() {
      if (!ticking) {
        requestAnimationFrame(updateNavbar);
        ticking = true;
      }
    });

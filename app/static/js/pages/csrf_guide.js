// Extracted from app/templates/csrf_guide.html for browser caching.

                document.getElementById('ajax-example').addEventListener('click', function() {
                    // Method 1: Using the csrfFetch utility
                    csrfFetch('/api/example', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({data: 'example'})
                    })
                    .then(response => response.json())
                    .then(data => {
                        document.getElementById('ajax-result').innerHTML = 
                            '<div class="alert alert-success">AJAX request successful!</div>';
                    })
                    .catch(error => {
                        document.getElementById('ajax-result').innerHTML = 
                            '<div class="alert alert-danger">AJAX request failed: ' + error + '</div>';
                    });
                    
                    // Method 2: Manual fetch with CSRF token
                    /*
                    fetch('/api/example', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRFToken': window.csrfToken
                        },
                        body: JSON.stringify({data: 'example'})
                    })
                    */
                });

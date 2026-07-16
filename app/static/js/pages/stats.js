// Extracted from stats.html for browser caching.

function showCommunityDetail(type) {
  const container = document.getElementById('community-detail-container');
  const title = document.getElementById('community-detail-title');
  const content = document.getElementById('community-detail-content');
  
  // Set title based on type
  const titles = {
    'active-readers': '<i class="bi bi-people"></i> Active Community Readers',
    'books-this-month': '<i class="bi bi-calendar-month"></i> Books Finished This Month',
    'currently-reading': '<i class="bi bi-book-half"></i> Currently Reading in Community',
    'recent-activity': '<i class="bi bi-activity"></i> Recent Reading Activity'
  };
  
  title.innerHTML = titles[type] || 'Community Detail';
  
  // Load appropriate content
  content.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"></div></div>';
  
  // Show the container
  container.style.display = 'block';
  container.scrollIntoView({ behavior: 'smooth' });
  
  // Fetch content via AJAX
  fetch(`/stats/community_stats/${type}`)
    .then(response => response.text())
    .then(html => {
      content.innerHTML = html;
    })
    .catch(error => {
      console.error('Error loading community detail:', error);
      content.innerHTML = '<div class="alert alert-danger">Error loading community data. Please try again.</div>';
    });
}

function hideCommunityDetail() {
  const container = document.getElementById('community-detail-container');
  container.style.display = 'none';
}

function showUserReadingLogs() {
  const container = document.getElementById('reading-logs-detail-container');
  const content = document.getElementById('reading-logs-detail-content');
  
  // Load content
  content.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"></div></div>';
  
  // Show the container
  container.style.display = 'block';
  container.scrollIntoView({ behavior: 'smooth' });
  
  // Fetch content via AJAX
  fetch('/stats/reading-logs')
    .then(response => response.text())
    .then(html => {
      content.innerHTML = html;
    })
    .catch(error => {
      console.error('Error loading reading logs:', error);
      content.innerHTML = '<div class="alert alert-danger">Error loading reading logs. Please try again.</div>';
    });
}

function hideReadingLogsDetail() {
  const container = document.getElementById('reading-logs-detail-container');
  container.style.display = 'none';
}

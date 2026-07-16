// Extracted from stats/reading_journey.html for browser caching.
// window.READING_JOURNEY_CONFIG is set by a small inline script before this loads.

document.addEventListener('DOMContentLoaded', function() {
    // Initialize enhanced heatmap features
    initializeHeatmapControls();
    initializePatternRecognition();
    initializeSeasonalOverlays();
    
    // Initialize existing functionality
    initializeTooltips();
    restoreFilterValues();
    initializeEventHandlers();
    
    // Apply initial heatmap intensity calculations
    calculateActivityIntensity();
});

function initializeHeatmapControls() {
    const heatmapToggle = document.getElementById('heatmapViewToggle');
    if (heatmapToggle) {
        heatmapToggle.addEventListener('change', function(e) {
            const view = e.target.value;
            switch(view) {
                case 'current':
                    showCurrentYearHeatmap();
                    break;
                case 'previous':
                    showPreviousYearHeatmap();
                    break;
                case 'compare':
                    showYearComparison();
                    break;
            }
        });
    }
}

function initializePatternRecognition() {
    // Calculate and highlight reading patterns
    const calendarDays = document.querySelectorAll('.calendar-day');
    const dayPatterns = new Map();
    
    calendarDays.forEach(day => {
        const dayOfWeek = parseInt(day.dataset.dayOfWeek) || 0;
        const activityCount = parseInt(day.dataset.activityCount) || 0;
        
        if (!dayPatterns.has(dayOfWeek)) {
            dayPatterns.set(dayOfWeek, []);
        }
        dayPatterns.get(dayOfWeek).push(activityCount);
    });
    
    // Find patterns and store them
    window.readingPatterns = {
        dayPatterns: dayPatterns,
        weekendPattern: calculateWeekendPattern(),
        monthlyTrends: calculateMonthlyTrends()
    };
}

function initializeSeasonalOverlays() {
    const calendarDays = document.querySelectorAll('.calendar-day');
    const currentMonth = window.READING_JOURNEY_CONFIG.calendarMonth;
    
    calendarDays.forEach(day => {
        if (day.dataset.day) {
            const seasonClass = getSeasonClass(currentMonth);
            day.classList.add(seasonClass);
        }
    });
}

function calculateActivityIntensity() {
    const calendarDays = document.querySelectorAll('.calendar-day[data-activity-count]');
    const activityCounts = Array.from(calendarDays).map(day => 
        parseInt(day.dataset.activityCount) || 0
    ).filter(count => count > 0);
    
    if (activityCounts.length === 0) return;
    
    const maxActivity = Math.max(...activityCounts);
    const intensityThresholds = [
        0,
        Math.ceil(maxActivity * 0.25),
        Math.ceil(maxActivity * 0.5),
        Math.ceil(maxActivity * 0.75),
        maxActivity
    ];
    
    calendarDays.forEach(day => {
        const count = parseInt(day.dataset.activityCount) || 0;
        let intensity = 0;
        
        for (let i = 1; i < intensityThresholds.length; i++) {
            if (count >= intensityThresholds[i]) {
                intensity = i;
            }
        }
        
        day.dataset.activityIntensity = intensity;
        
        // Add activity indicator if there's activity
        if (count > 0 && !day.querySelector('.activity-indicator')) {
            const indicator = document.createElement('div');
            indicator.className = 'activity-indicator';
            indicator.dataset.intensity = intensity;
            indicator.title = `Activity Level: ${intensity}/4`;
            day.appendChild(indicator);
        }
    });
}

function togglePatternHighlighting() {
    const calendarContainer = document.querySelector('.calendar-container');
    calendarContainer.classList.toggle('pattern-weekends');
    
    // Highlight days with above-average activity
    const calendarDays = document.querySelectorAll('.calendar-day');
    const averageActivity = calculateAverageActivity();
    
    calendarDays.forEach(day => {
        const activityCount = parseInt(day.dataset.activityCount) || 0;
        if (activityCount > averageActivity) {
            day.classList.toggle('pattern-highlight');
        }
    });
}

function toggleSeasonalOverlay() {
    const calendarDays = document.querySelectorAll('.calendar-day');
    const isActive = document.querySelector('.calendar-day.seasonal-spring') !== null;
    
    calendarDays.forEach(day => {
        if (isActive) {
            day.classList.remove('seasonal-spring', 'seasonal-summer', 'seasonal-autumn', 'seasonal-winter');
        } else {
            const month = window.READING_JOURNEY_CONFIG.calendarMonth;
            const seasonClass = getSeasonClass(month);
            day.classList.add(seasonClass);
        }
    });
}

function showCurrentYearHeatmap() {
    const calendarContainer = document.querySelector('.calendar-container');
    calendarContainer.classList.remove('year-comparison-mode');
    
    // Reset to current year data
    window.location.href = updateUrlParameter('year', window.READING_JOURNEY_CONFIG.calendarYear);
}

function showPreviousYearHeatmap() {
    const previousYear = (window.READING_JOURNEY_CONFIG.calendarYear - 1);
    window.location.href = updateUrlParameter('year', previousYear);
}

function showYearComparison() {
    const calendarContainer = document.querySelector('.calendar-container');
    calendarContainer.classList.add('year-comparison-mode');
    
    // This would require additional backend support to load both years
    console.log('Year comparison mode activated - requires backend enhancement');
}

function getSeasonClass(month) {
    if (month >= 3 && month <= 5) return 'seasonal-spring';
    if (month >= 6 && month <= 8) return 'seasonal-summer';
    if (month >= 9 && month <= 11) return 'seasonal-autumn';
    return 'seasonal-winter';
}

function calculateWeekendPattern() {
    const weekendDays = document.querySelectorAll('.calendar-day[data-is-weekend="true"]');
    const totalWeekendActivity = Array.from(weekendDays).reduce((sum, day) => {
        return sum + (parseInt(day.dataset.activityCount) || 0);
    }, 0);
    
    const weekdayDays = document.querySelectorAll('.calendar-day[data-is-weekend="false"]');
    const totalWeekdayActivity = Array.from(weekdayDays).reduce((sum, day) => {
        return sum + (parseInt(day.dataset.activityCount) || 0);
    }, 0);
    
    return {
        weekendActivity: totalWeekendActivity,
        weekdayActivity: totalWeekdayActivity,
        weekendPreference: totalWeekendActivity > totalWeekdayActivity
    };
}

function calculateMonthlyTrends() {
    const days = document.querySelectorAll('.calendar-day[data-day]');
    const weekTrends = [];
    
    for (let week = 0; week < 6; week++) {
        const weekDays = Array.from(days).slice(week * 7, (week + 1) * 7);
        const weekActivity = weekDays.reduce((sum, day) => {
            return sum + (parseInt(day.dataset.activityCount) || 0);
        }, 0);
        weekTrends.push(weekActivity);
    }
    
    return weekTrends;
}

function calculateAverageActivity() {
    const calendarDays = document.querySelectorAll('.calendar-day[data-activity-count]');
    const totalActivity = Array.from(calendarDays).reduce((sum, day) => {
        return sum + (parseInt(day.dataset.activityCount) || 0);
    }, 0);
    
    return totalActivity / calendarDays.length;
}

function updateUrlParameter(param, value) {
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set(param, value);
    return `${window.location.pathname}?${urlParams.toString()}`;
}

// Initialize existing functionality
function initializeTooltips() {
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

function restoreFilterValues() {
    const urlParams = new URLSearchParams(window.location.search);
    // Restore any filter values if needed
}

function initializeEventHandlers() {
    // Handle individual log clicks
    document.querySelectorAll('.calendar-log').forEach(function(logEl) {
        logEl.addEventListener('click', function(e) {
            e.stopPropagation();
            showLogDetails(this.dataset.logId);
        });
    });
    
    // Handle cluster clicks
    document.querySelectorAll('.calendar-cluster').forEach(function(clusterEl) {
        clusterEl.addEventListener('click', function(e) {
            e.stopPropagation();
            showClusterDetails(this);
        });
    });
}
    text-align: center;
    line-height: 1;
    padding: 2px;
}

/* Cluster Circles in Calendar */
.calendar-cluster {
    cursor: pointer;
    margin: 2px;
    transition: transform 0.2s ease;
    max-width: fit-content;
}

.calendar-cluster:hover {
    transform: scale(1.1);
    z-index: 10;
}

.cluster-circle-small {
    width: 30px;
    height: 30px;
    background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
    border: 2px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
    font-size: 0.8rem;
}

.calendar-cluster:hover .cluster-circle-small {
    background: linear-gradient(135deg, #0056b3 0%, #003d82 100%);
    box-shadow: 0 4px 10px rgba(0,0,0,0.4);
}

/* Responsive Design */
@media (max-width: 768px) {
    .calendar-day {
        min-height: 80px;
        padding: 4px;
    }
    
    .book-cover-small {
        width: 20px;
        height: 28px;
    }
    
    .book-placeholder-small {
        width: 20px;
        height: 28px;
        font-size: 0.5rem;
    }
    
    .cluster-circle-small {
        width: 25px;
        height: 25px;
        font-size: 0.7rem;
    }
    
    .day-number {
        font-size: 0.8rem;
    }
}

@media (max-width: 576px) {
    .calendar-day {
        min-height: 60px;
        padding: 2px;
    }
    
    .book-cover-small {
        width: 15px;
        height: 20px;
    }
    
    .book-placeholder-small {
        width: 15px;
        height: 20px;
        font-size: 0.4rem;
    }
    
    .cluster-circle-small {
        width: 20px;
        height: 20px;
        font-size: 0.6rem;
    }
    
    .calendar-day-header {
        padding: 8px 4px;
        font-size: 0.8rem;
    }
}
</style>

<script>
document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Handle individual book clicks
    document.querySelectorAll('.calendar-book').forEach(function(bookEl) {
        bookEl.addEventListener('click', function() {
            showBookModal(this);
        });
    });
    
    // Handle cluster clicks
    document.querySelectorAll('.calendar-cluster').forEach(function(clusterEl) {
        clusterEl.addEventListener('click', function() {
            try {
                const bookCount = parseInt(this.getAttribute('data-cluster-count'));
                const date = this.getAttribute('data-cluster-date');
                
                // Extract book data from individual attributes
                const books = [];
                for (let i = 0; i < bookCount; i++) {
                    const book = {
                        id: this.getAttribute(`data-book-${i}-id`),
                        uid: this.getAttribute(`data-book-${i}-uid`),
                        title: this.getAttribute(`data-book-${i}-title`),
                        authors_text: this.getAttribute(`data-book-${i}-authors`),
                        reading_status: this.getAttribute(`data-book-${i}-status`),
                        status_color: this.getAttribute(`data-book-${i}-status-color`),
                        cover_url: this.getAttribute(`data-book-${i}-cover`),
                        user_rating: this.getAttribute(`data-book-${i}-rating`),
                        page_count: this.getAttribute(`data-book-${i}-pages`),
                        categories_text: this.getAttribute(`data-book-${i}-categories`),
                        personal_notes: this.getAttribute(`data-book-${i}-notes`),
                        date_added: this.getAttribute(`data-book-${i}-date`),
                        display_title: this.getAttribute(`data-book-${i}-display-title`)
                    };
                    books.push(book);
                }
                
                showClusterModal(books, date);
                
            } catch (error) {
                console.error('Error parsing cluster data:', error);
                alert('Failed to load cluster books: ' + error.message);
            }
        });
    });
});

function showBookModal(bookEl) {
    try {
        // Get book data from individual attributes
        const book = {
            id: bookEl.getAttribute('data-book-id'),
            uid: bookEl.getAttribute('data-book-uid'),
            title: bookEl.getAttribute('data-book-title'),
            authors_text: bookEl.getAttribute('data-book-authors'),
            reading_status: bookEl.getAttribute('data-book-status'),
            status_color: bookEl.getAttribute('data-book-status-color'),
            cover_url: bookEl.getAttribute('data-book-cover'),
            user_rating: bookEl.getAttribute('data-book-rating'),
            page_count: bookEl.getAttribute('data-book-pages'),
            categories_text: bookEl.getAttribute('data-book-categories'),
            personal_notes: bookEl.getAttribute('data-book-notes'),
            date_added: bookEl.getAttribute('data-book-date')
        };
        
        // Check if modal exists
        const modalElement = document.getElementById('bookDetailsModal');
        const modalContent = document.getElementById('bookDetailsContent');
        
        if (!modalElement || !modalContent) {
            throw new Error('Modal elements not found');
        }
        
        // Populate modal with book details
        modalContent.innerHTML = generateBookModalContent(book);
        
        // Show modal
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
        
    } catch (error) {
        console.error('Error displaying book details:', error);
        alert('Failed to display book details: ' + error.message);
    }
}

function showClusterModal(books, date) {
    try {
        const modalElement = document.getElementById('bookDetailsModal');
        const modalContent = document.getElementById('bookDetailsContent');
        const modalTitle = document.getElementById('bookDetailsModalLabel');
        
        if (!modalElement || !modalContent || !modalTitle) {
            throw new Error('Modal elements not found');
        }
        
        // Update modal title
        modalTitle.textContent = `${books.length} Books on ${formatDate(date)}`;
        
        // Create cluster view
        let clusterHTML = `
            <div class="cluster-books-container">
                <div class="row g-3">
        `;
        
        books.forEach(function(book) {
            clusterHTML += `
                <div class="col-md-4 col-sm-6">
                    <div class="cluster-book-item card h-100" onclick="showIndividualBookFromCluster(this)" 
                         data-book-id="${book.id || ''}"
                         data-book-uid="${book.uid || ''}"
                         data-book-title="${book.title || ''}"
                         data-book-authors="${book.authors_text || ''}"
                         data-book-status="${book.reading_status || ''}"
                         data-book-status-color="${book.status_color || ''}"
                         data-book-cover="${book.cover_url || ''}"
                         data-book-rating="${book.user_rating || ''}"
                         data-book-pages="${book.page_count || ''}"
                         data-book-categories="${book.categories_text || ''}"
                         data-book-notes="${book.personal_notes || ''}"
                         data-book-date="${book.date_added || ''}">
                        <div class="card-body p-2 text-center">
                            ${book.cover_url ? 
                                `<img src="${book.cover_url}" alt="${book.title}" class="img-fluid mb-2" style="max-height: 80px; max-width: 60px; object-fit: cover; border-radius: 4px; border: 2px solid ${book.status_color};">` :
                                `<div class="bg-secondary text-white rounded mb-2 mx-auto d-flex align-items-center justify-content-center" style="height: 80px; width: 60px; font-size: 0.7rem; text-align: center;">${book.display_title || book.title.substring(0, 10)}</div>`
                            }
                            <h6 class="card-title small mb-1">${book.title}</h6>
                            <p class="card-text small text-muted mb-1">${book.authors_text}</p>
                            <span class="badge" style="background-color: ${book.status_color}; font-size: 0.7rem;">
                                ${formatStatus(book.reading_status)}
                            </span>
                        </div>
                    </div>
                </div>
            `;
        });
        
        clusterHTML += `
                </div>
                <div class="text-center mt-3">
                    <button class="btn btn-secondary" onclick="closeClusterModal()">Close</button>
                </div>
            </div>
        `;
        
        modalContent.innerHTML = clusterHTML;
        
        // Show modal
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
        
    } catch (error) {
        console.error('Error displaying cluster:', error);
        alert('Failed to display cluster: ' + error.message);
    }
}

function showIndividualBookFromCluster(bookEl) {
    // Close cluster modal and show individual book modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('bookDetailsModal'));
    if (modal) {
        modal.hide();
    }
    
    // Wait for modal to close then show book details
    setTimeout(function() {
        showBookModal(bookEl);
    }, 300);
}

function closeClusterModal() {
    const modal = bootstrap.Modal.getInstance(document.getElementById('bookDetailsModal'));
    if (modal) {
        modal.hide();
    }
}

function generateBookModalContent(book) {
    return `
        <div class="row">
            <div class="col-md-4">
                ${book.cover_url ? 
                    `<img src="${book.cover_url}" alt="${book.title || 'Book cover'}" class="img-fluid rounded shadow">` :
                    `<div class="bg-secondary text-white rounded d-flex align-items-center justify-content-center" style="height: 200px;">
                        <i class="bi bi-book" style="font-size: 3rem;"></i>
                    </div>`
                }
            </div>
            <div class="col-md-8">
                <h4>${book.title || 'Unknown Title'}</h4>
                <p class="text-muted">by ${book.authors_text || 'Unknown Author'}</p>
                
                <div class="row">
                    <div class="col-sm-6">
                        <strong>Status:</strong> 
                        <span class="badge" style="background-color: ${book.status_color || '#6c757d'};">
                            ${formatStatus(book.reading_status)}
                        </span>
                    </div>
                    <div class="col-sm-6">
                        <strong>Added:</strong> ${formatDate(book.date_added)}
                    </div>
                    ${book.user_rating ? `
                    <div class="col-sm-6">
                        <strong>Rating:</strong> ${'★'.repeat(parseInt(book.user_rating))}${'☆'.repeat(5-parseInt(book.user_rating))}
                    </div>
                    ` : ''}
                    ${book.page_count ? `
                    <div class="col-sm-6">
                        <strong>Pages:</strong> ${book.page_count}
                    </div>
                    ` : ''}
                    ${book.categories_text ? `
                    <div class="col-sm-12 mt-2">
                        <strong>Categories:</strong> ${book.categories_text}
                    </div>
                    ` : ''}
                </div>
                
                ${book.personal_notes ? `
                <div class="mt-3">
                    <strong>Notes:</strong>
                    <p class="text-muted">${book.personal_notes}</p>
                </div>
                ` : ''}
                
                <div class="mt-3">
                    <a href="/view_book_enhanced/${book.uid}" class="btn btn-primary btn-sm">View Details</a>
                    <a href="/view_book_enhanced/${book.uid}" class="btn btn-outline-secondary btn-sm">Edit</a>
                </div>
            </div>
        </div>
    `;
}

function navigateMonth(direction) {
    const urlParams = new URLSearchParams(window.location.search);
    let year = parseInt(urlParams.get('year')) || window.READING_JOURNEY_CONFIG.calendarYear;
    let month = parseInt(urlParams.get('month')) || window.READING_JOURNEY_CONFIG.calendarMonth;
    
    month += direction;
    if (month > 12) {
        month = 1;
        year++;
    } else if (month < 1) {
        month = 12;
        year--;
    }
    
    urlParams.set('year', year);
    urlParams.set('month', month);
    
    window.location.href = window.READING_JOURNEY_CONFIG.readingJourneyUrl + '?' + urlParams.toString();
}

function showLogDetails(logId) {
    const logElement = document.querySelector(`[data-log-id="${logId}"]`);
    if (!logElement) return;
    
    const bookTitle = logElement.dataset.bookTitle;
    const bookAuthors = logElement.dataset.bookAuthors;
    const logDate = logElement.dataset.logDate;
    const readingStatus = logElement.dataset.readingStatus;
    const notes = logElement.dataset.notes || '';
    const pagesCurrent = logElement.dataset.pagesCurrent || '';
    const pagesTotal = logElement.dataset.pagesTotal || '';
    const progressPercent = logElement.dataset.progressPercent || '';
    const startPage = logElement.dataset.startPage || '';
    const endPage = logElement.dataset.endPage || '';
    const timeRead = logElement.dataset.timeRead || '';
    
    // Build progress information
    let progressInfo = '';
    if (pagesCurrent && pagesTotal) {
        progressInfo = `Page ${pagesCurrent} of ${pagesTotal}`;
        if (progressPercent) {
            progressInfo += ` (${progressPercent}%)`;
        }
    } else if (progressPercent) {
        progressInfo = `${progressPercent}% complete`;
    }
    
    // Build session metrics
    let metricsHtml = '';
    const metrics = [];
    
    if (startPage && endPage) {
        metrics.push(`<strong>Pages:</strong> ${startPage} - ${endPage}`);
    } else if (pagesCurrent) {
        metrics.push(`<strong>Pages Read:</strong> ${pagesCurrent}`);
    }
    
    if (timeRead && parseFloat(timeRead) > 0) {
        const timeFormatted = parseFloat(timeRead) >= 60 
            ? `${Math.floor(parseFloat(timeRead) / 60)}h ${Math.round(parseFloat(timeRead) % 60)}m`
            : `${Math.round(parseFloat(timeRead))}m`;
        metrics.push(`<strong>Time Read:</strong> ${timeFormatted}`);
    }
    
    if (progressInfo) {
        metrics.push(`<strong>Progress:</strong> ${progressInfo}`);
    }
    
    if (metrics.length > 0) {
        metricsHtml = `
            <div class="row mt-2">
                ${metrics.map(metric => `<div class="col-md-6"><small>${metric}</small></div>`).join('')}
            </div>
        `;
    }
    
    const modalContent = `
        <div class="modal fade" id="logDetailsModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Reading Session Details</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <h6 class="fw-bold">${bookTitle}</h6>
                        ${bookAuthors ? `<p class="text-muted mb-2">by ${bookAuthors}</p>` : ''}
                        <hr>
                        <p><strong>Date:</strong> ${new Date(logDate).toLocaleDateString()}</p>
                        <p><strong>Status:</strong> ${formatStatus(readingStatus)}</p>
                        ${metricsHtml}
                        ${notes ? `<div class="mt-3"><strong>Notes:</strong><div class="border rounded p-2 mt-1">${notes}</div></div>` : ''}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal
    const existingModal = document.getElementById('logDetailsModal');
    if (existingModal) existingModal.remove();
    
    // Add new modal to body
    document.body.insertAdjacentHTML('beforeend', modalContent);
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('logDetailsModal'));
    modal.show();
}

function showClusterDetails(clusterElement) {
    const clusterDate = clusterElement.dataset.clusterDate;
    const clusterCount = clusterElement.dataset.clusterCount;
    
    // Find all log data for this cluster
    const logDataElements = document.querySelectorAll(`[data-cluster-date="${clusterDate}"].cluster-log-data`);
    
    let logsHtml = '';
    logDataElements.forEach((logData, index) => {
        const bookTitle = logData.dataset.bookTitle;
        const bookAuthors = logData.dataset.bookAuthors;
        const logDate = logData.dataset.logDate;
        const readingStatus = logData.dataset.readingStatus;
        const notes = logData.dataset.notes || '';
        const pagesCurrent = logData.dataset.pagesCurrent || '';
        const pagesTotal = logData.dataset.pagesTotal || '';
        const progressPercent = logData.dataset.progressPercent || '';
        const startPage = logData.dataset.startPage || '';
        const endPage = logData.dataset.endPage || '';
        const timeRead = logData.dataset.timeRead || '';
        
        // Build metrics for this log
        const metrics = [];
        
        if (startPage && endPage) {
            metrics.push(`Pages: ${startPage} - ${endPage}`);
        } else if (pagesCurrent) {
            metrics.push(`Pages Read: ${pagesCurrent}`);
        }
        
        if (timeRead && parseFloat(timeRead) > 0) {
            const timeFormatted = parseFloat(timeRead) >= 60 
                ? `${Math.floor(parseFloat(timeRead) / 60)}h ${Math.round(parseFloat(timeRead) % 60)}m`
                : `${Math.round(parseFloat(timeRead))}m`;
            metrics.push(`Time: ${timeFormatted}`);
        }
        
        if (progressPercent) {
            metrics.push(`Progress: ${progressPercent}%`);
        }
        
        let metricsText = metrics.length > 0 ? ` • ${metrics.join(' • ')}` : '';
        
        logsHtml += `
            <div class="border rounded p-3 mb-3 ${index === logDataElements.length - 1 ? 'mb-0' : ''}">
                <h6 class="fw-bold mb-1">${bookTitle}</h6>
                ${bookAuthors ? `<p class="text-muted small mb-2">by ${bookAuthors}</p>` : ''}
                <div class="row">
                    <div class="col-md-6">
                        <small><strong>Status:</strong> ${formatStatus(readingStatus)}</small>
                    </div>
                    <div class="col-md-6">
                        ${metricsText ? `<small>${metricsText}</small>` : ''}
                    </div>
                </div>
                ${notes ? `<div class="mt-2"><small><strong>Notes:</strong></small><div class="border rounded p-2 mt-1 small">${notes}</div></div>` : ''}
            </div>
        `;
    });
    
    const modalContent = `
        <div class="modal fade" id="clusterDetailsModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${clusterCount} Reading Sessions</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <p class="text-muted mb-3">Sessions on ${new Date(clusterDate).toLocaleDateString()}</p>
                        ${logsHtml}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal
    const existingModal = document.getElementById('clusterDetailsModal');
    if (existingModal) existingModal.remove();
    
    // Add new modal to body
    document.body.insertAdjacentHTML('beforeend', modalContent);
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('clusterDetailsModal'));
    modal.show();
}

function formatStatus(status) {
    const labels = {
        'read': 'Read',
        'reading': 'Reading',
        'plan_to_read': 'Plan to Read',
        'on_hold': 'On Hold',
        'did_not_finish': 'Did Not Finish'
    };
    return labels[status] || 'Unknown';
}

function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    try {
        return new Date(dateString).toLocaleDateString();
    } catch {
        return dateString;
    }
}

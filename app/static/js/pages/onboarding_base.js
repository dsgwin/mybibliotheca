// Extracted from app/templates/onboarding/base_onboarding.html for browser caching.

    // Initialize Bootstrap 5 tooltips globally for onboarding pages
    document.addEventListener('DOMContentLoaded', function () {
        var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.forEach(function (el) { new bootstrap.Tooltip(el); });
    });

// Extracted from onboarding/step5_confirmation.html for browser caching.
// window.STEP5_CONFIG is set by a small inline script before this loads.

function confirmSetupAndDisable(button) {
    console.log('🚨🚨🚨 confirmSetupAndDisable called 🚨🚨🚨');
    
    // Modern confirmation with better UX
    const confirmed = confirm('🚀 Ready to create your library?\n\nThis will finalize the setup process and create your personal book collection.');
    console.log('🚨 User confirmed:', confirmed);
    
    if (confirmed) {
        console.log('🚨 User confirmed - setting up UI changes...');
        
        // Add loading class for visual feedback
        button.classList.add('loading');
        button.disabled = true;
        
        // Update button with animated loading state
        button.innerHTML = '<i class="bi bi-hourglass-split"></i> Launching Your Library...';
        console.log('🚨 Button disabled and text changed');
        
        // Add subtle haptic feedback if supported
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
        
        // Show progress indicator based on data option
        const dataOption = window.STEP5_CONFIG.dataOption;
        let progressMessage = '<i class="bi bi-gear"></i> Setting up your library...';
        
        if (dataOption === 'import') {
            progressMessage = '<i class="bi bi-download"></i> Importing your books...';
        } else if (dataOption === 'migrate') {
            progressMessage = '<i class="bi bi-database-gear"></i> Migrating your database...';
        }
        
        const progressText = document.createElement('div');
        progressText.id = 'onboarding-progress';
        progressText.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(102, 126, 234, 0.9);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            font-weight: 600;
            z-index: 1000;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            animation: slideIn 0.3s ease-out;
            max-width: 300px;
        `;
        progressText.innerHTML = progressMessage;
        document.body.appendChild(progressText);
        
        // Add CSS animation for progress indicator
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            .progress-pulse {
                animation: pulse 1.5s ease-in-out infinite;
            }
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
            }
        `;
        document.head.appendChild(style);
        
        // Add pulsing animation to progress indicator
        progressText.classList.add('progress-pulse');
        
        console.log('🚨 About to allow form submission - returning true');
        
        // Add a small delay to ensure UI updates are visible
        setTimeout(() => {
            console.log('🚨🚨🚨 MANUALLY TRIGGERING FORM SUBMIT WITH ACTION FIELD 🚨🚨🚨');
            const form = button.closest('form');
            if (form) {
                console.log('🚨 Form found, adding action field and triggering submit()');
                console.log('🚨 Form action:', form.action);
                console.log('🚨 Form method:', form.method);
                console.log('🚨 Form elements count:', form.elements.length);
                
                // Create a hidden input for the action value since form.submit() bypasses button values
                const actionInput = document.createElement('input');
                actionInput.type = 'hidden';
                actionInput.name = 'action';
                actionInput.value = 'execute';
                form.appendChild(actionInput);
                
                console.log('🚨 Added action=execute hidden input to form');
                
                // Log all form data before submission
                const formData = new FormData(form);
                console.log('🚨 Form data before manual submit:');
                for (let [key, value] of formData.entries()) {
                    console.log(`  ${key}: ${value}`);
                }
                
                form.submit();
            } else {
                console.log('🚨 ERROR: Form not found!');
            }
        }, 100);
        
        // Return false to prevent the default form submission (we'll handle it manually)
        return false;
    } else {
        console.log('🚨 User cancelled - preventing form submission');
        // Prevent form submission
        return false;
    }
}

// Legacy function for backward compatibility
function confirmSetup() {
    return confirmSetupAndDisable(document.querySelector('#create-library-btn'));
}

// Add event listener as backup
document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('form[method="POST"]');
    const button = document.querySelector('#create-library-btn');
    
    if (form && button) {
        console.log('Form and button found, adding event handlers');
        console.log('🔍 Form details:', {
            action: form.action,
            method: form.method,
            target: form.target,
            enctype: form.enctype
        });
        
        button.addEventListener('click', function(e) {
            console.log('🚨 Button clicked - DETAILED INFO:');
            console.log('  - Event target:', e.target);
            console.log('  - Event type:', e.type);
            console.log('  - Default prevented:', e.defaultPrevented);
            console.log('  - Button disabled:', button.disabled);
            console.log('  - Button type:', button.type);
            console.log('  - Button name:', button.name);
            console.log('  - Button value:', button.value);
            console.log('  - Form data:', new FormData(form));
            console.log('  - CSRF token:', document.querySelector('input[name="csrf_token"]')?.value);
        });
        
        form.addEventListener('submit', function(e) {
            console.log('🚨🚨🚨 FORM SUBMIT EVENT TRIGGERED! 🚨🚨🚨');
            console.log('  - Event type:', e.type);
            console.log('  - Event target:', e.target);
            console.log('  - Default prevented:', e.defaultPrevented);
            console.log('  - Form action:', form.action);
            console.log('  - Form method:', form.method);
            console.log('  - Form valid:', form.checkValidity());
            console.log('  - Button action value:', button.value);
            console.log('  - All form data:');
            const formData = new FormData(form);
            for (let [key, value] of formData.entries()) {
                console.log(`    ${key}: ${value}`);
            }
        });
        
        // Add beforeunload listener to catch any navigation
        window.addEventListener('beforeunload', function(e) {
            console.log('🚨 Page is about to unload/navigate');
        });
        
        // Add error listener
        window.addEventListener('error', function(e) {
            console.log('🚨 JavaScript error:', e.error);
        });
        
    } else {
        console.log('🚨 ERROR: Form or button not found!');
        console.log('  - Form:', form);
        console.log('  - Button:', button);
    }
});

// Extracted from app/templates/onboarding/step2_site_config.html for browser caching.

// Initialize Step 2 behavior (timezone + accordion)
document.addEventListener('DOMContentLoaded', function() {
    const timezoneSelect = document.getElementById('timezone');
    const currentValue = timezoneSelect.value;
    
    // Only auto-detect if no timezone is already set
    if (!currentValue || currentValue === 'UTC') {
        try {
            const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            if (userTimezone) {
                const option = timezoneSelect.querySelector(`option[value="${userTimezone}"]`);
                if (option) {
                    option.selected = true;
                }
            }
        } catch (e) {
            console.log('Timezone auto-detection not supported');
        }
    }

    // Accordion initialization and robustness
    try {
        const accordion = document.getElementById('step2Accordion');
        if (accordion && window.bootstrap && bootstrap.Collapse) {
            // Ensure all collapse elements are initialized without auto-toggling
            const collapses = accordion.querySelectorAll('.accordion-collapse');
            collapses.forEach(el => {
                bootstrap.Collapse.getOrCreateInstance(el, { toggle: false });
            });

            // Keep header button state (collapsed class, aria-expanded) in sync with show/hide events
            accordion.addEventListener('show.bs.collapse', (ev) => {
                const target = ev.target; // .accordion-collapse
                const id = target.getAttribute('id');
                if (!id) return;
                const btn = accordion.querySelector(`.accordion-button[data-bs-target="#${id}"]`);
                if (btn) {
                    btn.classList.remove('collapsed');
                    btn.setAttribute('aria-expanded', 'true');
                }
            });
            accordion.addEventListener('hide.bs.collapse', (ev) => {
                const target = ev.target;
                const id = target.getAttribute('id');
                if (!id) return;
                const btn = accordion.querySelector(`.accordion-button[data-bs-target="#${id}"]`);
                if (btn) {
                    btn.classList.add('collapsed');
                    btn.setAttribute('aria-expanded', 'false');
                }
            });

            // Programmatic fallback: if the data API doesn't toggle, toggle manually and sync state
            const buttons = accordion.querySelectorAll('.accordion-button[data-bs-toggle="collapse"][data-bs-target]');
            buttons.forEach((btn) => {
                btn.addEventListener('click', function () {
                    const targetSel = this.getAttribute('data-bs-target');
                    const target = document.querySelector(targetSel);
                    if (!target) return;
                    const before = this.getAttribute('aria-expanded');
                    setTimeout(() => {
                        const after = this.getAttribute('aria-expanded');
                        if (before === after) {
                            const inst = bootstrap.Collapse.getOrCreateInstance(target, { toggle: false });
                            const willShow = !target.classList.contains('show');
                            if (willShow) {
                                // Hide other open sections if using data-bs-parent
                                const parentSel = target.getAttribute('data-bs-parent');
                                if (parentSel) {
                                    document.querySelectorAll(`${parentSel} .accordion-collapse.show`).forEach((openEl) => {
                                        if (openEl !== target) {
                                            bootstrap.Collapse.getOrCreateInstance(openEl, { toggle: false }).hide();
                                        }
                                    });
                                }
                                inst.show();
                                this.classList.remove('collapsed');
                                this.setAttribute('aria-expanded', 'true');
                            } else {
                                inst.hide();
                                this.classList.add('collapsed');
                                this.setAttribute('aria-expanded', 'false');
                            }
                        }
                    }, 50);
                }, { capture: true });
            });
        }
    } catch (e) {
        console.debug('Accordion init/fallback skipped:', e);
    }
});

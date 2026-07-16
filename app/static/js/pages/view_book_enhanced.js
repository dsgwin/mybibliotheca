// Extracted from view_book_enhanced.html for browser caching.
// GENRE_TERM*, BOOK_METADATA_CONTEXT, METADATA_ENDPOINTS, and CSRF_TOKEN are
// declared by a small inline <script> in view_book_enhanced.html (classic
// <script> tags share top-level const/let scope, so no window.* needed).

function fetchWithTimeout(resource, options = {}, timeoutMs = DEFAULT_FETCH_TIMEOUT_MS) {
    const controller = new AbortController();
    const { signal: externalSignal } = options || {};
    let didTimeout = false;
    const abortExternal = () => controller.abort();
    if (externalSignal) {
        if (externalSignal.aborted) {
            controller.abort();
        } else {
            externalSignal.addEventListener('abort', abortExternal);
        }
    }
    const timer = window.setTimeout(() => {
        didTimeout = true;
        controller.abort();
    }, timeoutMs);
    const finalOptions = { ...options, signal: controller.signal };
    const cleanup = () => {
        clearTimeout(timer);
        if (externalSignal) {
            externalSignal.removeEventListener('abort', abortExternal);
        }
    };
    return fetch(resource, finalOptions).then(
        response => {
            cleanup();
            return response;
        },
        error => {
            cleanup();
            if (didTimeout) {
                const timeoutError = new Error('timeout');
                timeoutError.name = 'TimeoutError';
                throw timeoutError;
            }
            throw error;
        }
    );
}

document.addEventListener('DOMContentLoaded', function() {
    // Edit mode toggle functionality for main card
    const editToggle = document.getElementById('editToggle');
    const viewMode = document.querySelector('.view-mode');
    const editMode = document.querySelector('.edit-mode');
    const cancelBtn = document.getElementById('cancelEdit');
    const discardBtn = document.getElementById('discardEditChanges');
    
    // Edit mode toggle functionality for all sections
    const basicInfoViewMode = document.querySelector('.basic-info-view-mode');
    const basicInfoEditMode = document.querySelector('.basic-info-edit-mode');
    const descriptionViewMode = document.querySelector('.description-view-mode');
    const descriptionEditMode = document.querySelector('.description-edit-mode');
    const readingProgressViewMode = document.querySelector('.reading-progress-view-mode');
    const readingProgressEditMode = document.querySelector('.reading-progress-edit-mode');
    const personalNotesViewMode = document.querySelector('.personal-notes-view-mode');
    const personalNotesEditMode = document.querySelector('.personal-notes-edit-mode');
    const customMetadataViewMode = document.querySelector('.custom-metadata-view-mode');
    const customMetadataEditMode = document.querySelector('.custom-metadata-edit-mode');
    const editPersonalNotesToggle = document.getElementById('editPersonalNotesToggle');
    
    // New accordion edit mode elements
    const editDescriptionToggle = document.getElementById('editDescriptionToggle');
    const editAdditionalDetailsToggle = document.getElementById('editAdditionalDetailsToggle');
    const customFieldsViewMode = document.querySelector('.custom-fields-view-mode');
    const customFieldsEditMode = document.querySelector('.custom-fields-edit-mode');
    const editCustomFieldsToggle = document.getElementById('editCustomFieldsToggle');
    // Initialize inline series autocomplete
    initializeInlineSeriesAutocomplete();
    
    // Helper: POST a form with fetch
    async function postForm(form) {
        if (!form) return { ok: true };
        const fd = new FormData(form);
        // Ensure hidden dynamic inputs are up to date for main form
        if (form.id === 'book-edit-form') {
            if (window.updateContributorHiddenInputs) window.updateContributorHiddenInputs();
            if (window.updateCategoryHiddenInputs) window.updateCategoryHiddenInputs();
        }
        const resp = await fetch(form.action, {
            method: form.method || 'POST',
            body: fd,
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        return { ok: resp.ok, status: resp.status };
    }

    // Helper: Merge multiple forms (posting to same endpoint) into a single request
    async function postMergedToEditEndpoint() {
        const mainForm = document.getElementById('book-edit-form');
        if (!mainForm) return { ok: true };
        // Update dynamic inputs before reading
        if (window.updateContributorHiddenInputs) window.updateContributorHiddenInputs();
        if (window.updateCategoryHiddenInputs) window.updateCategoryHiddenInputs();

        const merged = new FormData();
        const forms = [
            document.getElementById('book-edit-form'),
            document.getElementById('description-form'),
            document.getElementById('basic-info-form'),
            document.getElementById('personal-notes-form')
        ].filter(Boolean);

        for (const f of forms) {
            const fd = new FormData(f);
            // Copy entries; later forms can override specific fields if duplicated
            for (const [k, v] of fd.entries()) {
                merged.set(k, v);
            }
        }

        const resp = await fetch(mainForm.action, {
            method: mainForm.method || 'POST',
            body: merged,
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        return { ok: resp.ok, status: resp.status };
    }

    // Save all active edits before exiting edit mode
    async function saveAllEdits() {
        try {
            if (editToggle) {
                editToggle.disabled = true;
                editToggle.title = 'Saving changes…';
                editToggle.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
            }

            // 1) Post merged data to the main edit endpoint (book metadata + personal data + description)
            const mainResult = await postMergedToEditEndpoint();
            if (!mainResult.ok) throw new Error('Failed to save main edits');

            // 2) Post custom fields (separate endpoint)
            const customForm = document.getElementById('custom-fields-form');
            if (customForm) {
                const customResult = await postForm(customForm);
                if (!customResult.ok) throw new Error('Failed to save custom fields');
            }

            // Reload to reflect saved changes and show any flash messages
            window.location.reload();
        } catch (e) {
            console.error('Save on exit failed:', e);
            // Keep user in edit mode so they can correct issues
            if (editMode && viewMode) {
                editMode.style.display = 'block';
                viewMode.style.display = 'none';
            }
            if (editToggle) {
                editToggle.disabled = false;
                editToggle.innerHTML = '<i class="bi bi-pencil" id="edit-icon"></i>';
                editToggle.title = 'Edit Book Details';
            }
            alert('Some changes could not be saved automatically. Please click individual Save buttons or try again.');
        }
    }

    if (editToggle && viewMode && editMode) {
        editToggle.addEventListener('click', async function() {
            // Toggle main card edit mode
            const isEditMode = editMode.style.display !== 'none';
            
            if (isEditMode) {
                // Save all edits on exit, then reload (no manual toggle needed)
                await saveAllEdits();
                return;
            } else {
                // Switch to edit mode for all sections
                viewMode.style.display = 'none';
                editMode.style.display = 'block';
                
                if (basicInfoEditMode && basicInfoViewMode) {
                    basicInfoViewMode.style.display = 'none';
                    basicInfoEditMode.style.display = 'block';
                }
                
                if (descriptionEditMode && descriptionViewMode) {
                    descriptionViewMode.style.display = 'none';
                    descriptionEditMode.style.display = 'block';
                }
                
                if (readingProgressEditMode && readingProgressViewMode) {
                    readingProgressViewMode.style.display = 'none';
                    readingProgressEditMode.style.display = 'block';
                }
                
                if (personalNotesEditMode && personalNotesViewMode) {
                    personalNotesViewMode.style.display = 'none';
                    personalNotesEditMode.style.display = 'block';
                }
                
                if (customMetadataEditMode && customMetadataViewMode) {
                    customMetadataViewMode.style.display = 'none';
                    customMetadataEditMode.style.display = 'block';
                }
                
                editToggle.innerHTML = '<i class="bi bi-check" id="edit-icon"></i>';
                editToggle.title = 'Exit Edit Mode (saves changes)';
            }
        });
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', function() {
                // Cancel edit mode for all sections
                editMode.style.display = 'none';
                viewMode.style.display = 'block';
                
                if (basicInfoEditMode && basicInfoViewMode) {
                    basicInfoEditMode.style.display = 'none';
                    basicInfoViewMode.style.display = 'block';
                }
                
                if (readingProgressEditMode && readingProgressViewMode) {
                    readingProgressEditMode.style.display = 'none';
                    readingProgressViewMode.style.display = 'block';
                }
                
                if (personalNotesEditMode && personalNotesViewMode) {
                    personalNotesEditMode.style.display = 'none';
                    personalNotesViewMode.style.display = 'block';
                }
                
                if (customMetadataEditMode && customMetadataViewMode) {
                    customMetadataEditMode.style.display = 'none';
                    customMetadataViewMode.style.display = 'block';
                }
                
                editToggle.innerHTML = '<i class="bi bi-pencil" id="edit-icon"></i>';
                editToggle.title = 'Edit Book Details';
            });
        }

        if (discardBtn) {
            discardBtn.addEventListener('click', function() {
                const confirmation = window.confirm('Discard all unsaved changes and reload book details?');
                if (!confirmation) {
                    return;
                }
                // Ensure edit mode is closed immediately for better UX
                if (cancelBtn) {
                    cancelBtn.click();
                }
                window.location.reload();
            });
        }
    }
    
    // Personal Notes Edit Toggle
    // Use existing variables from above
    
    if (editPersonalNotesToggle && personalNotesViewMode && personalNotesEditMode) {
        editPersonalNotesToggle.addEventListener('click', function() {
            const isEditMode = personalNotesEditMode.style.display !== 'none';
            
            if (isEditMode) {
                // Switch to view mode
                personalNotesEditMode.style.display = 'none';
                personalNotesViewMode.style.display = 'block';
                editPersonalNotesToggle.innerHTML = '<i class="bi bi-pencil me-1"></i>Edit Personal Notes';
                editPersonalNotesToggle.className = 'btn btn-sm btn-outline-primary';
            } else {
                // Switch to edit mode
                personalNotesViewMode.style.display = 'none';
                personalNotesEditMode.style.display = 'block';
                editPersonalNotesToggle.innerHTML = '<i class="bi bi-x me-1"></i>Cancel';
                editPersonalNotesToggle.className = 'btn btn-sm btn-outline-secondary';
            }
        });
    }
    
    // Description section edit toggle
    if (editDescriptionToggle && descriptionViewMode && descriptionEditMode) {
        editDescriptionToggle.addEventListener('click', function() {
            const isEditMode = descriptionEditMode.style.display !== 'none';
            
            if (isEditMode) {
                // Switch to view mode
                descriptionEditMode.style.display = 'none';
                descriptionViewMode.style.display = 'block';
                editDescriptionToggle.innerHTML = '<i class="bi bi-pencil me-1"></i>Edit Description';
                editDescriptionToggle.className = 'btn btn-sm btn-outline-primary';
            } else {
                // Switch to edit mode
                descriptionViewMode.style.display = 'none';
                descriptionEditMode.style.display = 'block';
                editDescriptionToggle.innerHTML = '<i class="bi bi-x me-1"></i>Cancel';
                editDescriptionToggle.className = 'btn btn-sm btn-outline-secondary';
            }
        });
    }
    
    // Additional Details section edit toggle
    if (editAdditionalDetailsToggle && basicInfoViewMode && basicInfoEditMode) {
        editAdditionalDetailsToggle.addEventListener('click', function() {
            const isEditMode = basicInfoEditMode.style.display !== 'none';
            
            if (isEditMode) {
                // Switch to view mode
                basicInfoEditMode.style.display = 'none';
                basicInfoViewMode.style.display = 'block';
                editAdditionalDetailsToggle.innerHTML = '<i class="bi bi-pencil me-1"></i>Edit Additional Details';
                editAdditionalDetailsToggle.className = 'btn btn-sm btn-outline-primary';
            } else {
                // Switch to edit mode
                basicInfoViewMode.style.display = 'none';
                basicInfoEditMode.style.display = 'block';
                editAdditionalDetailsToggle.innerHTML = '<i class="bi bi-x me-1"></i>Cancel';
                editAdditionalDetailsToggle.className = 'btn btn-sm btn-outline-secondary';
            }
        });
    }
    
    // Custom Fields section edit toggle
    if (editCustomFieldsToggle && customFieldsViewMode && customFieldsEditMode) {
        editCustomFieldsToggle.addEventListener('click', function() {
            const isEditMode = customFieldsEditMode.style.display !== 'none';
            
            if (isEditMode) {
                // Switch to view mode
                customFieldsEditMode.style.display = 'none';
                customFieldsViewMode.style.display = 'block';
                editCustomFieldsToggle.innerHTML = '<i class="bi bi-pencil me-1"></i>Edit Custom Fields';
                editCustomFieldsToggle.className = 'btn btn-sm btn-outline-primary';
            } else {
                // Switch to edit mode
                customFieldsViewMode.style.display = 'none';
                customFieldsEditMode.style.display = 'block';
                editCustomFieldsToggle.innerHTML = '<i class="bi bi-x me-1"></i>Cancel';
                editCustomFieldsToggle.className = 'btn btn-sm btn-outline-secondary';
            }
        });
    }
    
    // Custom Fields cancel button
    const cancelCustomFieldsBtn = document.getElementById('cancelCustomFieldsEdit');
    if (cancelCustomFieldsBtn && customFieldsViewMode && customFieldsEditMode) {
        cancelCustomFieldsBtn.addEventListener('click', function() {
            // Switch to view mode
            customFieldsEditMode.style.display = 'none';
            customFieldsViewMode.style.display = 'block';
            editCustomFieldsToggle.innerHTML = '<i class="bi bi-pencil me-1"></i>Edit Custom Fields';
            editCustomFieldsToggle.className = 'btn btn-sm btn-outline-primary';
        });
    }
    
    // Location loading for edit mode in main card
    const editLocationSelect = document.getElementById('edit_location_id');
    const editLocationSelectDetailed = document.getElementById('edit_location_id_detailed');
    
    function loadLocations(selectElement, currentLocationName) {
        if (!selectElement) return;
        
        fetch('/locations/api/user_locations')
            .then(response => response.json())
            .then(locations => {
                selectElement.innerHTML = '<option value="">Select location...</option>';
                locations.forEach(location => {
                    const option = document.createElement('option');
                    option.value = location.id;
                    option.textContent = location.name;
                    if (location.is_default) {
                        option.textContent += ' (Default)';
                    }
                    if (location.name === currentLocationName) {
                        option.selected = true;
                    }
                    selectElement.appendChild(option);
                });
            })
            .catch(error => {
                console.error('Error loading locations:', error);
                selectElement.innerHTML = '<option value="">Error loading locations</option>';
            });
    }
    
    if (editLocationSelect) {
        const currentEditLocationName = editLocationSelect.getAttribute('data-current-location');
        loadLocations(editLocationSelect, currentEditLocationName);
    }
    
    if (editLocationSelectDetailed) {
        const currentDetailedLocationName = editLocationSelectDetailed.getAttribute('data-current-location');
        loadLocations(editLocationSelectDetailed, currentDetailedLocationName);
    }
    
    // Dynamic ownership/borrowing fields for Basic Information
    const ownershipSelect = document.getElementById('ownership_status');
    const borrowedSection = document.getElementById('borrowed-section');
    const loanedSection = document.getElementById('loaned-section');
    
    // Personal Notes edit mode ownership fields
    const mainOwnershipSelect = document.getElementById('edit-ownership-status');
    const editBorrowedSection = document.getElementById('edit-borrowed-section');
    const editLoanedSection = document.getElementById('edit-loaned-section');
    
    function updateVisibility() {
        if (ownershipSelect && borrowedSection && loanedSection) {
            const ownership = ownershipSelect.value;
            borrowedSection.style.display = ownership === 'borrowed' ? 'block' : 'none';
            loanedSection.style.display = ownership === 'loaned' ? 'block' : 'none';
        }
    }
    
    function updatePersonalNotesVisibility() {
        // Use main card ownership status to control Personal Notes borrowing/loaning sections
        const ownership = mainOwnershipSelect ? mainOwnershipSelect.value : '';
        if (editBorrowedSection && editLoanedSection) {
            editBorrowedSection.style.display = ownership === 'borrowed' ? 'block' : 'none';
            editLoanedSection.style.display = ownership === 'loaned' ? 'block' : 'none';
        }
    }
    
    if (ownershipSelect) {
        ownershipSelect.addEventListener('change', updateVisibility);
        updateVisibility(); // Initial setup
    }
    
    if (mainOwnershipSelect) {
        mainOwnershipSelect.addEventListener('change', updatePersonalNotesVisibility);
        updatePersonalNotesVisibility(); // Initial setup
    }
    
    // Accordion behavior - ensure only one is open at a time
    const accordionItems = document.querySelectorAll('#bookAccordion .accordion-collapse');
    accordionItems.forEach(item => {
        item.addEventListener('show.bs.collapse', function() {
            accordionItems.forEach(otherItem => {
                if (otherItem !== item && otherItem.classList.contains('show')) {
                    const bsCollapse = new bootstrap.Collapse(otherItem, {toggle: false});
                    bsCollapse.hide();
                }
            });
        });
    });
    
    // Cover editing functionality
    initializeCoverEditing();
    initializeMetadataSearch();
    
    // Initialize autocomplete functionality
    initializeAutocomplete();
    
    // Initialize contributor functionality
    initializeContributors();
    
    // Initialize category functionality
    initializeCategories();
});

// ----- Inline Series Autocomplete (View/Edit Page) -----
function initializeInlineSeriesAutocomplete(){
    const input = document.getElementById('edit-series');
    const hiddenId = document.getElementById('inline_series_id');
    const dropdown = document.getElementById('inline-series-autocomplete-dropdown');
    if(!input || !dropdown){ console.warn('[InlineSeries] elements missing'); return; }
    let pending=null, results=[], activeIndex=-1, lastQuery='';
    const csrf = (document.querySelector('meta[name="csrf-token"]')||{}).content || '';

    function clear(){ dropdown.innerHTML=''; dropdown.style.display='none'; results=[]; activeIndex=-1; }
    function esc(s){ return (s||'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); }
    function render(q){
        if(!results.length){
            if(q.length>=2){ dropdown.innerHTML=`<button type='button' class='list-group-item list-group-item-action' data-create='1'>Create new series \"${esc(q)}\"</button>`; dropdown.style.display='block'; }
            else clear();
            return;
        }
        dropdown.innerHTML = results.map((r,i)=>`<button type='button' class='list-group-item list-group-item-action${i===activeIndex?' active':''}' data-id='${r.id}' data-name='${esc(r.name)}'><div class='d-flex justify-content-between'><span>${esc(r.name)}</span><small class='text-muted'>${r.book_count||0} book${(r.book_count||0)===1?'':'s'}</small></div></button>`).join('');
        if(q && !results.find(r=>r.name.toLowerCase()===q.toLowerCase())) dropdown.innerHTML += `<button type='button' class='list-group-item list-group-item-action' data-create='1'>Create new series \"${esc(q)}\"</button>`;
        dropdown.style.display='block';
    }
    function fetchSeries(q){
        if(pending) clearTimeout(pending);
        if(q.length<2){ clear(); hiddenId.value=''; return; }
        pending=setTimeout(()=>{
            fetch(`/series/search?q=${encodeURIComponent(q)}`,{headers:{'Accept':'application/json'}})
              .then(r=>r.ok?r.json():Promise.reject())
              .then(data=>{ console.debug('[InlineSeries][Search]',data); if(data.success) results=data.results||[]; else if(Array.isArray(data)) results=data; else results=[]; activeIndex=-1; render(q); })
              .catch(e=>{ console.warn('[InlineSeries][Error]',e); results=[]; render(q); });
        },200);
    }
    function select(r){ hiddenId.value=r.id; input.value=r.name; clear(); }
    function create(name){ if(!name) return; fetch('/series/create',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json','X-CSRFToken':csrf},body:JSON.stringify({name})})
          .then(r=>r.ok?r.json():Promise.reject())
          .then(d=>{ console.debug('[InlineSeries][Create]',d); if(d.success&&d.series){ hiddenId.value=d.series.id; input.value=d.series.name; clear(); } })
          .catch(e=>console.warn('[InlineSeries][CreateError]',e)); }
    input.addEventListener('input', e=>{ hiddenId.value=''; lastQuery=e.target.value.trim(); fetchSeries(lastQuery); });
    input.addEventListener('keydown', e=>{
        if(dropdown.style.display==='none') return;
        if(['ArrowDown','ArrowUp','Enter','Escape'].includes(e.key)) e.preventDefault();
        const count=Math.max(results.length,1);
        if(e.key==='ArrowDown'){ activeIndex=(activeIndex+1)%count; render(lastQuery); }
        else if(e.key==='ArrowUp'){ activeIndex=activeIndex<=0?count-1:activeIndex-1; render(lastQuery); }
        else if(e.key==='Enter'){ if(activeIndex>=0 && results[activeIndex]) select(results[activeIndex]); else if(!results.find(r=>r.name.toLowerCase()===lastQuery.toLowerCase())) create(lastQuery); }
        else if(e.key==='Escape'){ clear(); }
    });
    dropdown.addEventListener('click', e=>{ const b=e.target.closest('button'); if(!b) return; if(b.dataset.create==='1'){ create(lastQuery); } else { select({id:b.dataset.id, name:b.dataset.name}); } });
    document.addEventListener('click', e=>{ if(!dropdown.contains(e.target) && e.target!==input) clear(); });
    console.debug('[InlineSeries] initialized');
}

function initializeCoverEditing() {
    // Initialize the cover edit button
    const coverEditBtn = document.getElementById('coverEditBtn');
    if (coverEditBtn) {
        coverEditBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            // Show dropdown menu for cover options
            showCoverEditOptions();
        });
    }
}

function showCoverEditOptions() {
    // Create a simple dropdown menu for cover editing options
    const existingDropdown = document.getElementById('coverEditDropdown');
    if (existingDropdown) {
        existingDropdown.remove();
    }
    
    const dropdown = document.createElement('div');
    dropdown.id = 'coverEditDropdown';
    dropdown.className = 'dropdown-menu show position-absolute';
    dropdown.style.cssText = 'z-index: 1050; top: 40px; right: 0px;';
    
    const isbn = (BOOK_METADATA_CONTEXT.isbn13 || BOOK_METADATA_CONTEXT.isbn10 || '');
    const title = BOOK_METADATA_CONTEXT.title;
    const author = (BOOK_METADATA_CONTEXT.primary_author || '');
    
    dropdown.innerHTML = `
        <button class="dropdown-item" type="button" id="searchByISBN">
            <i class="bi bi-upc-scan me-2"></i>Search by ISBN
        </button>
        ${title && author ? `
        <button class="dropdown-item" type="button" id="searchByTitle">
            <i class="bi bi-search me-2"></i>Search by Title & Author
        </button>
        ` : ''}
        <div class="dropdown-divider"></div>
        <button class="dropdown-item" type="button" id="uploadFile">
            <i class="bi bi-upload me-2"></i>Upload from Device
        </button>
    `;
    
    // Position dropdown relative to the button
    const coverEditBtn = document.getElementById('coverEditBtn');
    const btnRect = coverEditBtn.getBoundingClientRect();
    const container = coverEditBtn.closest('.position-relative') || coverEditBtn.parentElement;
    container.style.position = 'relative';
    container.appendChild(dropdown);
    
    // Add event listeners to dropdown buttons
    const searchISBNBtn = document.getElementById('searchByISBN');
    if (searchISBNBtn) {
        searchISBNBtn.addEventListener('click', function() {
            // Don't remove dropdown yet so we can show loading state on the button
            let queryIsbn = isbn;
            try { queryIsbn = (queryIsbn || '').toString(); } catch(e) { queryIsbn = ''; }
            if (!queryIsbn) {
                // Prompt user for ISBN if not present on the page
                const input = window.prompt('Enter ISBN-10 or ISBN-13');
                if (!input) return; // user canceled
                queryIsbn = input;
            }
            fetchCoverFromAPI(queryIsbn, 'isbn');
        });
    }
    
    if (title && author) {
        const searchTitleBtn = document.getElementById('searchByTitle');
        if (searchTitleBtn) {
            searchTitleBtn.addEventListener('click', function() {
                // Don't remove dropdown yet so we can show loading state on the button
                fetchCoverFromAPI(`${title} ${author}`, 'title');
            });
        }
    }
    
    const uploadBtn = document.getElementById('uploadFile');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', function() {
            dropdown.remove();
            showFileUploadModal();
        });
    }
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function closeDropdown(e) {
        if (!dropdown.contains(e.target) && e.target !== coverEditBtn) {
            dropdown.remove();
            document.removeEventListener('click', closeDropdown);
        }
    });
}

function fetchCoverFromAPI(query, type) {
    const fetchBtn = type === 'isbn' ? document.getElementById('searchByISBN') : document.getElementById('searchByTitle');
    let originalText = '';
    
    if (fetchBtn) {
        originalText = fetchBtn.innerHTML;
        // Show loading state
        fetchBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Searching...';
        fetchBtn.disabled = true;
    }
    
    let endpoint;
    let fetchOptions = {
        method: 'GET'
    };
    
    if (type === 'isbn') {
        // Use new cover candidates endpoint for richer selection when searching by ISBN
        const cleanIsbn = String(query || '').replace(/[^0-9Xx]/g, '');
        endpoint = `${METADATA_ENDPOINTS.coverCandidates}?isbn=${cleanIsbn}`;
    } else {
        // For title/author searches, use the search_book_details endpoint
        endpoint = METADATA_ENDPOINTS.search;
        fetchOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': CSRF_TOKEN
            },
            body: JSON.stringify({
                'title': BOOK_METADATA_CONTEXT.title,
                'author': (BOOK_METADATA_CONTEXT.primary_author || '')
            })
        };
    }
    
    fetch(endpoint, fetchOptions)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // For both paths now, prefer showing a selection modal with candidates
            if (data && data.success && Array.isArray(data.results) && data.results.length > 0) {
                showCoverSelectionModal(data.results);
            } else {
                const message = (data && data.message) ? data.message : (type === 'isbn' ? 'No cover image found for this ISBN.' : 'No cover options found for this book.');
                alert(message);
            }
        })
        .catch(error => {
            console.error('Error fetching cover:', error);
            alert('Failed to fetch cover image. Please try again.');
        })
        .finally(() => {
            // Restore button state
            if (fetchBtn) {
                fetchBtn.innerHTML = originalText;
                fetchBtn.disabled = false;
            }
            // Close dropdown if it exists
            const dropdown = document.getElementById('coverEditDropdown');
            if (dropdown) {
                dropdown.remove();
            }
        });
}

function applyCoverUrl(coverUrl) {
    // Show loading state
    const currentCover = document.getElementById('coverEditBtn');
    if (currentCover) {
        currentCover.innerHTML = '<i class="bi bi-hourglass-split"></i>';
        currentCover.disabled = true;
    }
    
    // Send request to replace the current cover file with new image
    fetch(METADATA_ENDPOINTS.replaceCover, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': CSRF_TOKEN
        },
        body: JSON.stringify({
            'new_cover_url': coverUrl
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Update the main cover image if visible
            const mainCoverImg = document.querySelector('#book-cover');
            if (mainCoverImg) {
                // If it's an img element, update src; if it's a div, replace with img
                if (mainCoverImg.tagName === 'IMG') {
                    mainCoverImg.src = data.cover_url + '?t=' + Date.now(); // Cache bust
                } else {
                    // Replace the div with an img element
                    mainCoverImg.outerHTML = `<img src="${data.cover_url}?t=${Date.now()}" alt="${BOOK_METADATA_CONTEXT.title}" 
                         class="img-fluid rounded shadow-sm" style="max-height: 490px; max-width: 350px; width: auto; height: auto; object-fit: contain;" id="book-cover"
                         onerror="this.onerror=null;this.src='${METADATA_ENDPOINTS.fallbackCover}';">`;
                }
            }
            
            alert('Cover updated successfully!');
        } else {
            alert('Failed to update cover: ' + (data.error || 'Unknown error'));
        }
    })
    .catch(error => {
        console.error('Error updating cover:', error);
        alert('Failed to update cover. Please try again.');
    })
    .finally(() => {
        // Restore button state
        if (currentCover) {
            currentCover.innerHTML = '<i class="bi bi-image"></i>';
            currentCover.disabled = false;
        }
    });
}

let metadataSearchResults = [];
let metadataModalInstance = null;

function initializeMetadataSearch() {
    const metadataBtn = document.getElementById('metadataSearchBtn');
    if (!metadataBtn) {
        return;
    }
    metadataBtn.addEventListener('click', function(event) {
        event.preventDefault();
        event.stopPropagation();
        openMetadataSearchModal();
    });
}

function openMetadataSearchModal() {
    const existingModal = document.getElementById('metadataSearchModal');
    if (existingModal) {
        existingModal.remove();
    }

    const modalHTML = `
        <div class="modal fade" id="metadataSearchModal" tabindex="-1" aria-labelledby="metadataSearchModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-lg modal-dialog-scrollable">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="metadataSearchModalLabel">
                            <i class="bi bi-upc-scan me-2"></i>Search Book Metadata
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div id="metadataSearchStatus" class="alert alert-info d-flex align-items-center" role="alert">
                            <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            Searching for the best match...
                        </div>
                        <div id="metadataResultsContainer" class="mt-3"></div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modalEl = document.getElementById('metadataSearchModal');
    metadataModalInstance = new bootstrap.Modal(modalEl);
    modalEl.addEventListener('hidden.bs.modal', function() {
        metadataModalInstance = null;
        this.remove();
    });
    metadataModalInstance.show();
    runMetadataSearch(modalEl);
}

async function runMetadataSearch(modalEl) {
    const statusEl = modalEl.querySelector('#metadataSearchStatus');
    const resultsContainer = modalEl.querySelector('#metadataResultsContainer');
    if (statusEl) {
        statusEl.className = 'alert alert-info d-flex align-items-center';
        statusEl.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Searching for the best match...';
    }
    if (resultsContainer) {
        resultsContainer.innerHTML = '';
    }

    metadataSearchResults = [];
    const aggregated = [];
    const seenKeys = new Set();
    const timedOutProviderLabels = new Set();
    const pushResult = (normalized) => {
        if (!normalized) {
            return;
        }
        const keyBasis = normalized.isbn13 || normalized.isbn10 || `${(normalized.title || '').toLowerCase()}|${(normalized.authors || []).join(',').toLowerCase()}`;
        const key = keyBasis || Math.random().toString(36).slice(2);
        if (seenKeys.has(key)) {
            return;
        }
        seenKeys.add(key);
        aggregated.push(normalized);
    };

    const isbnCandidates = [];
    if (BOOK_METADATA_CONTEXT && BOOK_METADATA_CONTEXT.isbn13) {
        isbnCandidates.push(String(BOOK_METADATA_CONTEXT.isbn13));
    }
    if (BOOK_METADATA_CONTEXT && BOOK_METADATA_CONTEXT.isbn10) {
        const isbn10 = String(BOOK_METADATA_CONTEXT.isbn10);
        if (!isbnCandidates.includes(isbn10)) {
            isbnCandidates.push(isbn10);
        }
    }

    let isbnMatched = false;
    for (const candidate of isbnCandidates) {
        const clean = (candidate || '').trim();
        if (!clean) {
            continue;
        }
        try {
            const endpoint = METADATA_ENDPOINTS.fetchByIsbn.replace('__ISBN__PLACEHOLDER__', encodeURIComponent(clean));
            const response = await fetchWithTimeout(endpoint, { headers: { 'Accept': 'application/json' } }, METADATA_ISBN_TIMEOUT_MS);
            if (response.ok) {
                const data = await response.json();
                const normalized = normalizeMetadataResult(data, 'ISBN Lookup');
                if (normalized) {
                    normalized._priority = 0;
                    normalized._viaIsbn = true;
                    pushResult(normalized);
                    isbnMatched = true;
                    break;
                }
            }
        } catch (error) {
            if (error && (error.name === 'TimeoutError' || (typeof error.message === 'string' && error.message.toLowerCase().includes('timeout')))) {
                timedOutProviderLabels.add('ISBN lookup');
                console.warn('[MetadataSearch] ISBN lookup timed out', error);
            } else if (error && error.name === 'AbortError') {
                timedOutProviderLabels.add('ISBN lookup');
                console.warn('[MetadataSearch] ISBN lookup aborted', error);
            } else {
                console.warn('[MetadataSearch] ISBN lookup failed', error);
            }
        }
    }

    const title = (BOOK_METADATA_CONTEXT && BOOK_METADATA_CONTEXT.title ? BOOK_METADATA_CONTEXT.title : '').trim();
    const authorParts = (BOOK_METADATA_CONTEXT && Array.isArray(BOOK_METADATA_CONTEXT.authors)) ? BOOK_METADATA_CONTEXT.authors.filter(Boolean) : [];
    if (!authorParts.length && BOOK_METADATA_CONTEXT && BOOK_METADATA_CONTEXT.primary_author) {
        authorParts.push(BOOK_METADATA_CONTEXT.primary_author);
    }
    const author = authorParts.join(', ').trim();

    if (title || author) {
        try {
            const payload = {};
            if (title) {
                payload.title = title;
            }
            if (author) {
                payload.author = author;
            }
            const response = await fetch(METADATA_ENDPOINTS.search, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRFToken': CSRF_TOKEN
                },
                body: JSON.stringify(payload)
            }, METADATA_SEARCH_TIMEOUT_MS);
            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data.timed_out_providers) && data.timed_out_providers.length) {
                    data.timed_out_providers.forEach(provider => {
                        if (typeof provider === 'string' && provider.trim()) {
                            const normalizedLabel = provider.trim().toLowerCase();
                            const labelMap = {
                                openlibrary: 'OpenLibrary',
                                google: 'Google Books',
                                googlebooks: 'Google Books'
                            };
                            timedOutProviderLabels.add(labelMap[normalizedLabel] || provider.trim());
                        }
                    });
                }
                if (data && Array.isArray(data.results)) {
                    data.results.forEach(raw => {
                        const normalized = normalizeMetadataResult(raw, (raw && raw.source) || 'Online Search');
                        if (normalized) {
                            normalized._priority = normalized._viaIsbn ? 0 : (isbnMatched ? 1 : 0);
                            pushResult(normalized);
                        }
                    });
                } else if (statusEl) {
                    statusEl.className = 'alert alert-warning';
                    statusEl.innerHTML = '<i class="bi bi-exclamation-triangle me-2"></i>No additional matches were found.';
                }
            }
        } catch (error) {
            if (error && (error.name === 'TimeoutError' || (typeof error.message === 'string' && error.message.toLowerCase().includes('timeout')))) {
                timedOutProviderLabels.add('Title/author search');
                console.warn('[MetadataSearch] Title/author search timed out', error);
            } else if (error && error.name === 'AbortError') {
                timedOutProviderLabels.add('Title/author search');
                console.warn('[MetadataSearch] Title/author search aborted', error);
            } else {
                console.warn('[MetadataSearch] Title/author search failed', error);
            }
        }
    }

    if (!aggregated.length) {
        if (statusEl) {
            const providers = Array.from(timedOutProviderLabels);
            if (providers.length) {
                statusEl.className = 'alert alert-warning d-flex align-items-start';
                statusEl.innerHTML = `<i class="bi bi-hourglass-split me-2 mt-1"></i><div>Metadata search timed out while contacting: ${providers.join(', ')}. Try again in a moment or verify your connection.</div>`;
            } else {
                statusEl.className = 'alert alert-warning d-flex align-items-center';
                statusEl.innerHTML = '<i class="bi bi-exclamation-triangle me-2"></i>No metadata matches found. Try adding an ISBN or refining the book title and author.';
            }
        }
        return;
    }

    aggregated.sort((a, b) => (a._priority ?? 1) - (b._priority ?? 1));
    metadataSearchResults = aggregated;

    if (statusEl) {
        const providers = Array.from(timedOutProviderLabels);
        const baseMessage = `Found ${aggregated.length} option${aggregated.length === 1 ? '' : 's'}. Select one to apply.`;
        if (providers.length) {
            statusEl.className = 'alert alert-success';
            statusEl.innerHTML = `
                <div class="d-flex align-items-start">
                    <i class="bi bi-check-circle me-2 mt-1"></i>
                    <div>
                        <div>${baseMessage}</div>
                        <div class="small text-muted mt-1">Some providers timed out: ${providers.join(', ')}. Results may be partial.</div>
                    </div>
                </div>
            `;
        } else {
            statusEl.className = 'alert alert-success d-flex align-items-center';
            statusEl.innerHTML = `<i class="bi bi-check-circle me-2"></i>${baseMessage}`;
        }
    }
    if (resultsContainer) {
        renderMetadataResults(metadataSearchResults, resultsContainer);
    }
}

function normalizeMetadataResult(raw, fallbackSource) {
    if (!raw || typeof raw !== 'object') {
        return null;
    }

    const authors = [];
    if (Array.isArray(raw.authors_list)) {
        raw.authors_list.forEach(name => {
            if (name) authors.push(String(name).trim());
        });
    } else if (Array.isArray(raw.authors)) {
        raw.authors.forEach(name => {
            if (name) authors.push(String(name).trim());
        });
    } else if (raw.authors && typeof raw.authors === 'string') {
        raw.authors.split(',').forEach(name => {
            if (name) authors.push(name.trim());
        });
    } else if (raw.author && typeof raw.author === 'string') {
        raw.author.split(',').forEach(name => {
            if (name) authors.push(name.trim());
        });
    }

    const publisher = (() => {
        if (typeof raw.publisher === 'string') {
            return raw.publisher;
        }
        if (raw.publisher && typeof raw.publisher === 'object') {
            if (raw.publisher.name) return raw.publisher.name;
            if (raw.publisher.title) return raw.publisher.title;
        }
        if (Array.isArray(raw.publishers) && raw.publishers.length) {
            return String(raw.publishers[0]);
        }
        return '';
    })();

    const descriptionCandidate = raw.description || raw.summary || '';
    const description = typeof descriptionCandidate === 'string' ? descriptionCandidate : '';
    const cleanDescription = description.replace(/<[^>]*>/g, '');

    const isbnList = Array.isArray(raw.isbn_list) ? raw.isbn_list.map(String) : [];
    const isbn13 = raw.isbn13 || raw.isbn_13 || raw.isbn || isbnList.find(code => code && code.replace(/\D/g, '').length === 13) || '';
    const isbn10 = raw.isbn10 || raw.isbn_10 || isbnList.find(code => code && code.replace(/\D/g, '').length === 10) || '';
    const publishedDate = raw.published_date || raw.publication_date || raw.publication_year || raw.release_date || '';
    const language = raw.language || raw.language_code || raw.lang || '';
    const googleId = raw.google_books_id || raw.google_id || '';
    const openlibraryId = raw.openlibrary_id || raw.olid || raw.open_library_id || '';
    const asin = raw.asin || raw.amazon_id || '';
    const averageRating = raw.average_rating ?? raw.global_average_rating ?? raw.rating ?? null;
    const ratingCount = raw.rating_count ?? raw.ratings_count ?? raw.reviews ?? null;
    const coverUrl = raw.cover_url || raw.cover || (raw.imageLinks && (raw.imageLinks.large || raw.imageLinks.medium || raw.imageLinks.thumbnail)) || '';
    const categoriesCandidate = Array.isArray(raw.categories) ? raw.categories : (Array.isArray(raw.subjects) ? raw.subjects : []);
    const seriesName = raw.series || raw.series_name || (raw.series && raw.series.title) || '';
    const seriesOrder = raw.series_order || raw.number || raw.volume_number || '';
    const seriesVolume = raw.series_volume || raw.volume || '';
    const rawCategoryPaths = Array.isArray(raw.raw_category_paths)
        ? raw.raw_category_paths.filter(Boolean).map(String)
        : [];
    const normalizedCategories = (Array.isArray(categoriesCandidate) ? categoriesCandidate : [])
        .filter(Boolean)
        .map(String);

    return {
        title: raw.title || '',
        subtitle: raw.subtitle || '',
        authors: authors.filter(Boolean),
        description: cleanDescription,
        publisher,
        isbn13,
        isbn10,
        published_date: publishedDate,
        language: typeof language === 'string' ? language : '',
        average_rating: averageRating,
        rating_count: ratingCount,
        google_books_id: googleId,
        openlibrary_id: openlibraryId,
        asin,
        cover_url: coverUrl,
    categories: normalizedCategories,
    raw_category_paths: rawCategoryPaths,
        series: typeof seriesName === 'string' ? seriesName : '',
        series_order: seriesOrder,
        series_volume: seriesVolume,
        source: raw.source || fallbackSource || 'Online Search',
        raw
    };
}

function renderMetadataResults(results, container) {
    const cards = results.map((result, index) => {
        const title = escapeHtml(result.title || 'Untitled');
        const subtitle = escapeHtml(result.subtitle || '');
        const authors = result.authors && result.authors.length ? escapeHtml(result.authors.join(', ')) : 'Unknown author';
        const publisher = result.publisher ? `<span class="me-3"><strong>Publisher:</strong> ${escapeHtml(result.publisher)}</span>` : '';
        const published = result.published_date ? `<span class="me-3"><strong>Published:</strong> ${escapeHtml(result.published_date)}</span>` : '';
        const isbn13 = result.isbn13 ? `<span class="me-3"><strong>ISBN-13:</strong> <code>${escapeHtml(result.isbn13)}</code></span>` : '';
        const isbn10 = result.isbn10 ? `<span class="me-3"><strong>ISBN-10:</strong> <code>${escapeHtml(result.isbn10)}</code></span>` : '';
        const language = result.language ? `<span class="me-3"><strong>Language:</strong> ${escapeHtml(result.language)}</span>` : '';
        const rating = result.average_rating != null ? `<span class="badge bg-warning-subtle text-warning-emphasis border"><i class="bi bi-star-fill me-1"></i>${escapeHtml(result.average_rating)}</span>` : '';
        const ratingCount = result.rating_count != null ? `<span class="badge bg-light text-muted border"><i class="bi bi-people me-1"></i>${escapeHtml(result.rating_count)}</span>` : '';
        const categories = (result.categories || []).slice(0, 3).map(cat => `<span class="badge bg-secondary-subtle text-secondary-emphasis me-1">${escapeHtml(cat)}</span>`).join('');
        const description = result.description ? `<p class="small text-muted mb-0">${escapeHtml(truncateText(result.description, 260))}</p>` : '';
        const cover = result.cover_url ? `<div class="flex-shrink-0 text-center"><img src="${escapeHtml(result.cover_url)}" alt="Cover preview" class="rounded shadow-sm" style="max-width: 120px; max-height: 180px; object-fit: cover;"><div class="small text-muted mt-2">${escapeHtml(result.source || 'Online Search')}</div></div>` : `<div class="flex-shrink-0 small text-muted text-center"><i class="bi bi-journal-text fs-3"></i><div>${escapeHtml(result.source || 'Online Search')}</div></div>`;

        return `
            <div class="card mb-3 shadow-sm metadata-result-card" data-result-index="${index}">
                <div class="card-body">
                    <div class="d-flex flex-column flex-lg-row gap-3 align-items-stretch">
                        <div class="flex-grow-1">
                            <h5 class="mb-1">${title}</h5>
                            ${subtitle ? `<p class="text-muted mb-1">${subtitle}</p>` : ''}
                            <p class="small text-muted mb-2">by ${authors}
                                ${result.series ? `<span class="ms-2 badge bg-primary-subtle text-primary-emphasis">${escapeHtml(result.series)}${result.series_order ? ` #${escapeHtml(result.series_order)}` : ''}</span>` : ''}
                            </p>
                            <div class="small text-muted mb-2 d-flex flex-wrap align-items-center">
                                ${publisher}
                                ${published}
                                ${isbn13}
                                ${isbn10}
                                ${language}
                            </div>
                            ${categories ? `<div class="mb-2">${categories}</div>` : ''}
                            ${description}
                            <div class="d-flex gap-2 mt-2">
                                ${rating}
                                ${ratingCount}
                            </div>
                        </div>
                        ${cover}
                    </div>
                    <div class="d-flex justify-content-between align-items-center mt-3">
                        <small class="text-muted"><i class="bi bi-database me-1"></i>${escapeHtml(result.source || 'Online Search')}</small>
                        <button type="button" class="btn btn-primary btn-sm" data-apply-result="${index}">
                            <i class="bi bi-download me-1"></i>Apply Metadata
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = cards;

    if (!container.dataset.listenerAttached) {
        container.addEventListener('click', function(event) {
            const applyBtn = event.target.closest('[data-apply-result]');
            if (!applyBtn) {
                return;
            }
            event.preventDefault();
            const index = parseInt(applyBtn.getAttribute('data-apply-result'), 10);
            if (!Number.isNaN(index)) {
                applyMetadataResult(index);
            }
        });
        container.dataset.listenerAttached = 'true';
    }
}

function applyMetadataResult(index) {
    const result = metadataSearchResults[index];
    if (!result) {
        return;
    }
    applyMetadataToForms(result);
    if (metadataModalInstance) {
        metadataModalInstance.hide();
    }
    if (result.cover_url) {
        window.metadataCoverCandidate = result.cover_url;
    }
    const noticeMessage = result.cover_url
        ? 'Metadata applied to the edit form. Review and save changes to keep them. Need a new cover? Re-run the cover search to apply the suggested artwork.'
        : 'Metadata applied to the edit form. Review and save changes to keep them.';
    showMetadataNotice(noticeMessage, 'success');
}

function applyMetadataToForms(result) {
    const editMode = document.querySelector('.edit-mode');
    const editToggle = document.getElementById('editToggle');
    const isEditActive = editMode && editMode.style.display !== 'none';
    if (editToggle && !isEditActive) {
        editToggle.click();
    }

    const setValue = (id, value) => {
        if (value === undefined || value === null || value === '') {
            return;
        }
        const input = document.getElementById(id);
        if (!input) {
            return;
        }
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
    };

    setValue('edit-title', result.title || (BOOK_METADATA_CONTEXT && BOOK_METADATA_CONTEXT.title) || '');
    setValue('edit-subtitle', result.subtitle || '');
    if (result.series) setValue('edit-series', result.series);
    const inlineSeriesIdInput = document.getElementById('inline_series_id');
    if (inlineSeriesIdInput) {
        inlineSeriesIdInput.value = '';
    }
    if (result.series_volume) setValue('edit-series-volume', result.series_volume);
    if (result.series_order) setValue('edit-series-order', result.series_order);
    setValue('publisher', result.publisher || '');
    setValue('isbn13', result.isbn13 || '');
    setValue('isbn10', result.isbn10 || '');
    setValue('published_date', result.published_date || '');
    if (result.language) {
        setSelectValue('language', result.language);
    }
    setValue('asin', result.asin || '');
    setValue('google_books_id', result.google_books_id || '');
    setValue('openlibrary_id', result.openlibrary_id || '');
    if (result.average_rating !== undefined && result.average_rating !== null) {
        setValue('average_rating', result.average_rating);
    }
    if (result.rating_count !== undefined && result.rating_count !== null) {
        setValue('rating_count', result.rating_count);
    }

    const descriptionEl = document.getElementById('edit-description');
    if (descriptionEl && result.description) {
        descriptionEl.value = result.description;
        descriptionEl.dispatchEvent(new Event('input', { bubbles: true }));
    }

    if (Array.isArray(result.authors) && result.authors.length) {
        replaceContributors('authored', result.authors);
    }

    const rawCategoryPaths = Array.isArray(result.raw_category_paths) ? result.raw_category_paths.filter(Boolean) : [];
    let categoryCandidates = Array.isArray(result.categories) ? result.categories.filter(Boolean) : [];
    if (rawCategoryPaths.length && (categoryCandidates.length <= 1 || rawCategoryPaths.length > categoryCandidates.length)) {
        categoryCandidates = rawCategoryPaths;
    }
    if (categoryCandidates.length) {
        replaceCategories(categoryCandidates, rawCategoryPaths.length ? rawCategoryPaths : categoryCandidates);
    }

    if (window.updateContributorHiddenInputs) {
        window.updateContributorHiddenInputs();
    }
    if (window.updateCategoryHiddenInputs) {
        window.updateCategoryHiddenInputs();
    }
}

function setSelectValue(selectId, value) {
    const select = document.getElementById(selectId);
    if (!select || value === undefined || value === null) {
        return;
    }
    const languageMap = {
        'english': 'en', 'eng': 'en', 'en-us': 'en', 'en_gb': 'en',
        'spanish': 'es', 'spa': 'es',
        'french': 'fr', 'fre': 'fr', 'fra': 'fr',
        'german': 'de', 'ger': 'de', 'deu': 'de',
        'italian': 'it', 'ita': 'it',
        'portuguese': 'pt', 'por': 'pt',
        'russian': 'ru', 'rus': 'ru',
        'japanese': 'ja', 'jpn': 'ja',
        'korean': 'ko', 'kor': 'ko',
        'chinese': 'zh', 'chi': 'zh', 'zho': 'zh',
        'arabic': 'ar', 'ara': 'ar',
        'hindi': 'hi', 'hin': 'hi'
    };
    const normalized = String(value).trim();
    const mapped = languageMap[normalized.toLowerCase()] || normalized;
    let option = Array.from(select.options).find(opt => opt.value === mapped);
    if (!option) {
        option = new Option(mapped.toUpperCase(), mapped, true, true);
        select.appendChild(option);
    }
    select.value = mapped;
    select.dispatchEvent(new Event('change', { bubbles: true }));
}

function replaceContributors(type, names) {
    const section = document.querySelector(`.contributor-section[data-type="${type}"]`);
    if (!section) {
        return;
    }
    const display = section.querySelector('.contributors-display');
    if (!display) {
        return;
    }
    display.innerHTML = '';
    names.forEach(name => {
        const trimmed = (name || '').trim();
        if (!trimmed) {
            return;
        }
        const tag = document.createElement('div');
        tag.className = 'contributor-tag';
        tag.dataset.id = '';
        tag.dataset.name = trimmed;
        tag.dataset.new = 'true';
        tag.innerHTML = `${escapeHtml(trimmed)}<span class="remove" onclick="removeContributor(this)">×</span>`;
        display.appendChild(tag);
    });
}

function replaceCategories(categories, rawCategoryCandidates) {
    const section = document.querySelector('.category-section[data-type="category"]');
    if (!section || !Array.isArray(categories)) {
        return;
    }

    const display = section.querySelector('.categories-display');
    if (!display) {
        return;
    }

    const rawCandidates = Array.isArray(rawCategoryCandidates) ? rawCategoryCandidates : categories;
    if (!window.rawCategoryPaths || !(window.rawCategoryPaths instanceof Set)) {
        window.rawCategoryPaths = new Set();
    } else {
        window.rawCategoryPaths.clear();
    }

    rawCandidates.forEach(value => {
        const trimmed = (value || '').trim();
        if (trimmed) {
            window.rawCategoryPaths.add(trimmed);
        }
    });

    display.innerHTML = '';
    const seen = new Set();

    const addCategoryTag = (name) => {
        const trimmed = (name || '').trim();
        if (!trimmed) {
            return;
        }
        const normalized = trimmed.toLowerCase();
        if (seen.has(normalized)) {
            return;
        }
        seen.add(normalized);
        const tag = document.createElement('div');
        tag.className = 'category-tag';
        tag.dataset.id = '';
        tag.dataset.name = trimmed;
        tag.dataset.new = 'true';
        tag.innerHTML = `${escapeHtml(trimmed)}<span class="remove" onclick="removeCategory(this)">×</span>`;
        display.appendChild(tag);
    };

    categories.forEach(value => {
        const trimmed = (value || '').trim();
        if (!trimmed) {
            return;
        }
        const segments = splitCategoryPath(trimmed);
        if (segments.length > 1) {
            segments.forEach(addCategoryTag);
        } else {
            addCategoryTag(trimmed);
        }
    });
}

function splitCategoryPath(value) {
    if (typeof value !== 'string') {
        return [];
    }
    return value
        .split(/[>\/]/)
        .map(part => part.trim())
        .filter(Boolean);
}

function showMetadataNotice(message, variant = 'info') {
    const container = document.querySelector('.container-fluid');
    if (!container) {
        alert(message);
        return;
    }
    let alertEl = document.getElementById('metadataApplyAlert');
    if (alertEl) {
        alertEl.remove();
    }
    alertEl = document.createElement('div');
    alertEl.id = 'metadataApplyAlert';
    alertEl.className = `alert alert-${variant} alert-dismissible fade show`;
    alertEl.role = 'alert';
    alertEl.innerHTML = `
        ${escapeHtml(message)}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    container.insertAdjacentElement('afterbegin', alertEl);
    setTimeout(() => {
        try {
            const bsAlert = new bootstrap.Alert(alertEl);
            bsAlert.close();
        } catch (error) {
            alertEl.remove();
        }
    }, 6000);
}

function escapeHtml(value) {
    if (value === null || value === undefined) {
        return '';
    }
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function truncateText(text, limit = 220) {
    if (!text) {
        return '';
    }
    const trimmed = text.trim();
    if (trimmed.length <= limit) {
        return trimmed;
    }
    return `${trimmed.substring(0, limit - 1)}…`;
}

function showCoverSelectionModal(results) {
    // Filter results that have valid cover images
    const resultsWithCovers = results.filter(result => {
        // Check if cover_url exists and is not empty
        if (!result.cover_url || result.cover_url.trim() === '') {
            return false;
        }
        
        // Only filter out obvious placeholders - be less strict since backend validates
        const url = result.cover_url.toLowerCase();
        if (url.includes('placeholder') || 
            url.includes('no-image') || 
            url.includes('not-available') ||
            url.includes('default.jpg') ||
            url.includes('missing.jpg')) {
            return false;
        }
        
        return true;
    });
    
    if (resultsWithCovers.length === 0) {
        alert('No cover images found in the search results.');
        return;
    }
    
    // Create modal HTML
    const modalHTML = `
        <div class="modal fade" id="coverSelectionModal" tabindex="-1" aria-labelledby="coverSelectionModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="coverSelectionModalLabel">
                            <i class="bi bi-images me-2"></i>Select Cover Image
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <p class="text-muted mb-3">Choose a cover image from the search results:</p>
                        <div class="row g-3" id="coverOptions">
                            ${resultsWithCovers.map((result, index) => {
                                // Clean and escape the data
                                const title = (result.title || 'Unknown Title').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                                const authors = result.authors_list ? 
                                    result.authors_list.join(', ').replace(/"/g, '&quot;').replace(/'/g, '&#39;') : 
                                    (result.authors || 'Unknown Author').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                                const publishedDate = result.published_date ? 
                                    result.published_date.replace(/"/g, '&quot;').replace(/'/g, '&#39;') : '';
                                const coverUrl = result.cover_url.replace(/"/g, '&quot;');
                                
                                return `
                                <div class="col-md-4 col-sm-6">
                                    <div class="card h-100 cover-option" data-cover-url="${coverUrl}" style="cursor: pointer;">
                                        <div class="card-img-top d-flex align-items-center justify-content-center" style="height: 250px; background-color: #f8f9fa;" id="img-container-${index}">
                                            <img src="${coverUrl}" 
                                                 alt="Cover ${index + 1}" 
                                                 class="img-fluid rounded"
                                                 style="max-height: 240px; max-width: 100%; object-fit: contain;"
                                                 data-container-id="img-container-${index}">
                                        </div>
                                        <div class="card-body p-2">
                                            <h6 class="card-title small mb-1" title="${title}">${title.length > 50 ? title.substring(0, 50) + '...' : title}</h6>
                                            <p class="card-text small text-muted mb-0" title="${authors}">
                                                ${authors.length > 40 ? authors.substring(0, 40) + '...' : authors}
                                            </p>
                                            ${publishedDate ? `<p class="card-text small text-muted mb-0">${publishedDate}</p>` : ''}
                                        </div>
                                    </div>
                                </div>`;
                            }).join('')}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if present
    const existingModal = document.getElementById('coverSelectionModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Show the modal first
    const modal = new bootstrap.Modal(document.getElementById('coverSelectionModal'));
    modal.show();
    
    // Add click handlers to cover options AFTER modal is in DOM
    setTimeout(() => {
        document.querySelectorAll('.cover-option').forEach(option => {
            option.addEventListener('click', function() {
                const coverUrl = this.dataset.coverUrl;
                
                // Close the modal first
                modal.hide();
                
                // Apply the cover
                applyCoverUrl(coverUrl);
            });
            
            // Add hover effect
            option.addEventListener('mouseenter', function() {
                this.style.transform = 'scale(1.02)';
                this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                this.style.transition = 'all 0.2s ease';
            });
            
            option.addEventListener('mouseleave', function() {
                this.style.transform = 'scale(1)';
                this.style.boxShadow = '';
            });
        });
        
        // Add proper image load/error handlers
        document.querySelectorAll('.cover-option img').forEach(img => {
            img.addEventListener('error', function() {
                const containerId = this.dataset.containerId;
                const container = document.getElementById(containerId);
                if (container) {
                    container.innerHTML = '<div class="text-muted text-center p-3"><i class="bi bi-exclamation-triangle"></i><br><small>Image failed to load</small></div>';
                }
            });
        });
    }, 100);
    
    // Clean up when modal is hidden
    document.getElementById('coverSelectionModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

function showFileUploadModal() {
    // Create file upload modal HTML
    const modalHTML = `
        <div class="modal fade" id="fileUploadModal" tabindex="-1" aria-labelledby="fileUploadModalLabel" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="fileUploadModalLabel">
                            <i class="bi bi-upload me-2"></i>Upload Cover Image
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <p class="text-muted mb-3">Select an image file from your device to use as the book cover:</p>
                        <div class="mb-3">
                            <input type="file" class="form-control" id="coverFileInput" accept="image/*">
                            <div class="form-text">Supported formats: JPG, PNG, GIF. Maximum size: 10MB</div>
                        </div>
                        <div id="imagePreview" class="text-center mb-3" style="display: none;">
                            <img id="previewImg" class="img-fluid rounded" style="max-height: 200px;">
                            <p class="text-muted mt-2" id="previewText"></p>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" id="uploadCoverBtn" disabled>
                            <i class="bi bi-upload me-1"></i>Upload Cover
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if present
    const existingModal = document.getElementById('fileUploadModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('fileUploadModal'));
    modal.show();
    
    // Set up file input handler
    const fileInput = document.getElementById('coverFileInput');
    const uploadBtn = document.getElementById('uploadCoverBtn');
    const imagePreview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');
    const previewText = document.getElementById('previewText');
    
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file.');
                return;
            }
            
            // Validate file size (10MB limit)
            if (file.size > 10 * 1024 * 1024) {
                alert('File size must be less than 10MB.');
                return;
            }
            
            // Show preview
            const reader = new FileReader();
            reader.onload = function(e) {
                previewImg.src = e.target.result;
                previewText.textContent = `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
                imagePreview.style.display = 'block';
                uploadBtn.disabled = false;
            };
            reader.readAsDataURL(file);
        } else {
            imagePreview.style.display = 'none';
            uploadBtn.disabled = true;
        }
    });
    
    // Set up upload handler
    uploadBtn.addEventListener('click', function() {
        const file = fileInput.files[0];
        if (!file) return;
        
        // Show loading state
        uploadBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Uploading...';
        uploadBtn.disabled = true;
        
        // Create FormData and upload
        const formData = new FormData();
        formData.append('cover_file', file);
        formData.append('csrf_token', CSRF_TOKEN);
        
        fetch(METADATA_ENDPOINTS.uploadCover, {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Update the main cover image if visible
                const mainCoverImg = document.querySelector('#book-cover img');
                if (mainCoverImg) {
                    mainCoverImg.src = data.cover_url + '?t=' + Date.now(); // Cache bust
                }
                
                alert('Cover uploaded successfully!');
                modal.hide();
            } else {
                alert('Failed to upload cover: ' + (data.error || 'Unknown error'));
                // Restore button state
                uploadBtn.innerHTML = '<i class="bi bi-upload me-1"></i>Upload Cover';
                uploadBtn.disabled = false;
            }
        })
        .catch(error => {
            console.error('Error uploading cover:', error);
            alert('Failed to upload cover. Please try again.');
            // Restore button state
            uploadBtn.innerHTML = '<i class="bi bi-upload me-1"></i>Upload Cover';
            uploadBtn.disabled = false;
        });
    });
    
    // Clean up when modal is hidden
    document.getElementById('fileUploadModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

// Autocomplete functionality
function initializeAutocomplete() {
    const authorsInput = document.getElementById('edit-authors');
    const categoriesInput = document.getElementById('edit-categories');
    
    if (authorsInput) {
        setupAutocomplete(authorsInput, 'authors', searchAuthors, addAuthorToInput);
    }
    
    if (categoriesInput) {
        setupAutocomplete(categoriesInput, 'categories', searchCategories, addCategoryToInput);
    }
}

function setupAutocomplete(input, type, searchFn, addFn) {
    const dropdown = document.getElementById(`${type}-dropdown`);
    let debounceTimer;
    
    input.addEventListener('input', function() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const value = input.value;
            const currentInput = value.split(',').pop().trim();
            
            if (currentInput.length >= 2) {
                searchFn(currentInput, dropdown, addFn, input);
            } else {
                dropdown.style.display = 'none';
            }
        }, 300);
    });
    
    input.addEventListener('focus', function() {
        const value = input.value;
        const currentInput = value.split(',').pop().trim();
        if (currentInput.length >= 2) {
            searchFn(currentInput, dropdown, addFn, input);
        }
    });
    
    input.addEventListener('blur', function() {
        setTimeout(() => dropdown.style.display = 'none', 200);
    });
}

function searchAuthors(query, dropdown, addFn, input) {
    fetch(`/api/authors/search?q=${encodeURIComponent(query)}&limit=10`)
        .then(response => response.json())
        .then(data => {
            showDropdown(dropdown, data.authors || [], query, addFn, input, 'Author');
        })
        .catch(error => {
            console.error('Error searching authors:', error);
            dropdown.style.display = 'none';
        });
}

function searchCategories(query, dropdown, addFn, input) {
    fetch(`/api/categories/search?q=${encodeURIComponent(query)}&limit=10`)
        .then(response => response.json())
        .then(data => {
            showDropdown(dropdown, data.categories || [], query, addFn, input, GENRE_TERM);
        })
        .catch(error => {
            console.error('Error searching categories:', error);
            dropdown.style.display = 'none';
        });
}

function showDropdown(dropdown, items, query, addFn, input, type) {
    if (items.length === 0 && !query) {
        dropdown.style.display = 'none';
        return;
    }
    
    dropdown.innerHTML = '';
    
    // Add existing items
    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'autocomplete-item';
        div.textContent = item.name;
        div.addEventListener('click', () => addFn(item.name, input));
        dropdown.appendChild(div);
    });
    
    // Add "Add New" option
    if (query) {
        const addNewDiv = document.createElement('div');
        addNewDiv.className = 'autocomplete-item add-new';
        addNewDiv.innerHTML = `<i class="bi bi-plus-circle me-1"></i>Add New ${type}: "${query}"`;
        addNewDiv.addEventListener('click', () => addFn(query, input));
        dropdown.appendChild(addNewDiv);
    }
    
    dropdown.style.display = 'block';
}

function addAuthorToInput(authorName, input) {
    const currentValue = input.value;
    const values = currentValue.split(',').map(v => v.trim()).filter(v => v);
    const lastValue = values.pop() || '';
    
    // Don't add if already exists
    if (values.includes(authorName)) {
        input.focus();
        return;
    }
    
    values.push(authorName);
    input.value = values.join(', ');
    input.focus();
    
    // Hide dropdown
    const dropdown = document.getElementById('authors-dropdown');
    if (dropdown) dropdown.style.display = 'none';
}

function addCategoryToInput(categoryName, input) {
    const currentValue = input.value;
    const values = currentValue.split(',').map(v => v.trim()).filter(v => v);
    const lastValue = values.pop() || '';
    
    // Don't add if already exists
    if (values.includes(categoryName)) {
        input.focus();
        return;
    }
    
    values.push(categoryName);
    input.value = values.join(', ');
    input.focus();
    
    // Hide dropdown
    const dropdown = document.getElementById('categories-dropdown');
    if (dropdown) dropdown.style.display = 'none';
}

// Custom Fields Search Functionality
function setupCustomFieldsSearch() {
    const searchInput = document.getElementById('customFieldSearch');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const fieldItems = document.querySelectorAll('.custom-field-item');
            
            fieldItems.forEach(item => {
                const fieldName = item.querySelector('.fw-medium').textContent.toLowerCase();
                const fieldValueElement = item.querySelector('.custom-field-value');
                const fieldValue = fieldValueElement ? fieldValueElement.textContent.toLowerCase() : '';
                
                if (fieldName.includes(searchTerm) || fieldValue.includes(searchTerm)) {
                    item.closest('.col-md-6').style.display = '';
                } else {
                    item.closest('.col-md-6').style.display = 'none';
                }
            });
        });
    }
}

// Description Toggle Functionality
function setupDescriptionToggle() {
    const expandBtns = document.querySelectorAll('.expand-description');
    expandBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const shortDesc = document.getElementById('description-short');
            const fullDesc = document.getElementById('description-full');
            
            if (fullDesc.style.display === 'none' || !fullDesc.style.display) {
                fullDesc.style.display = 'block';
                shortDesc.style.display = 'none';
            } else {
                fullDesc.style.display = 'none';
                shortDesc.style.display = 'block';
            }
        });
    });
}

// Contributor functionality
function initializeContributors() {
    let searchTimeout;
    let activeDropdown = null;

    // Initialize contributor autocomplete
    const contributorInputs = document.querySelectorAll('.contributor-input');
    
    contributorInputs.forEach((input) => {
        input.addEventListener('input', handleContributorInput);
        input.addEventListener('keydown', handleContributorKeydown);
        input.addEventListener('blur', handleContributorBlur);
    });

    // Update hidden inputs on form submission
    const form = document.getElementById('book-edit-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            updateContributorHiddenInputs();
        });
    }

    function handleContributorInput(event) {
        console.log('[CONTRIBUTOR_INPUT] === INPUT EVENT ===');
        const input = event.target;
        const query = input.value.trim();
        console.log('[CONTRIBUTOR_INPUT] Input element:', input);
        console.log('[CONTRIBUTOR_INPUT] Input value:', input.value);
        console.log('[CONTRIBUTOR_INPUT] Query after trim:', query);
        console.log('[CONTRIBUTOR_INPUT] Query length:', query.length);
        
        clearTimeout(searchTimeout);
        
        if (query.length >= 2) {
            console.log('[CONTRIBUTOR_INPUT] Query long enough, starting search timeout...');
            searchTimeout = setTimeout(() => {
                console.log('[CONTRIBUTOR_INPUT] Timeout elapsed, calling searchContributors...');
                searchContributors(input, query);
            }, 300);
        } else {
            console.log('[CONTRIBUTOR_INPUT] Query too short, hiding dropdown...');
            hideContributorDropdown(input);
        }
    }

    function handleContributorKeydown(event) {
        const dropdown = event.target.closest('.contributor-autocomplete').querySelector('.autocomplete-dropdown');
        if (!dropdown || dropdown.style.display === 'none') return;

        const items = dropdown.querySelectorAll('.autocomplete-item');
        let selectedIndex = -1;
        
        for (let i = 0; i < items.length; i++) {
            if (items[i].classList.contains('selected')) {
                selectedIndex = i;
                break;
            }
        }

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                if (selectedIndex < items.length - 1) {
                    if (selectedIndex >= 0) items[selectedIndex].classList.remove('selected');
                    items[selectedIndex + 1].classList.add('selected');
                }
                break;
            case 'ArrowUp':
                event.preventDefault();
                if (selectedIndex > 0) {
                    items[selectedIndex].classList.remove('selected');
                    items[selectedIndex - 1].classList.add('selected');
                }
                break;
            case 'Enter':
                event.preventDefault();
                if (selectedIndex >= 0) {
                    selectContributor(items[selectedIndex]);
                } else if (event.target.value.trim()) {
                    createNewContributor(event.target);
                }
                break;
            case 'Escape':
                hideContributorDropdown(event.target);
                break;
        }
    }

    function handleContributorBlur(event) {
        // Small delay to allow clicking on dropdown items
        setTimeout(() => {
            if (activeDropdown !== event.target.closest('.contributor-autocomplete').querySelector('.autocomplete-dropdown')) {
                hideContributorDropdown(event.target);
            }
        }, 200);
    }

    // Store all persons data for client-side filtering (like the People page)
    const personsJsonEl = document.getElementById('all-persons-json');
    window.allPersonsData = personsJsonEl ? JSON.parse(personsJsonEl.textContent || '[]') : [];

    function searchContributors(input, query) {
        if (!query || query.length < 1) {
            hideContributorDropdown(input);
            return;
        }
        
        // Filter persons locally (like People page search)
        const queryLower = query.toLowerCase().trim();
        const matchingPersons = [];
        
        if (window.allPersonsData && Array.isArray(window.allPersonsData)) {
            window.allPersonsData.forEach(person => {
                // Get person name safely
                let personName = '';
                if (typeof person === 'object' && person !== null) {
                    personName = person.name || '';
                } else if (typeof person === 'string') {
                    personName = person;
                }
                
                // Convert to string and search case-insensitively
                const personNameLower = String(personName).toLowerCase();
                
                if (personNameLower.includes(queryLower)) {
                    const personId = (typeof person === 'object' && person !== null) ? person.id : personName;
                    matchingPersons.push({
                        id: personId,
                        name: personName,
                        book_count: null // Not needed for search
                    });
                }
            });
        }
        
        showContributorDropdown(input, matchingPersons, query);
    }

    function showContributorDropdown(input, people, query) {
        const dropdown = input.closest('.contributor-autocomplete').querySelector('.autocomplete-dropdown');
        dropdown.innerHTML = '';

        // Add existing people
        people.forEach(person => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.innerHTML = `
                <div class="name">${person.name}</div>
                ${person.book_count ? `<small class="text-muted">${person.book_count} books</small>` : ''}
            `;
            item.dataset.id = person.id;
            item.dataset.name = person.name;
            item.addEventListener('mousedown', () => selectContributor(item));
            dropdown.appendChild(item);
        });

        // Add "create new" option
        if (query && query.length >= 2) {
            const createItem = document.createElement('div');
            createItem.className = 'autocomplete-item create-new';
            createItem.innerHTML = `
                <div class="name">
                    <i class="bi bi-plus-circle me-1"></i> 
                    Add "${query}" as new person
                </div>
            `;
            createItem.dataset.name = query;
            createItem.dataset.new = 'true';
            createItem.addEventListener('mousedown', () => selectContributor(createItem));
            dropdown.appendChild(createItem);
        }

        dropdown.style.display = 'block';
        activeDropdown = dropdown;
    }

    function hideContributorDropdown(input) {
        const dropdown = input.closest('.contributor-autocomplete').querySelector('.autocomplete-dropdown');
        dropdown.style.display = 'none';
        dropdown.innerHTML = '';
        activeDropdown = null;
    }

    function selectContributor(item) {
        const input = item.closest('.contributor-autocomplete').querySelector('.contributor-input');
        const section = input.closest('.contributor-section');
        const display = section.querySelector('.contributors-display');
        
        let personId = item.dataset.id || '';
        const personName = item.dataset.name;
        const isNew = item.dataset.new === 'true';

        // Check if person is already added
        const existingTags = display.querySelectorAll('.contributor-tag');
        for (let tag of existingTags) {
            if (tag.dataset.name === personName) {
                input.value = '';
                hideContributorDropdown(input);
                return; // Person already added
            }
        }

        // Add contributor tag
        const tag = document.createElement('div');
        tag.className = 'contributor-tag';
        tag.dataset.id = personId;
        tag.dataset.name = personName;
        tag.dataset.new = isNew ? 'true' : 'false';
        tag.innerHTML = `
            ${personName}
            ${isNew ? '<small class="text-muted"> (new)</small>' : ''}
            <span class="remove" onclick="removeContributor(this)">×</span>
        `;
        
        display.appendChild(tag);

        // Clear input
        input.value = '';
        hideContributorDropdown(input);
        
        // Update hidden inputs
        updateContributorHiddenInputs();
    }

    function createNewContributor(input) {
        const name = input.value.trim();
        if (!name) return;
        
        selectContributor({
            dataset: { name: name, new: 'true' },
            closest: () => input.closest('.contributor-autocomplete')
        });
    }

    function updateContributorHiddenInputs() {
        // Remove existing hidden inputs
        const existingInputs = document.querySelectorAll('input[name^="contributors["]');
        existingInputs.forEach(input => input.remove());

        const form = document.getElementById('book-edit-form');
        if (!form) return;

        const sections = document.querySelectorAll('.contributor-section');
        let contributorIndex = 0;
        
        sections.forEach((section) => {
            const type = section.dataset.type;
            const tags = section.querySelectorAll('.contributor-tag');
            
            tags.forEach((tag) => {
                const id = tag.dataset.id;
                const name = tag.dataset.name;
                const isNew = tag.dataset.new === 'true';
                
                // Create hidden inputs for this contributor
                const typeInput = document.createElement('input');
                typeInput.type = 'hidden';
                typeInput.name = `contributors[${contributorIndex}][type]`;
                typeInput.value = type;
                
                const nameInput = document.createElement('input');
                nameInput.type = 'hidden';
                nameInput.name = `contributors[${contributorIndex}][name]`;
                nameInput.value = name;
                
                const isNewInput = document.createElement('input');
                isNewInput.type = 'hidden';
                isNewInput.name = `contributors[${contributorIndex}][is_new]`;
                isNewInput.value = isNew ? 'true' : 'false';
                
                if (id && !isNew) {
                    const idInput = document.createElement('input');
                    idInput.type = 'hidden';
                    idInput.name = `contributors[${contributorIndex}][id]`;
                    idInput.value = id;
                    form.appendChild(idInput);
                }
                
                form.appendChild(typeInput);
                form.appendChild(nameInput);
                form.appendChild(isNewInput);
                
                contributorIndex++;
            });
        });
    }

    // Make updateContributorHiddenInputs available globally
    window.updateContributorHiddenInputs = updateContributorHiddenInputs;
}

// Category functionality
function initializeCategories() {
    let searchTimeout;
    let activeDropdown = null;

    // Initialize category autocomplete
    const categoryInputs = document.querySelectorAll('.category-input');
    
    categoryInputs.forEach((input) => {
        input.addEventListener('input', handleCategoryInput);
        input.addEventListener('keydown', handleCategoryKeydown);
        input.addEventListener('blur', handleCategoryBlur);
    });

    // Update hidden inputs on form submission
    const form = document.getElementById('book-edit-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            updateCategoryHiddenInputs();
        });
    }

    function handleCategoryInput(event) {
        const input = event.target;
        const query = input.value.trim();
        const dropdown = input.nextElementSibling;
        
        clearTimeout(searchTimeout);
        
        if (query.length >= 2) {
            searchTimeout = setTimeout(() => {
                searchCategories(query, dropdown, input);
            }, 300);
        } else {
            hideCategoryDropdown(dropdown);
        }
    }

    function handleCategoryKeydown(event) {
        const dropdown = event.target.nextElementSibling;
        const items = dropdown.querySelectorAll('.autocomplete-item');
        const selected = dropdown.querySelector('.autocomplete-item.selected');
        
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (selected) {
                selected.classList.remove('selected');
                const next = selected.nextElementSibling || items[0];
                next.classList.add('selected');
            } else if (items.length > 0) {
                items[0].classList.add('selected');
            }
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (selected) {
                selected.classList.remove('selected');
                const prev = selected.previousElementSibling || items[items.length - 1];
                prev.classList.add('selected');
            }
        } else if (event.key === 'Enter') {
            event.preventDefault();
            if (selected) {
                selectCategory(selected, event.target);
            } else {
                createNewCategory(event.target);
            }
        } else if (event.key === 'Escape') {
            hideCategoryDropdown(dropdown);
        }
    }

    function handleCategoryBlur(event) {
        setTimeout(() => {
            const dropdown = event.target.nextElementSibling;
            hideCategoryDropdown(dropdown);
        }, 200);
    }

    function searchCategories(query, dropdown, input) {
        dropdown.innerHTML = `
            <div class="autocomplete-item">
                <div class="name text-muted">
                    <i class="bi bi-hourglass-split"></i> Searching ${GENRE_TERM_PLURAL_LOWER}...
                </div>
            </div>
        `;
        dropdown.style.display = 'block';
        
        fetch(`/genres/api/search?q=${encodeURIComponent(query)}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(categories => {
                showCategoryDropdown(dropdown, categories, input);
            })
            .catch(error => {
                console.error('Error searching categories:', error);
                showCategoryDropdown(dropdown, [], input);
            });
    }

    function showCategoryDropdown(dropdown, categories, input) {
        if (!dropdown) {
            return;
        }
        
        dropdown.innerHTML = '';
        
        // Show existing categories
        categories.forEach((category, index) => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.innerHTML = `
                <div class="name">${category.name}</div>
                ${category.description ? `<div class="bio">${category.description}</div>` : ''}
            `;
            item.dataset.id = category.id;
            item.dataset.name = category.name;
            item.addEventListener('mousedown', () => selectCategory(item, input));
            dropdown.appendChild(item);
        });
        
        // Add "Create new" option at the bottom if query exists
        if (input.value.trim()) {
            const createItem = document.createElement('div');
            createItem.className = 'autocomplete-item create-new';
            createItem.innerHTML = `
                <div class="name">
                    <i class="bi bi-plus-circle me-1"></i> 
                    Add "${input.value.trim()}" as new ${GENRE_TERM_LOWER}
                </div>
            `;
            createItem.dataset.name = input.value.trim();
            createItem.dataset.new = 'true';
            createItem.addEventListener('mousedown', () => selectCategory(createItem, input));
            dropdown.appendChild(createItem);
        }
        
        dropdown.style.display = 'block';
        activeDropdown = dropdown;
    }

    function hideCategoryDropdown(dropdown) {
        dropdown.style.display = 'none';
        dropdown.innerHTML = '';
        activeDropdown = null;
    }

    function selectCategory(item, input) {
        const section = input.closest('.category-section');
        const display = section.querySelector('.categories-display');
        
        let categoryId = item.dataset.id || '';
        const categoryName = item.dataset.name;
        const isNew = item.dataset.new === 'true';
        
        // Check if category is already added
        const existingTags = display.querySelectorAll('.category-tag');
        for (let tag of existingTags) {
            if (tag.dataset.name === categoryName) {
                input.value = '';
                hideCategoryDropdown(input.nextElementSibling);
                return; // Category already added
            }
        }
        
        // Add category tag
        const tag = document.createElement('div');
        tag.className = 'category-tag';
        tag.dataset.id = categoryId;
        tag.dataset.name = categoryName;
        tag.dataset.new = isNew ? 'true' : 'false';
        tag.innerHTML = `
            ${categoryName}
            ${isNew ? '<small class="text-muted"> (new)</small>' : ''}
            <span class="remove" onclick="removeCategory(this)">×</span>
        `;
        
        display.appendChild(tag);
        
        // Clear input
        input.value = '';
        hideCategoryDropdown(input.nextElementSibling);
        
        // Update hidden inputs
        updateCategoryHiddenInputs();
    }

    function createNewCategory(input) {
        const name = input.value.trim();
        if (!name) return;
        
        selectCategory({
            dataset: { name: name, new: 'true' }
        }, input);
    }

    function updateCategoryHiddenInputs() {
        let hiddenContainer = document.getElementById('categoryInputs');
        if (!hiddenContainer) {
            const form = document.getElementById('book-edit-form');
            if (!form) {
                return;
            }
            hiddenContainer = document.createElement('div');
            hiddenContainer.id = 'categoryInputs';
            hiddenContainer.style.display = 'none';
            form.appendChild(hiddenContainer);
        }
        
        hiddenContainer.innerHTML = '';
        
        const tags = document.querySelectorAll('.category-tag');
        
        tags.forEach((tag, index) => {
            const id = tag.dataset.id;
            const name = tag.dataset.name;
            const isNew = tag.dataset.new === 'true';
            
            const nameInput = document.createElement('input');
            nameInput.type = 'hidden';
            nameInput.name = `categories[${index}][name]`;
            nameInput.value = name;
            
            const isNewInput = document.createElement('input');
            isNewInput.type = 'hidden';
            isNewInput.name = `categories[${index}][is_new]`;
            isNewInput.value = isNew ? 'true' : 'false';
            
            if (id && !isNew) {
                const idInput = document.createElement('input');
                idInput.type = 'hidden';
                idInput.name = `categories[${index}][id]`;
                idInput.value = id;
                hiddenContainer.appendChild(idInput);
            }
            
            hiddenContainer.appendChild(nameInput);
            hiddenContainer.appendChild(isNewInput);
        });

        if (window.rawCategoryPaths && typeof window.rawCategoryPaths.forEach === 'function' && window.rawCategoryPaths.size > 0) {
            try {
                const rawInput = document.createElement('input');
                rawInput.type = 'hidden';
                rawInput.name = 'raw_categories';
                rawInput.value = JSON.stringify(Array.from(window.rawCategoryPaths));
                hiddenContainer.appendChild(rawInput);
            } catch (error) {
                console.warn('Failed to serialize raw category paths:', error);
            }
        }
    }

    // Make updateCategoryHiddenInputs available globally
    window.updateCategoryHiddenInputs = updateCategoryHiddenInputs;
}

function removeCategory(removeBtn) {
    const categoryTag = removeBtn.closest('.category-tag');
    
    if (categoryTag) {
        categoryTag.remove();
        // Update hidden inputs if we're in a form context
        if (document.getElementById('book-edit-form') && window.updateCategoryHiddenInputs) {
            window.updateCategoryHiddenInputs();
        }
    }
}

function removeContributor(removeBtn) {
    const contributorTag = removeBtn.closest('.contributor-tag');
    
    if (contributorTag) {
        contributorTag.remove();
        // Update hidden inputs if we're in a form context
        if (document.getElementById('book-edit-form') && window.updateContributorHiddenInputs) {
            window.updateContributorHiddenInputs();
        }
    }
}

// Initialize all functions when page loads
document.addEventListener('DOMContentLoaded', function() {
    setupCustomFieldsSearch();
    setupDescriptionToggle();
    
    // Initialize hidden inputs for contributors and categories
    // This ensures that when edit mode is activated, the current data is preserved
    if (window.updateContributorHiddenInputs) {
        window.updateContributorHiddenInputs();
    }
    if (window.updateCategoryHiddenInputs) {
        window.updateCategoryHiddenInputs();
    }
});

// Extracted from edit_book_enhanced.html for browser caching.

// JavaScript loaded for edit_book_enhanced.html

let searchTimeout;
let activeDropdown = null;

// Initialize contributor & series autocomplete (fire immediately if DOM already loaded)
function initEditPageEnhancements(){
    const contributorInputs = document.querySelectorAll('.contributor-input');
    const categoryInputs = document.querySelectorAll('.category-input');
    
    contributorInputs.forEach((input, index) => {
        input.addEventListener('input', handleInput);
        input.addEventListener('keydown', handleKeydown);
        input.addEventListener('blur', handleBlur);
    });
    
    // Initialize category autocomplete with new tag-based system
    categoryInputs.forEach((input, index) => {
        input.addEventListener('input', handleCategoryInput);
        input.addEventListener('keydown', handleCategoryKeydown);
        input.addEventListener('blur', handleCategoryBlur);
    });
    
    // Update hidden inputs on form submission
    const form = document.getElementById('editBookForm');
    if (form) {
        form.addEventListener('submit', function(e) {
            updateHiddenInputs();
            updateCategoryInputs();
        });
    }
    
    // Update hidden inputs on page load
    updateHiddenInputs();
    updateCategoryInputs();
    
    // Load locations for the location dropdown
    loadLocations();
    
    // Initialize custom metadata functionality
    initializeCustomMetadata();
    
    // Initialize accordion behavior
    initializeAccordion();
    initializeSeriesAutocompleteEdit();
    console.debug('[EditPageInit] Enhancements initialized');
}
if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initEditPageEnhancements);
} else {
    initEditPageEnhancements();
}

function initializeAccordion() {
    // Bootstrap accordion should handle this automatically with data-bs-parent,
    // but let's add explicit handling to ensure only one section is open
    const accordionButtons = document.querySelectorAll('[data-bs-toggle="collapse"]');
    
    accordionButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Close all other accordion sections when one is opened
            const targetId = this.getAttribute('data-bs-target');
            const allCollapses = document.querySelectorAll('#editBookAccordion .accordion-collapse');
            
            allCollapses.forEach(collapse => {
                if ('#' + collapse.id !== targetId && collapse.classList.contains('show')) {
                    const bsCollapse = new bootstrap.Collapse(collapse, {
                        toggle: false
                    });
                    bsCollapse.hide();
                }
            });
        });
    });
}

// ----- Series Autocomplete (Edit Form) -----
function initializeSeriesAutocompleteEdit() {
    const input = document.getElementById('series_input_edit');
    const hiddenId = document.getElementById('series_id');
    const dropdown = document.getElementById('series-autocomplete-dropdown-edit');
    if(!input || !dropdown){ console.warn('[SeriesAutocomplete][Edit] missing elements'); return; }
    let lastQuery='';
    let pending=null; let results=[]; let activeIndex=-1;
    const csrf = (document.querySelector('meta[name="csrf-token"]')||{}).content || '';

    function clearDropdown(){ dropdown.innerHTML=''; dropdown.style.display='none'; results=[]; activeIndex=-1; }
    function escapeHtml(str){return (str||'').replace(/[&<>"']/g,s=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[s]));}
    function render(list, query){
        if(!list.length && !query){ clearDropdown(); return; }
        if(!list.length && query){
            dropdown.innerHTML = `<button type="button" class="list-group-item list-group-item-action" data-create="1">Create new series \"${escapeHtml(query)}\"</button>`;
            dropdown.style.display='block'; return;
        }
        dropdown.innerHTML = list.map((it,i)=>`
            <button type="button" class="list-group-item list-group-item-action${i===activeIndex?' active':''}" data-id="${it.id}" data-name="${escapeHtml(it.name)}">
              <div class='d-flex justify-content-between align-items-center'>
                <span>${escapeHtml(it.name)}</span>
                <small class='text-muted'>${it.book_count||0} book${(it.book_count||0)===1?'':'s'}</small>
              </div>
            </button>`).join('');
        if(query && !list.find(i=>i.name.toLowerCase()===query.toLowerCase())){
            dropdown.innerHTML += `<button type="button" class="list-group-item list-group-item-action" data-create="1">Create new series \"${escapeHtml(query)}\"</button>`;
        }
        dropdown.style.display='block';
    }
    function debouncedFetch(q){
        if(pending) clearTimeout(pending);
        if(!q){ clearDropdown(); hiddenId.value=''; return; }
        pending=setTimeout(()=>{
            fetch(`/series/search?q=${encodeURIComponent(q)}`,{headers:{'Accept':'application/json'}})
              .then(r=>r.ok?r.json():Promise.reject())
              .then(data=>{ console.debug('[SeriesSearch][Edit]',data); if(!data) return; if(data.success){ results=data.results||[]; } else if(Array.isArray(data)){ results=data; } else { results=[]; } activeIndex=-1; render(results,q); })
              .catch(err=>{ console.warn('[SeriesSearch][Edit] error',err); results=[]; render(results,q); });
        },200);
    }
    function selectResult(r){ hiddenId.value=r.id; input.value=r.name; clearDropdown(); }
    function createSeries(name){ if(!name) return; fetch('/series/create',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json','X-CSRFToken':csrf},body:JSON.stringify({name})})
        .then(r=>r.ok?r.json():Promise.reject())
        .then(data=>{ console.debug('[SeriesCreate][Edit]',data); if(data.success && data.series){ hiddenId.value=data.series.id; input.value=data.series.name; clearDropdown(); } })
        .catch(err=>{ console.warn('[SeriesCreate][Edit] error',err); }); }
    input.addEventListener('input', e=>{ hiddenId.value=''; lastQuery=e.target.value.trim(); if(lastQuery.length<2){ clearDropdown(); return; } debouncedFetch(lastQuery); });
    input.addEventListener('keydown', e=>{
        if(e.key==='ArrowDown'){ if(dropdown.style.display==='none') return; e.preventDefault(); const count=Math.max(results.length,1); activeIndex=(activeIndex+1)%count; render(results,lastQuery); }
        else if(e.key==='ArrowUp'){ if(dropdown.style.display==='none') return; e.preventDefault(); const count=Math.max(results.length,1); activeIndex=activeIndex<=0?count-1:activeIndex-1; render(results,lastQuery); }
        else if(e.key==='Enter'){ if(dropdown.style.display==='none') return; e.preventDefault(); if(activeIndex>=0 && results[activeIndex]) selectResult(results[activeIndex]); else if(!results.find(r=>r.name.toLowerCase()===lastQuery.toLowerCase())) createSeries(lastQuery); }
        else if(e.key==='Escape'){ clearDropdown(); }
    });
    dropdown.addEventListener('click', e=>{ const btn=e.target.closest('button'); if(!btn) return; if(btn.dataset.create==='1'){ createSeries(lastQuery); return; } const id=btn.dataset.id; const name=btn.dataset.name; if(id && name){ hiddenId.value=id; input.value=name; clearDropdown(); }});
    document.addEventListener('click', e=>{ if(!dropdown.contains(e.target) && e.target!==input) clearDropdown(); });
    // Expose manual trigger for debugging
    window.__seriesDebugSearch = (q)=>{ input.value=q; const evt=new Event('input'); input.dispatchEvent(evt); };
}
function getCsrfToken(){ const m=document.querySelector('meta[name="csrf-token"]'); return (m&&m.getAttribute('content'))||document.querySelector('input[name="csrf_token"]').value; }

function handleInput(e) {
    const input = e.target;
    const query = input.value.trim();
    const dropdown = input.nextElementSibling;
    
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    
    if (query.length < 2) {
        hideDropdown(dropdown);
        return;
    }
    
    // Reduced timeout for more responsive search
    searchTimeout = setTimeout(() => {
        searchPersons(query, dropdown, input);
    }, 150);
}

function handleKeydown(e) {
    const dropdown = e.target.nextElementSibling;
    const items = dropdown.querySelectorAll('.autocomplete-item');
    const selected = dropdown.querySelector('.autocomplete-item.selected');
    
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (selected) {
            selected.classList.remove('selected');
            const next = selected.nextElementSibling || items[0];
            next.classList.add('selected');
        } else if (items.length > 0) {
            items[0].classList.add('selected');
        }
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (selected) {
            selected.classList.remove('selected');
            const prev = selected.previousElementSibling || items[items.length - 1];
            prev.classList.add('selected');
        }
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selected) {
            selectPerson(selected);
        } else {
            // Create new person
            createNewPerson(e.target);
        }
    } else if (e.key === 'Escape') {
        hideDropdown(dropdown);
    }
}

function handleBlur(e) {
    // Delay hiding to allow click on dropdown items
    setTimeout(() => {
        const dropdown = e.target.nextElementSibling;
        hideDropdown(dropdown);
    }, 200);
}

function searchPersons(query, dropdown, input) {
    // Show loading indicator
    dropdown.innerHTML = `
        <div class="autocomplete-item">
            <div class="name text-muted">
                <i class="bi bi-hourglass-split"></i> Searching...
            </div>
        </div>
    `;
    dropdown.style.display = 'block';
    
    fetch(`/api/person/search?q=${encodeURIComponent(query)}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(persons => {
            showDropdown(dropdown, persons, input);
        })
        .catch(error => {
            console.error('Error searching persons:', error);
            // Show create option if search fails
            showDropdown(dropdown, [], input);
        });
}

function showDropdown(dropdown, persons, input) {
    if (!dropdown) {
        return;
    }
    
    dropdown.innerHTML = '';
    
    // Show existing persons
    persons.forEach((person, index) => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        item.innerHTML = `
            <div class="name">${person.name}</div>
            ${person.bio ? `<div class="bio">${person.bio}</div>` : ''}
            ${person.book_count > 0 ? `<div class="bio text-muted">${person.book_count} book${person.book_count > 1 ? 's' : ''}</div>` : ''}
        `;
        item.dataset.id = person.id;
        item.dataset.name = person.name;
        item.addEventListener('mousedown', () => selectPerson(item));
        dropdown.appendChild(item);
    });
    
    // Add "Create new" option at the bottom if query exists
    if (input.value.trim()) {
        const createItem = document.createElement('div');
        createItem.className = 'autocomplete-item create-new';
        createItem.innerHTML = `
            <div class="name">
                <i class="bi bi-plus-circle me-1"></i> 
                Add "${input.value.trim()}" as new person
            </div>
        `;
        createItem.dataset.name = input.value.trim();
        createItem.dataset.new = 'true';
        createItem.addEventListener('mousedown', () => selectPerson(createItem));
        dropdown.appendChild(createItem);
    }
    
    dropdown.style.display = 'block';
    activeDropdown = dropdown;
}

function hideDropdown(dropdown) {
    dropdown.style.display = 'none';
    dropdown.innerHTML = '';
    activeDropdown = null;
}

function selectPerson(item) {
    const input = item.closest('.contributor-autocomplete').querySelector('.contributor-input');
    const section = input.closest('.contributor-section');
    const display = section.querySelector('.contributors-display');
    
    let personId = item.dataset.id || '';
    const personName = item.dataset.name;
    const isNew = item.dataset.new === 'true';
    
    // If this is a new person, we'll handle creation during form submission
    // For now, just add it to the UI without an ID
    if (isNew) {
        personId = ''; // Will be created when form is submitted
    }
    
    // Check if person is already added
    const existingTags = display.querySelectorAll('.contributor-tag');
    for (let tag of existingTags) {
        if (tag.dataset.name === personName) {
            input.value = '';
            hideDropdown(item.closest('.autocomplete-dropdown'));
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
    hideDropdown(item.closest('.autocomplete-dropdown'));
    
    // Update hidden inputs
    updateHiddenInputs();
}

function createNewPerson(input) {
    const name = input.value.trim();
    if (!name) return;
    
    selectPerson({
        dataset: { name: name },
        closest: () => input.closest('.contributor-autocomplete').querySelector('.contributor-input')
    });
}

function removeContributor(removeBtn) {
    const contributorTag = removeBtn.closest('.contributor-tag');
    
    if (contributorTag) {
        contributorTag.remove();
        updateHiddenInputs();
    }
}

function updateHiddenInputs() {
    const hiddenContainer = document.getElementById('contributorInputs');
    hiddenContainer.innerHTML = '';
    
    const sections = document.querySelectorAll('.contributor-section');
    let contributorIndex = 0;
    
    console.log(`[CONTRIB_DEBUG] Found ${sections.length} contributor sections`);
    
    sections.forEach((section, sectionIndex) => {
        const type = section.dataset.type;
        const tags = section.querySelectorAll('.contributor-tag');
        
        console.log(`[CONTRIB_DEBUG] Section ${sectionIndex}: type="${type}", ${tags.length} contributors`);
        
        tags.forEach((tag, tagIndex) => {
            const id = tag.dataset.id;
            const name = tag.dataset.name;
            const isNew = tag.dataset.new === 'true';
            
            console.log(`[CONTRIB_DEBUG] Creating inputs for: type="${type}", name="${name}", id="${id}", isNew=${isNew}`);
            
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
                hiddenContainer.appendChild(idInput);
            }
            
            hiddenContainer.appendChild(typeInput);
            hiddenContainer.appendChild(nameInput);
            hiddenContainer.appendChild(isNewInput);
            
            contributorIndex++;
        });
    });
    
    console.log(`[CONTRIB_DEBUG] Created hidden inputs for ${contributorIndex} contributors total`);
}

// Category autocomplete functions
function handleCategoryInput(e) {
    const input = e.target;
    const query = input.value.trim();
    const dropdown = input.nextElementSibling;
    
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    
    if (query.length < 2) {
        hideCategoryDropdown(dropdown);
        return;
    }
    
    searchTimeout = setTimeout(() => {
        searchCategories(query, dropdown, input);
    }, 150);
}

function handleCategoryKeydown(e) {
    const dropdown = e.target.nextElementSibling;
    const items = dropdown.querySelectorAll('.autocomplete-item');
    const selected = dropdown.querySelector('.autocomplete-item.selected');
    
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (selected) {
            selected.classList.remove('selected');
            const next = selected.nextElementSibling || items[0];
            next.classList.add('selected');
        } else if (items.length > 0) {
            items[0].classList.add('selected');
        }
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (selected) {
            selected.classList.remove('selected');
            const prev = selected.previousElementSibling || items[items.length - 1];
            prev.classList.add('selected');
        }
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selected) {
            selectCategory(selected);
        } else {
            createNewCategory(e.target);
        }
    } else if (e.key === 'Escape') {
        hideCategoryDropdown(dropdown);
    }
}

function handleCategoryBlur(e) {
    setTimeout(() => {
        const dropdown = e.target.nextElementSibling;
        hideCategoryDropdown(dropdown);
    }, 200);
}

function searchCategories(query, dropdown, input) {
    dropdown.innerHTML = `
        <div class="autocomplete-item">
            <div class="name text-muted">
                <i class="bi bi-hourglass-split"></i> Searching genres...
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
        item.addEventListener('mousedown', () => selectCategory(item));
        dropdown.appendChild(item);
    });
    
    // Add "Create new" option at the bottom if query exists
    if (input.value.trim()) {
        const createItem = document.createElement('div');
        createItem.className = 'autocomplete-item create-new';
        createItem.innerHTML = `
            <div class="name">
                <i class="bi bi-plus-circle me-1"></i> 
                Add "${input.value.trim()}" as new genre
            </div>
        `;
        createItem.dataset.name = input.value.trim();
        createItem.dataset.new = 'true';
        createItem.addEventListener('mousedown', () => selectCategory(createItem));
        dropdown.appendChild(createItem);
    }
    
    dropdown.style.display = 'block';
}

function hideCategoryDropdown(dropdown) {
    dropdown.style.display = 'none';
    dropdown.innerHTML = '';
}

function selectCategory(item) {
    const input = item.closest('.category-autocomplete').querySelector('.category-input');
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
            return;
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
    updateCategoryInputs();
}

function createNewCategory(input) {
    const name = input.value.trim();
    if (!name) return;
    
    selectCategory({
        dataset: { name: name, new: 'true' },
        closest: () => input.closest('.category-autocomplete')
    });
}

function removeCategory(removeBtn) {
    const categoryTag = removeBtn.closest('.category-tag');
    
    if (categoryTag) {
        categoryTag.remove();
        updateCategoryInputs();
    }
}

function updateCategoryInputs() {
    const hiddenContainer = document.getElementById('categoryInputs');
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
}

// Load locations for dropdown
function loadLocations() {
    const locationSelect = document.getElementById('location_id');
    if (!locationSelect) return;
    
    const currentLocationId = locationSelect.dataset.currentLocation;
    
    fetch('/locations/api/list')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(locations => {
            // Clear existing options except the first one
            while (locationSelect.children.length > 1) {
                locationSelect.removeChild(locationSelect.lastChild);
            }
            
            // Add location options
            locations.forEach(location => {
                const option = document.createElement('option');
                option.value = location.id;
                option.textContent = location.name;
                
                // Select current location if it matches
                if (currentLocationId && currentLocationId == location.id) {
                    option.selected = true;
                }
                
                locationSelect.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Error loading locations:', error);
        });
}

// Custom metadata functionality
function initializeCustomMetadata() {
    const addButton = document.getElementById('add-custom-field');
    if (addButton) {
        addButton.addEventListener('click', addCustomField);
    }
    
    // Initialize remove buttons for existing fields
    document.querySelectorAll('.remove-custom-field').forEach(button => {
        button.addEventListener('click', function() {
            this.closest('.custom-field').remove();
        });
    });
}

function addCustomField() {
    const container = document.getElementById('custom-metadata-container');
    const fieldDiv = document.createElement('div');
    fieldDiv.className = 'custom-field mb-3';
    fieldDiv.innerHTML = `
        <div class="row">
            <div class="col-md-4">
                <input type="text" class="form-control custom-field-name" 
                       placeholder="Field name">
            </div>
            <div class="col-md-7">
                <input type="text" class="form-control custom-field-value" 
                       placeholder="Field value">
            </div>
            <div class="col-md-1">
                <button type="button" class="btn btn-outline-danger btn-sm remove-custom-field">
                    <i class="bi bi-x"></i>
                </button>
            </div>
        </div>
    `;
    
    container.appendChild(fieldDiv);
    
    // Add remove event listener
    fieldDiv.querySelector('.remove-custom-field').addEventListener('click', function() {
        fieldDiv.remove();
    });
    
    // Focus on the name field
    fieldDiv.querySelector('.custom-field-name').focus();
}

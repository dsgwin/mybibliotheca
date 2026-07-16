// Extracted from genres/hierarchy.html for browser caching.
// window.HIERARCHY_CONFIG is set by a small inline script before this loads.

// Global state
let statsVisible = true;
let searchTerm = '';

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    // Highlight specific category if requested
    if (window.HIERARCHY_CONFIG.highlightCategory) {
        highlightCategory(window.HIERARCHY_CONFIG.highlightCategory);
    }
    
    // Initialize all nodes as expanded by default
    document.querySelectorAll('.tree-children').forEach(children => {
        children.classList.remove('collapsed');
    });
    
    // Update toggle icons
    updateToggleIcons();
});

// Expand/collapse functions
function expandAll() {
    document.querySelectorAll('.tree-children').forEach(children => {
        children.classList.remove('collapsed');
    });
    updateToggleIcons();
}

function collapseAll() {
    document.querySelectorAll('.tree-children').forEach(children => {
        children.classList.add('collapsed');
    });
    updateToggleIcons();
}

function toggleNode(categoryId) {
    const children = document.getElementById(`children-${categoryId}`);
    const toggle = document.getElementById(`toggle-${categoryId}`);
    
    if (children) {
        children.classList.toggle('collapsed');
        updateToggleIcon(toggle, !children.classList.contains('collapsed'));
    }
}

function updateToggleIcons() {
    document.querySelectorAll('.expand-toggle').forEach(toggle => {
        const categoryId = toggle.dataset.categoryId;
        const children = document.getElementById(`children-${categoryId}`);
        
        if (children) {
            updateToggleIcon(toggle, !children.classList.contains('collapsed'));
        }
    });
}

function updateToggleIcon(toggle, isExpanded) {
    const icon = toggle.querySelector('i');
    if (icon) {
        icon.className = isExpanded ? 'bi bi-chevron-down' : 'bi bi-chevron-right';
    }
}

// Stats toggle
function toggleStats() {
    const statsContainer = document.getElementById('hierarchy-stats');
    statsVisible = !statsVisible;
    
    if (statsVisible) {
        statsContainer.style.display = 'flex';
    } else {
        statsContainer.style.display = 'none';
    }
}

// Search functionality
function filterHierarchy() {
    const searchInput = document.getElementById('hierarchySearch');
    searchTerm = searchInput.value.toLowerCase().trim();
    
    if (searchTerm === '') {
        clearSearchHighlights();
        showAllNodes();
        return;
    }
    
    // Clear previous highlights
    clearSearchHighlights();
    
    // Find matching nodes
    const allNodes = document.querySelectorAll('.category-item');
    let hasMatches = false;
    
    allNodes.forEach(node => {
        const categoryName = node.querySelector('.category-name').textContent.toLowerCase();
        const categoryDesc = node.querySelector('.category-description');
        const description = categoryDesc ? categoryDesc.textContent.toLowerCase() : '';
        
        if (categoryName.includes(searchTerm) || description.includes(searchTerm)) {
            // Highlight matching text
            highlightSearchTerm(node, searchTerm);
            
            // Show this node and all its ancestors
            showNodeAndAncestors(node);
            hasMatches = true;
        } else {
            // Hide non-matching nodes
            hideNode(node);
        }
    });
    
    if (!hasMatches) {
        showNoResultsMessage();
    }
}

function clearSearch() {
    document.getElementById('hierarchySearch').value = '';
    filterHierarchy();
}

function clearSearchHighlights() {
    document.querySelectorAll('.search-highlight').forEach(highlight => {
        const parent = highlight.parentNode;
        parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
        parent.normalize();
    });
}

function showAllNodes() {
    document.querySelectorAll('.category-item').forEach(node => {
        node.style.display = '';
        const treeNode = node.closest('.tree-node');
        if (treeNode) {
            treeNode.style.display = '';
        }
    });
    hideNoResultsMessage();
}

function hideNode(node) {
    const treeNode = node.closest('.tree-node');
    if (treeNode) {
        treeNode.style.display = 'none';
    }
}

function showNodeAndAncestors(node) {
    let current = node.closest('.tree-node');
    
    while (current) {
        current.style.display = '';
        
        // Expand parent if it's collapsed
        const parentChildren = current.parentNode;
        if (parentChildren && parentChildren.classList.contains('tree-children')) {
            parentChildren.classList.remove('collapsed');
            
            // Find the toggle button for the parent
            const parentNode = parentChildren.previousElementSibling;
            if (parentNode) {
                const toggle = parentNode.querySelector('.expand-toggle');
                if (toggle) {
                    updateToggleIcon(toggle, true);
                }
            }
        }
        
        // Move up to parent tree node
        current = current.parentNode.closest('.tree-node');
    }
}

function highlightSearchTerm(node, term) {
    const nameElement = node.querySelector('.category-name');
    const descElement = node.querySelector('.category-description');
    
    [nameElement, descElement].forEach(element => {
        if (element && element.textContent.toLowerCase().includes(term)) {
            const text = element.textContent;
            const regex = new RegExp(`(${term})`, 'gi');
            element.innerHTML = text.replace(regex, '<span class="search-highlight">$1</span>');
        }
    });
}

function showNoResultsMessage() {
    const container = document.getElementById('hierarchy-container');
    
    // Remove existing no results message
    const existing = container.querySelector('.no-results-message');
    if (existing) {
        existing.remove();
    }
    
    // Add no results message
    const message = document.createElement('div');
    message.className = 'no-results-message text-center py-5';
    message.innerHTML = `
        <i class="bi bi-search display-1 text-muted"></i>
        <h3 class="mt-3">No Categories Found</h3>
        <p class="text-muted">No categories match your search term "${searchTerm}".</p>
        <button class="btn btn-outline-primary" onclick="clearSearch()">
            <i class="bi bi-x"></i> Clear Search
        </button>
    `;
    
    container.appendChild(message);
}

function hideNoResultsMessage() {
    const message = document.querySelector('.no-results-message');
    if (message) {
        message.remove();
    }
}

// Highlight specific category
function highlightCategory(categoryId) {
    const categoryItem = document.querySelector(`[data-category-id="${categoryId}"] .category-item`);
    if (categoryItem) {
        categoryItem.classList.add('highlighted');
        
        // Show the category and its ancestors
        showNodeAndAncestors(categoryItem);
        
        // Scroll to the category
        setTimeout(() => {
            categoryItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
    }
}

// Navigation functions
function viewCategory(categoryId) {
    window.location.href = `${window.HIERARCHY_CONFIG.categoryDetailsBaseUrl}${categoryId}`;
}

function editCategory(categoryId) {
    window.location.href = `${window.HIERARCHY_CONFIG.editCategoryBaseUrl}${categoryId}`;
}

function addSubcategory(parentId) {
    window.location.href = `${window.HIERARCHY_CONFIG.addCategoryUrl}?parent_id=${parentId}`;
}

// Extracted from genres/_category_tree_node.html for browser caching.

// Tree node toggle functionality
function toggleTreeNode(categoryId) {
    const childrenDiv = document.getElementById(`children-${categoryId}`);
    const toggleButton = document.getElementById(`toggle-${categoryId}`);
    const icon = toggleButton.querySelector('i');
    
    if (childrenDiv.style.display === 'none') {
        childrenDiv.style.display = 'block';
        icon.className = 'bi bi-chevron-down';
    } else {
        childrenDiv.style.display = 'none';
        icon.className = 'bi bi-chevron-right';
    }
}

// Expand all tree nodes
function expandAllTreeNodes() {
    document.querySelectorAll('.tree-children').forEach(children => {
        children.style.display = 'block';
    });
    document.querySelectorAll('.tree-node button i').forEach(icon => {
        icon.className = 'bi bi-chevron-down';
    });
}

// Collapse all tree nodes
function collapseAllTreeNodes() {
    document.querySelectorAll('.tree-children').forEach(children => {
        children.style.display = 'none';
    });
    document.querySelectorAll('.tree-node button i').forEach(icon => {
        icon.className = 'bi bi-chevron-right';
    });
}

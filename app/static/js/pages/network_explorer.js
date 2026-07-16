// Extracted from stats/network_explorer.html for browser caching.
// window.NETWORK_EXPLORER_DATA is set by a small inline script before this loads.

// Network data from Flask
const networkData = window.NETWORK_EXPLORER_DATA.networkData;
const stats = window.NETWORK_EXPLORER_DATA.stats;

console.log('Network data loaded:', networkData);
console.log('Stats loaded:', stats);

// D3.js Network Visualization
class LibraryNetworkGraph {
  constructor(container, data) {
    this.container = container;
    this.data = data;
    this.width = 0;
    this.height = 0;
    this.svg = null;
    this.simulation = null;
    this.nodes = [];
    this.links = [];
    
    console.log('Initializing LibraryNetworkGraph with data:', data);
    this.init();
  }
  
  init() {
    console.log('Starting initialization...');
    this.setupDimensions();
    this.setupSVG();
    this.processData();
    this.setupSimulation();
    this.setupZoom();
    this.render();
    console.log('Initialization complete');
  }
  
  setupDimensions() {
    const rect = this.container.getBoundingClientRect();
    this.width = rect.width;
    this.height = Math.max(600, window.innerHeight * 0.8);
    console.log('Dimensions set:', this.width, 'x', this.height);
  }
  
  setupSVG() {
    this.svg = d3.select('#network-svg')
      .attr('width', this.width)
      .attr('height', this.height);
    
    // Create main group for zoom/pan
    this.g = this.svg.append('g');
    console.log('SVG setup complete');
  }
  
  processData() {
    this.nodes = [];
    this.links = [];
    
    console.log('Processing data...');
    
    // Add book nodes
    Object.values(this.data.books || {}).forEach(book => {
      this.nodes.push({
        id: book.id,
        type: 'book',
        name: book.title,
        data: book,
        size: 8 + (book.user_rating || 0) * 2, // Size based on rating
        color: this.getStatusColor(book.reading_status)
      });
    });
    
    // Add contributor nodes (replacing separate author nodes)
    Object.values(this.data.contributors || {}).forEach(contributor => {
      const contribTypeClass = this.mapContributionType(contributor.contribution_type);
      this.nodes.push({
        id: contributor.id,
        type: 'contributor',
        subtype: contribTypeClass,
        contribution_type: contributor.contribution_type,
        name: contributor.name,
        data: contributor,
        size: 6 + contributor.book_count * 2, // Size based on book count
        color: this.getContributorColor(contributor.contribution_type)
      });
    });
    
    // Add category nodes
    Object.values(this.data.categories || {}).forEach(category => {
      this.nodes.push({
        id: category.id,
        type: 'category',
        name: category.name,
        data: category,
        size: 6 + category.book_count * 1.5,
        color: category.color || '#FFC107'
      });
    });
    
    // Add series nodes
    Object.values(this.data.series || {}).forEach(series => {
      this.nodes.push({
        id: series.id,
        type: 'series',
        name: series.name,
        data: series,
        size: 6 + series.book_count * 2,
        color: '#3F51B5'
      });
    });
    
    // Add publisher nodes
    Object.values(this.data.publishers || {}).forEach(publisher => {
      this.nodes.push({
        id: publisher.id,
        type: 'publisher',
        name: publisher.name,
        data: publisher,
        size: 6 + publisher.book_count * 1.5,
        color: '#795548'
      });
    });
    
    // Add custom field nodes
    Object.values(this.data.custom_fields || {}).forEach(customField => {
      this.nodes.push({
        id: customField.id,
        type: 'custom_field',
        name: `${customField.display_name}: ${customField.field_value}`,
        field_name: customField.field_name,
        field_value: customField.field_value,
        data: customField,
        size: 5 + customField.book_count * 1.5,
        color: '#8BC34A'
      });
    });
    
    // Add links from relationships
    const addLinks = (relationships, targetKey) => {
      relationships.forEach(rel => {
        this.links.push({
          source: rel.book_id,
          target: rel[targetKey],
          type: rel.type
        });
      });
    };
    
    addLinks(this.data.contributor_relationships || [], 'contributor_id');
    addLinks(this.data.category_relationships || [], 'category_id');
    addLinks(this.data.series_relationships || [], 'series_id');
    addLinks(this.data.publisher_relationships || [], 'publisher_id');
    addLinks(this.data.custom_field_relationships || [], 'custom_field_id');
    
    console.log('Data processed:', this.nodes.length, 'nodes,', this.links.length, 'links');
  }
  
  mapContributionType(contributionType) {
    const typeMap = {
      'authored': 'authored',
      'co_authored': 'authored', 
      'edited': 'edited',
      'narrated': 'narrated',
      'translated': 'translated',
      'illustrated': 'illustrated',
      'gave_foreword': 'other',
      'gave_introduction': 'other',
      'gave_afterword': 'other',
      'compiled': 'other',
      'contributed': 'other',
      'ghost_wrote': 'other'
    };
    return typeMap[contributionType] || 'other';
  }
  
  getContributorColor(contributionType) {
    const colorMap = {
      'authored': '#2196F3',
      'co_authored': '#2196F3',
      'edited': '#FF9800', 
      'narrated': '#9C27B0',
      'translated': '#00BCD4',
      'illustrated': '#E91E63',
      'gave_foreword': '#607D8B',
      'gave_introduction': '#607D8B',
      'gave_afterword': '#607D8B',
      'compiled': '#607D8B',
      'contributed': '#607D8B',
      'ghost_wrote': '#607D8B'
    };
    return colorMap[contributionType] || '#607D8B';
  }
  
  getStatusColor(status) {
    const colors = {
      'read': '#4CAF50',
      'reading': '#2196F3',
      'plan_to_read': '#FF9800',
      'on_hold': '#FF5722',
      'did_not_finish': '#F44336'
    };
    return colors[status] || '#4CAF50';
  }
  
  setupSimulation() {
    // Initialize simulation with all forces
    this.simulation = d3.forceSimulation(this.nodes)
      .force('link', d3.forceLink(this.links).id(d => d.id).distance(50).strength(0.8))
      .force('charge', d3.forceManyBody().strength(-150))
      .force('center', d3.forceCenter(this.width / 2, this.height / 2))
      .force('collision', d3.forceCollide().radius(d => d.size + 3))
      .force('x', d3.forceX(this.width / 2).strength(0.1))
      .force('y', d3.forceY(this.height / 2).strength(0.1))
      .force('contain', this.containmentForce())
      .alphaDecay(0.05) // Faster decay to reduce animation time
      .velocityDecay(0.6); // Higher decay to settle faster
    
    console.log('Force simulation setup complete');
  }
  
  updateDensity(densityValue) {
    // Use the original working parameters as base and scale them
    const baseLinkDistance = 50;
    const baseChargeStrength = -150;
    const baseCenterStrength = 0.1;
    
    // Adjust the forces - higher density = tighter packing
    const linkDistance = baseLinkDistance / densityValue; 
    const chargeStrength = baseChargeStrength * densityValue; 
    const centerStrength = baseCenterStrength * densityValue;
    
    // Update the forces properly
    this.simulation
      .force('link').distance(linkDistance).strength(0.8)
      .force('charge').strength(chargeStrength)
      .force('x').strength(centerStrength)
      .force('y').strength(centerStrength)
      .alpha(0.3)
      .restart();
    
    console.log(`Density updated to ${densityValue}: link=${linkDistance}, charge=${chargeStrength}, center=${centerStrength}`);
  }
  
  containmentForce() {
    const margin = 50;
    return () => {
      this.nodes.forEach(node => {
        if (node.x < margin) node.x = margin;
        if (node.x > this.width - margin) node.x = this.width - margin;
        if (node.y < margin) node.y = margin;
        if (node.y > this.height - margin) node.y = this.height - margin;
      });
    };
  }
  
  setupZoom() {
    const zoom = d3.zoom()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        const transform = event.transform;
        this.g.attr('transform', transform);
        
        // Keep font sizes consistent by scaling inversely to zoom
        this.labelElements
          .style('font-size', d => {
            const baseSize = d.type === 'book' ? 11 : 10;
            return `${baseSize / transform.k}px`;
          });
      });
    
    this.svg.call(zoom);
    console.log('Zoom setup complete with consistent font scaling');
  }
  
  render() {
    console.log('Starting render...');
    
    // Render links
    this.linkElements = this.g.append('g')
      .selectAll('line')
      .data(this.links)
      .join('line')
      .attr('class', 'link')
      .attr('stroke', 'rgba(255,255,255,0.2)')
      .attr('stroke-width', 1);
    
    // Render nodes
    this.nodeElements = this.g.append('g')
      .selectAll('circle')
      .data(this.nodes)
      .join('circle')
      .attr('class', d => {
        if (d.type === 'contributor') {
          return `node ${d.type} ${d.subtype}`;
        }
        return `node ${d.type}`;
      })
      .attr('r', d => d.size)
      .attr('fill', d => d.color)
      .attr('stroke', d => d.color)
      .attr('stroke-width', 2)
      .call(this.setupDrag())
      .on('mouseover', this.handleMouseOver.bind(this))
      .on('mouseout', this.handleMouseOut.bind(this))
      .on('click', this.handleClick.bind(this));
    
    // Render labels
    this.labelElements = this.g.append('g')
      .selectAll('text')
      .data(this.nodes)
      .join('text')
      .attr('class', 'node-label')
      .attr('dy', d => d.size + 15)
      .style('font-size', d => d.type === 'book' ? '11px' : '10px')
      .text(d => {
        // Truncate long names
        return d.name.length > 15 ? d.name.substring(0, 15) + '...' : d.name;
      });
    
    // Setup simulation tick for all elements
    this.simulation.on('tick', () => {
      this.linkElements
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);
      
      this.nodeElements
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);
      
      this.labelElements
        .attr('x', d => d.x)
        .attr('y', d => d.y);
    });
    
    console.log('Render complete');
  }
  
  setupDrag() {
    return d3.drag()
      .on('start', (event, d) => {
        if (!event.active) this.simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
        
        // Store initial offset for smooth dragging
        d.dragOffsetX = event.x - d.x;
        d.dragOffsetY = event.y - d.y;
      })
      .on('drag', (event, d) => {
        // Calculate new position accounting for drag offset
        const newX = event.x - d.dragOffsetX;
        const newY = event.y - d.dragOffsetY;
        
        // Update all position references immediately
        d.fx = newX;
        d.fy = newY;
        d.x = newX;
        d.y = newY;
        
        // Force immediate visual update of this specific node and its elements
        this.updateNodeGroup(d);
      })
      .on('end', (event, d) => {
        if (!event.active) this.simulation.alphaTarget(0);
        delete d.dragOffsetX;
        delete d.dragOffsetY;
        d.fx = null;
        d.fy = null;
      });
  }
  
  updateNodeGroup(node) {
    // Update the specific node position
    this.nodeElements
      .filter(n => n.id === node.id)
      .attr('cx', node.x)
      .attr('cy', node.y);
    
    // Update the specific label position
    this.labelElements
      .filter(n => n.id === node.id)
      .attr('x', node.x)
      .attr('y', node.y);
    
    // Update all links connected to this node
    this.linkElements.each(function(link) {
      const linkElement = d3.select(this);
      if (link.source.id === node.id) {
        linkElement.attr('x1', node.x).attr('y1', node.y);
      }
      if (link.target.id === node.id) {
        linkElement.attr('x2', node.x).attr('y2', node.y);
      }
    });
  }
  
  handleMouseOver(event, d) {
    // Highlight connected nodes and links
    const connectedNodeIds = new Set();
    
    this.linkElements
      .style('stroke', link => {
        if (link.source.id === d.id || link.target.id === d.id) {
          connectedNodeIds.add(link.source.id);
          connectedNodeIds.add(link.target.id);
          return 'rgba(255,255,255,0.5)';
        }
        return 'rgba(255,255,255,0.1)';
      })
      .style('stroke-width', link => {
        return (link.source.id === d.id || link.target.id === d.id) ? 2 : 1;
      });
    
    this.nodeElements
      .style('opacity', node => connectedNodeIds.has(node.id) ? 1 : 0.3);
    
    // Show tooltip
    this.showTooltip(event, d);
  }
  
  handleMouseOut(event, d) {
    // Reset highlighting
    this.linkElements
      .style('stroke', 'rgba(255,255,255,0.2)')
      .style('stroke-width', 1);
    
    this.nodeElements
      .style('opacity', 1);
    
    // Hide tooltip
    this.hideTooltip();
  }
  
  handleClick(event, d) {
    // Prevent event bubbling
    event.stopPropagation();
    
    // If it's a book, try to navigate to book details
    if (d.type === 'book' && d.data.id) {
      // You can customize this URL based on your routing
      const bookUrl = `/books/${d.data.id}`;
      window.open(bookUrl, '_blank');
    }
  }
  
  showTooltip(event, d) {
    const tooltip = d3.select('#tooltip');
    
    let content = `<strong>${d.name}</strong><br>`;
    
    if (d.type === 'book') {
      content += `Type: Book<br>`;
      if (d.data.user_rating) content += `Rating: ${'★'.repeat(d.data.user_rating)}<br>`;
      if (d.data.page_count) content += `Pages: ${d.data.page_count}<br>`;
      if (d.data.reading_status) content += `Status: ${d.data.reading_status}<br>`;
    } else if (d.type === 'contributor') {
      content += `Type: ${d.contribution_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}<br>`;
      content += `Books: ${d.data.book_count}<br>`;
      if (d.data.person_id) content += `Person ID: ${d.data.person_id}<br>`;
    } else if (d.type === 'custom_field') {
      content += `Type: Custom Field<br>`;
      content += `Field: ${d.field_name}<br>`;
      content += `Value: ${d.field_value}<br>`;
      content += `Books: ${d.data.book_count}<br>`;
    } else {
      content += `Type: ${d.type}<br>`;
      content += `Books: ${d.data.book_count}<br>`;
    }
    
    tooltip
      .style('display', 'block')
      .style('left', (event.pageX + 10) + 'px')
      .style('top', (event.pageY - 10) + 'px')
      .html(content);
  }
  
  hideTooltip() {
    d3.select('#tooltip').style('display', 'none');
  }
  
  filterNodes(entityTypes, contributorTypes, statusFilter) {
    console.log('Filtering nodes with:', entityTypes, contributorTypes, statusFilter);
    console.log('Available node types:', this.nodes.map(n => n.type));
    
    // Show/hide nodes based on filters
    this.nodeElements
      .style('display', d => {
        let typeVisible = entityTypes.includes(d.type);
        
        // Special handling for contributors - check contribution type filter
        if (d.type === 'contributor') {
          const contribTypeVisible = contributorTypes.includes(d.subtype);
          typeVisible = typeVisible && contribTypeVisible;
        }
        
        const statusVisible = statusFilter === 'all' || 
          d.type !== 'book' || 
          d.data.reading_status === statusFilter;
        
        const shouldShow = typeVisible && statusVisible;
        console.log(`Node ${d.name} (${d.type}${d.type === 'contributor' ? '/' + d.subtype : ''}): type=${typeVisible}, status=${statusVisible}, show=${shouldShow}`);
        
        return shouldShow ? 'block' : 'none';
      });
    
    this.labelElements
      .style('display', d => {
        let typeVisible = entityTypes.includes(d.type);
        
        // Special handling for contributors
        if (d.type === 'contributor') {
          const contribTypeVisible = contributorTypes.includes(d.subtype);
          typeVisible = typeVisible && contribTypeVisible;
        }
        
        const statusVisible = statusFilter === 'all' || 
          d.type !== 'book' || 
          d.data.reading_status === statusFilter;
        
        return (typeVisible && statusVisible) ? 'block' : 'none';
      });
    
    // Hide links to hidden nodes
    this.linkElements
      .style('display', link => {
        const sourceVisible = this.isNodeVisible(link.source, entityTypes, contributorTypes, statusFilter);
        const targetVisible = this.isNodeVisible(link.target, entityTypes, contributorTypes, statusFilter);
        return sourceVisible && targetVisible ? 'block' : 'none';
      });
  }
  
  isNodeVisible(node, entityTypes, contributorTypes, statusFilter) {
    let typeVisible = entityTypes.includes(node.type);
    
    if (node.type === 'contributor') {
      const contribTypeVisible = contributorTypes.includes(node.subtype);
      typeVisible = typeVisible && contribTypeVisible;
    }
    
    const statusVisible = statusFilter === 'all' || 
      node.type !== 'book' || 
      node.data.reading_status === statusFilter;
    
    return typeVisible && statusVisible;
  }
  
  reset() {
    // Reset any fixed positions
    this.nodes.forEach(node => {
      node.fx = null;
      node.fy = null;
    });
    
    // Restart simulation with a quick burst
    this.simulation.alpha(1).restart();
    
    console.log('Reset complete');
  }
}

// Initialize the network visualization
let networkGraph;

document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, initializing network...');
  
  const container = document.getElementById('networkContainer');
  
  if (!container) {
    console.error('Network container not found!');
    return;
  }
  
  if (!networkData) {
    console.error('Network data not available!');
    return;
  }
  
  if (!networkData.books || Object.keys(networkData.books).length === 0) {
    console.log('No books in network data');
    return;
  }
  
  console.log('Creating network graph...');
  networkGraph = new LibraryNetworkGraph(container, networkData);
  
  // Setup filter controls
  setupFilterControls();
  
  // Handle window resize
  window.addEventListener('resize', debounce(() => {
    if (networkGraph) {
      networkGraph.setupDimensions();
      d3.select('#network-svg')
        .attr('width', networkGraph.width)
        .attr('height', networkGraph.height);
      networkGraph.simulation.force('center', d3.forceCenter(networkGraph.width / 2, networkGraph.height / 2));
      networkGraph.simulation.alpha(0.3).restart();
    }
  }, 250));
});

function setupFilterControls() {
  // Entity type filters
  const entityToggles = document.querySelectorAll('.filter-toggle[data-entity]');
  entityToggles.forEach(toggle => {
    toggle.addEventListener('click', function() {
      this.classList.toggle('active');
      updateNetworkFilters();
    });
  });
  
  // Contributor type filters
  const contribToggles = document.querySelectorAll('.filter-toggle[data-contrib-type]');
  contribToggles.forEach(toggle => {
    toggle.addEventListener('click', function() {
      this.classList.toggle('active');
      updateNetworkFilters();
    });
  });
  
  // Status filters
  const statusToggles = document.querySelectorAll('.filter-toggle[data-status]');
  statusToggles.forEach(toggle => {
    toggle.addEventListener('click', function() {
      // Only one status filter can be active
      statusToggles.forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      updateNetworkFilters();
    });
  });
  
  // Density slider
  const densitySlider = document.getElementById('densitySlider');
  const densityValue = document.getElementById('densityValue');
  
  densitySlider.addEventListener('input', function() {
    const value = parseFloat(this.value);
    densityValue.textContent = value.toFixed(1);
    
    if (networkGraph) {
      networkGraph.updateDensity(value);
    }
  });
}

function updateNetworkFilters() {
  if (!networkGraph) return;
  
  // Get active entity types and convert from plural to singular
  const activeEntities = Array.from(document.querySelectorAll('.filter-toggle[data-entity].active'))
    .map(toggle => {
      const entityType = toggle.dataset.entity;
      // Convert plural filter names to singular node types
      const typeMap = {
        'books': 'book',
        'contributors': 'contributor', 
        'categories': 'category',
        'series': 'series',
        'publishers': 'publisher',
        'custom_fields': 'custom_field'
      };
      return typeMap[entityType] || entityType;
    });
  
  // Get active contributor types
  const activeContributorTypes = Array.from(document.querySelectorAll('.filter-toggle[data-contrib-type].active'))
    .map(toggle => toggle.dataset.contribType);
  
  // Get active status filter
  const activeStatus = document.querySelector('.filter-toggle[data-status].active')?.dataset.status || 'all';
  
  console.log('Filtering with entity types:', activeEntities, 'contributor types:', activeContributorTypes, 'status:', activeStatus);
  
  // Apply filters
  networkGraph.filterNodes(activeEntities, activeContributorTypes, activeStatus);
}

function resetSimulation() {
  if (networkGraph) {
    networkGraph.reset();
  }
}

function centerGraph() {
  if (networkGraph) {
    // Force nodes back towards center
    const centerX = networkGraph.width / 2;
    const centerY = networkGraph.height / 2;
    
    networkGraph.nodes.forEach(node => {
      const dx = node.x - centerX;
      const dy = node.y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // If node is too far from center, move it closer
      if (distance > Math.min(networkGraph.width, networkGraph.height) / 3) {
        const targetDistance = Math.min(networkGraph.width, networkGraph.height) / 4;
        node.x = centerX + (dx / distance) * targetDistance;
        node.y = centerY + (dy / distance) * targetDistance;
        node.vx = 0; // Reset velocity
        node.vy = 0;
      }
    });
    
    networkGraph.simulation.alpha(0.5).restart();
  }
}

function toggleTheme() {
  const container = document.getElementById('networkContainer');
  container.classList.toggle('light-mode');
  
  // Update button icon
  const button = document.querySelector('button[onclick="toggleTheme()"] i');
  if (container.classList.contains('light-mode')) {
    button.className = 'bi bi-sun';
  } else {
    button.className = 'bi bi-moon';
  }
}

// Utility function for debouncing resize events
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

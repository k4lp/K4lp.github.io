/**
 * Tools Dashboard for K4LP Engineering Tools
 * Manages the main tools showcase, status monitoring, and quick actions
 * Part of K4LP Engineering Tools - Swiss Minimalist Design
 * @version 2.1.0 - Enhanced with comprehensive tool management
 */

class ToolsDashboard {
    constructor() {
        this.version = '2.1.0';
        
        // Available tools configuration
        this.tools = [
            {
                id: 'bom-processor',
                title: 'BOM Processor',
                description: 'Advanced Bill of Materials analysis with supplier integration and visual column mapping',
                icon: '📋',
                status: 'available',
                categories: ['excel', 'bom', 'analysis'],
                features: [
                    'Excel file processing with visual previews',
                    'Intelligent column mapping and detection',
                    'Multi-supplier component search (Digikey, Mouser)',
                    'Cost analysis and availability checking',
                    'Export to CSV/Excel formats'
                ],
                requirements: ['Excel files', 'API credentials (optional)'],
                estimatedTime: '2-5 minutes per BOM',
                complexity: 'intermediate',
                url: '/tools/bom-processor.html',
                demoData: true
            },
            {
                id: 'excel-analyzer',
                title: 'Excel Analyzer',
                description: 'Comprehensive Excel file analysis with visual column mapping and data insights',
                icon: '📈',
                status: 'available',
                categories: ['excel', 'analysis', 'data'],
                features: [
                    'Visual table preview with column mapping',
                    'Data type detection and validation',
                    'Statistical analysis and insights',
                    'Duplicate detection and data cleaning',
                    'Interactive column mapping interface'
                ],
                requirements: ['Excel/CSV files'],
                estimatedTime: '1-3 minutes per file',
                complexity: 'beginner',
                url: '/tools/excel-analyzer.html',
                demoData: true
            },
            {
                id: 'qr-barcode-scanner',
                title: 'QR/Barcode Scanner',
                description: 'High-precision scanning with advanced camera controls and batch processing',
                icon: '📷',
                status: 'available',
                categories: ['scanner', 'qr', 'barcode'],
                features: [
                    'Multi-format support (QR, Code128, EAN, UPC, etc.)',
                    'Advanced camera controls (zoom, torch, focus)',
                    'Batch scanning and history tracking',
                    'File upload scanning support',
                    'Export scan results to CSV'
                ],
                requirements: ['Camera access'],
                estimatedTime: 'Instant per scan',
                complexity: 'beginner',
                url: '/tools/scanner.html',
                demoData: false
            },
            {
                id: 'part-lookup',
                title: 'Part Number Lookup',
                description: 'Real-time component search across multiple suppliers with detailed specifications',
                icon: '🔍',
                status: 'available',
                categories: ['api', 'components', 'search'],
                features: [
                    'Multi-supplier search (Digikey, Mouser)',
                    'Real-time pricing and availability',
                    'Detailed specifications and datasheets',
                    'Alternative parts suggestions',
                    'Bulk lookup from file or list'
                ],
                requirements: ['API credentials'],
                estimatedTime: '5-15 seconds per part',
                complexity: 'intermediate',
                url: '/tools/part-lookup.html',
                demoData: true
            },
            {
                id: 'component-database',
                title: 'Component Database',
                description: 'Local component database with caching, favorites, and project management',
                icon: '🗄',
                status: 'beta',
                categories: ['database', 'components', 'projects'],
                features: [
                    'Local component library with caching',
                    'Project-based component organization',
                    'Favorites and personal notes',
                    'Cross-reference and substitute parts',
                    'Import/export component libraries'
                ],
                requirements: ['Browser storage'],
                estimatedTime: 'Varies by usage',
                complexity: 'advanced',
                url: '/tools/component-db.html',
                demoData: true
            },
            {
                id: 'resistor-calculator',
                title: 'Resistor Calculator',
                description: 'Comprehensive resistor calculations including color codes and series/parallel',
                icon: '⚡',
                status: 'available',
                categories: ['calculator', 'resistor', 'electronics'],
                features: [
                    'Color code to value conversion',
                    'Value to color code conversion',
                    'Series/parallel resistance calculations',
                    'Power dissipation calculations',
                    'Standard values lookup (E-series)'
                ],
                requirements: ['None'],
                estimatedTime: 'Instant calculations',
                complexity: 'beginner',
                url: '/tools/resistor-calc.html',
                demoData: false
            }
        ];
        
        // Dashboard state
        this.currentFilter = 'all';
        this.currentSort = 'alphabetical';
        this.searchQuery = '';
        this.systemStatus = {
            apis: { digikey: 'unknown', mouser: 'unknown' },
            storage: 'unknown',
            camera: 'unknown'
        };
        
        // DOM elements
        this.elements = {
            container: null,
            toolsGrid: null,
            searchInput: null,
            filterButtons: null,
            sortSelect: null,
            statusBar: null,
            quickActions: null
        };
        
        this.initialize();
    }
    
    /**
     * Initialize tools dashboard
     */
    initialize() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupDashboard());
        } else {
            this.setupDashboard();
        }
        
        console.log('✓ K4LP Tools Dashboard v2.1.0 initialized');
    }
    
    /**
     * Setup dashboard elements
     */
    setupDashboard() {
        this.createDashboardStructure();
        this.renderTools();
        this.setupEventListeners();
        this.updateSystemStatus();
        this.startPeriodicUpdates();
    }
    
    /**
     * Create dashboard structure
     */
    createDashboardStructure() {
        // Find or create main container
        this.elements.container = document.querySelector('.tools-dashboard') || 
                                document.querySelector('main') || 
                                document.body;
        
        // Clear existing content if needed
        const existingDashboard = document.getElementById('tools-dashboard-content');
        if (existingDashboard) {
            existingDashboard.remove();
        }
        
        // Create dashboard HTML structure
        const dashboardHTML = `
            <div id="tools-dashboard-content" class="dashboard-content">
                <header class="dashboard-header">
                    <div class="header-content">
                        <h1>K4LP Engineering Tools</h1>
                        <p class="subtitle">Professional tools for PCB assembly and component procurement</p>
                    </div>
                    <div class="system-status" id="system-status">
                        <div class="status-indicators"></div>
                        <button class="status-details-btn" title="Click for details">System Status</button>
                    </div>
                </header>
                
                <div class="dashboard-controls">
                    <div class="search-section">
                        <input type="text" 
                               id="tools-search" 
                               class="search-input" 
                               placeholder="Search tools..." 
                               aria-label="Search tools">
                    </div>
                    
                    <div class="filter-section">
                        <div class="filter-buttons" id="filter-buttons">
                            <button class="filter-btn active" data-filter="all">All Tools</button>
                            <button class="filter-btn" data-filter="excel">Excel Tools</button>
                            <button class="filter-btn" data-filter="api">API Tools</button>
                            <button class="filter-btn" data-filter="scanner">Scanner Tools</button>
                            <button class="filter-btn" data-filter="calculator">Calculators</button>
                        </div>
                    </div>
                    
                    <div class="sort-section">
                        <label for="sort-select">Sort by:</label>
                        <select id="sort-select" class="sort-select">
                            <option value="alphabetical">Alphabetical</option>
                            <option value="complexity">Complexity</option>
                            <option value="category">Category</option>
                            <option value="status">Status</option>
                        </select>
                    </div>
                </div>
                
                <div class="quick-actions" id="quick-actions">
                    <h3>Quick Actions</h3>
                    <div class="quick-actions-grid">
                        <button class="quick-action" data-action="upload-bom">
                            <span class="action-icon">📋</span>
                            <span class="action-label">Upload BOM</span>
                        </button>
                        <button class="quick-action" data-action="scan-qr">
                            <span class="action-icon">📷</span>
                            <span class="action-label">Scan QR Code</span>
                        </button>
                        <button class="quick-action" data-action="search-part">
                            <span class="action-icon">🔍</span>
                            <span class="action-label">Search Part</span>
                        </button>
                        <button class="quick-action" data-action="open-settings">
                            <span class="action-icon">⚙️</span>
                            <span class="action-label">Settings</span>
                        </button>
                    </div>
                </div>
                
                <div class="tools-grid" id="tools-grid">
                    <!-- Tools will be rendered here -->
                </div>
                
                <div class="dashboard-footer">
                    <div class="footer-stats" id="footer-stats">
                        <span class="stat"><strong>${this.tools.length}</strong> tools available</span>
                        <span class="stat">Last updated: <span id="last-updated">Now</span></span>
                    </div>
                    <div class="footer-links">
                        <a href="/contact.html">Contact</a>
                        <a href="https://github.com/k4lp/K4lp.github.io" target="_blank" rel="noopener">GitHub</a>
                    </div>
                </div>
            </div>
        `;
        
        this.elements.container.innerHTML = dashboardHTML;
        
        // Cache element references
        this.elements.toolsGrid = document.getElementById('tools-grid');
        this.elements.searchInput = document.getElementById('tools-search');
        this.elements.filterButtons = document.getElementById('filter-buttons');
        this.elements.sortSelect = document.getElementById('sort-select');
        this.elements.statusBar = document.getElementById('system-status');
        this.elements.quickActions = document.getElementById('quick-actions');
    }
    
    /**
     * Render tools grid
     */
    renderTools() {
        const filteredTools = this.getFilteredAndSortedTools();
        
        if (filteredTools.length === 0) {
            this.elements.toolsGrid.innerHTML = `
                <div class="no-tools-message">
                    <p>No tools found matching your criteria.</p>
                    <button class="btn btn-secondary" onclick="toolsDashboard.resetFilters()">Reset Filters</button>
                </div>
            `;
            return;
        }
        
        const toolsHTML = filteredTools.map(tool => this.renderToolCard(tool)).join('');
        this.elements.toolsGrid.innerHTML = toolsHTML;
    }
    
    /**
     * Render individual tool card
     */
    renderToolCard(tool) {
        const statusClass = `tool-status-${tool.status}`;
        const complexityClass = `complexity-${tool.complexity}`;
        
        return `
            <div class="tool-card ${statusClass} ${complexityClass}" data-tool-id="${tool.id}">
                <div class="tool-header">
                    <div class="tool-icon">${tool.icon}</div>
                    <div class="tool-title-section">
                        <h3 class="tool-title">${tool.title}</h3>
                        <div class="tool-meta">
                            <span class="tool-status-badge">${this.formatStatus(tool.status)}</span>
                            <span class="tool-complexity">${this.formatComplexity(tool.complexity)}</span>
                        </div>
                    </div>
                </div>
                
                <div class="tool-description">
                    <p>${tool.description}</p>
                </div>
                
                <div class="tool-features">
                    <h4>Key Features:</h4>
                    <ul>
                        ${tool.features.slice(0, 3).map(feature => `<li>${feature}</li>`).join('')}
                        ${tool.features.length > 3 ? `<li class="more-features">+${tool.features.length - 3} more features</li>` : ''}
                    </ul>
                </div>
                
                <div class="tool-info">
                    <div class="tool-requirements">
                        <strong>Requirements:</strong> ${tool.requirements.join(', ')}
                    </div>
                    <div class="tool-timing">
                        <strong>Estimated time:</strong> ${tool.estimatedTime}
                    </div>
                </div>
                
                <div class="tool-categories">
                    ${tool.categories.map(cat => `<span class="category-tag">${cat}</span>`).join('')}
                </div>
                
                <div class="tool-actions">
                    <button class="btn btn-primary tool-launch-btn" 
                            data-url="${tool.url}" 
                            data-tool-id="${tool.id}"
                            ${tool.status === 'available' ? '' : 'disabled'}>
                        ${tool.status === 'available' ? 'Launch Tool' : 
                          tool.status === 'beta' ? 'Try Beta' : 'Coming Soon'}
                    </button>
                    
                    ${tool.demoData ? `
                        <button class="btn btn-secondary demo-btn" 
                                data-tool-id="${tool.id}"
                                title="Try with sample data">
                            Demo
                        </button>
                    ` : ''}
                    
                    <button class="btn btn-secondary details-btn" 
                            data-tool-id="${tool.id}"
                            title="View more details">
                        Details
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * Get filtered and sorted tools
     */
    getFilteredAndSortedTools() {
        let filtered = this.tools;
        
        // Apply search filter
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(tool => 
                tool.title.toLowerCase().includes(query) ||
                tool.description.toLowerCase().includes(query) ||
                tool.categories.some(cat => cat.toLowerCase().includes(query)) ||
                tool.features.some(feature => feature.toLowerCase().includes(query))
            );
        }
        
        // Apply category filter
        if (this.currentFilter !== 'all') {
            filtered = filtered.filter(tool => 
                tool.categories.includes(this.currentFilter)
            );
        }
        
        // Apply sorting
        switch (this.currentSort) {
            case 'alphabetical':
                filtered.sort((a, b) => a.title.localeCompare(b.title));
                break;
            case 'complexity':
                const complexityOrder = { beginner: 0, intermediate: 1, advanced: 2 };
                filtered.sort((a, b) => complexityOrder[a.complexity] - complexityOrder[b.complexity]);
                break;
            case 'category':
                filtered.sort((a, b) => a.categories[0].localeCompare(b.categories[0]));
                break;
            case 'status':
                const statusOrder = { available: 0, beta: 1, coming_soon: 2 };
                filtered.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
                break;
        }
        
        return filtered;
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Search input
        this.elements.searchInput.addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.renderTools();
        });
        
        // Filter buttons
        this.elements.filterButtons.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-btn')) {
                // Update active state
                this.elements.filterButtons.querySelectorAll('.filter-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                e.target.classList.add('active');
                
                // Update filter
                this.currentFilter = e.target.dataset.filter;
                this.renderTools();
            }
        });
        
        // Sort selection
        this.elements.sortSelect.addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.renderTools();
        });
        
        // Tool actions
        this.elements.toolsGrid.addEventListener('click', (e) => {
            const toolId = e.target.dataset.toolId;
            if (!toolId) return;
            
            if (e.target.classList.contains('tool-launch-btn')) {
                this.launchTool(toolId, e.target.dataset.url);
            } else if (e.target.classList.contains('demo-btn')) {
                this.launchToolDemo(toolId);
            } else if (e.target.classList.contains('details-btn')) {
                this.showToolDetails(toolId);
            }
        });
        
        // Quick actions
        this.elements.quickActions.addEventListener('click', (e) => {
            if (e.target.closest('.quick-action')) {
                const action = e.target.closest('.quick-action').dataset.action;
                this.handleQuickAction(action);
            }
        });
        
        // System status
        this.elements.statusBar.addEventListener('click', () => {
            this.showSystemStatusDetails();
        });
    }
    
    /**
     * Launch a tool
     */
    launchTool(toolId, url) {
        const tool = this.tools.find(t => t.id === toolId);
        if (!tool) return;
        
        // Check requirements
        const requirementCheck = this.checkToolRequirements(tool);
        if (!requirementCheck.canLaunch) {
            this.showRequirementsDialog(tool, requirementCheck.missingRequirements);
            return;
        }
        
        // Navigate to tool
        if (url && url !== '#') {
            window.location.href = url;
        } else {
            if (window.utils) {
                window.utils.showNotification(`${tool.title} is not yet available`, 'info');
            }
        }
        
        // Track usage
        this.trackToolLaunch(toolId);
    }
    
    /**
     * Launch tool with demo data
     */
    launchToolDemo(toolId) {
        const tool = this.tools.find(t => t.id === toolId);
        if (!tool) return;
        
        // Add demo parameter to URL
        let url = tool.url;
        if (url && url !== '#') {
            url += (url.includes('?') ? '&' : '?') + 'demo=true';
            window.location.href = url;
        } else {
            if (window.utils) {
                window.utils.showNotification(`${tool.title} demo is not yet available`, 'info');
            }
        }
        
        this.trackToolLaunch(toolId, 'demo');
    }
    
    /**
     * Show tool details modal
     */
    showToolDetails(toolId) {
        const tool = this.tools.find(t => t.id === toolId);
        if (!tool) return;
        
        const detailsHTML = `
            <div class="tool-details-modal">
                <h2>${tool.icon} ${tool.title}</h2>
                <p class="tool-description">${tool.description}</p>
                
                <div class="tool-details-section">
                    <h3>All Features</h3>
                    <ul>
                        ${tool.features.map(feature => `<li>${feature}</li>`).join('')}
                    </ul>
                </div>
                
                <div class="tool-details-section">
                    <h3>Requirements</h3>
                    <ul>
                        ${tool.requirements.map(req => `<li>${req}</li>`).join('')}
                    </ul>
                </div>
                
                <div class="tool-details-section">
                    <h3>Tool Information</h3>
                    <div class="tool-meta-grid">
                        <div><strong>Status:</strong> ${this.formatStatus(tool.status)}</div>
                        <div><strong>Complexity:</strong> ${this.formatComplexity(tool.complexity)}</div>
                        <div><strong>Estimated Time:</strong> ${tool.estimatedTime}</div>
                        <div><strong>Categories:</strong> ${tool.categories.join(', ')}</div>
                    </div>
                </div>
                
                <div class="modal-actions">
                    ${tool.status === 'available' ? `
                        <button class="btn btn-primary" onclick="toolsDashboard.launchTool('${tool.id}', '${tool.url}')">
                            Launch ${tool.title}
                        </button>
                    ` : ''}
                    ${tool.demoData ? `
                        <button class="btn btn-secondary" onclick="toolsDashboard.launchToolDemo('${tool.id}')">
                            Try Demo
                        </button>
                    ` : ''}
                    <button class="btn btn-secondary" onclick="toolsDashboard.closeModal()">Close</button>
                </div>
            </div>
        `;
        
        this.showModal(detailsHTML);
    }
    
    /**
     * Handle quick actions
     */
    handleQuickAction(action) {
        switch (action) {
            case 'upload-bom':
                this.launchTool('bom-processor', '/tools/bom-processor.html');
                break;
            case 'scan-qr':
                this.launchTool('qr-barcode-scanner', '/tools/scanner.html');
                break;
            case 'search-part':
                this.launchTool('part-lookup', '/tools/part-lookup.html');
                break;
            case 'open-settings':
                if (window.navigationManager) {
                    window.navigationManager.openSettings();
                } else {
                    window.location.href = '/settings.html';
                }
                break;
        }
    }
    
    /**
     * Check tool requirements
     */
    checkToolRequirements(tool) {
        const missing = [];
        const result = { canLaunch: true, missingRequirements: [] };
        
        tool.requirements.forEach(req => {
            if (req.toLowerCase().includes('api credentials')) {
                if (!this.hasApiCredentials()) {
                    missing.push('API credentials not configured');
                }
            }
            if (req.toLowerCase().includes('camera access')) {
                if (!this.hasCameraAccess()) {
                    missing.push('Camera access not available');
                }
            }
        });
        
        if (missing.length > 0) {
            result.canLaunch = false;
            result.missingRequirements = missing;
        }
        
        return result;
    }
    
    /**
     * Check if API credentials are configured
     */
    hasApiCredentials() {
        if (!window.storage) return false;
        
        const digikey = window.storage.getDigikeyCredentials();
        const mouser = window.storage.getMouserCredentials();
        
        return (digikey.clientId && digikey.clientSecret) || mouser.apiKey;
    }
    
    /**
     * Check camera access
     */
    hasCameraAccess() {
        return navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
    }
    
    /**
     * Update system status
     */
    async updateSystemStatus() {
        const indicators = [];
        
        // API Status
        if (window.apiManager) {
            const status = window.apiManager.getStatus();
            this.systemStatus.apis.digikey = status.digikey.status;
            this.systemStatus.apis.mouser = status.mouser.status;
        }
        
        // Storage Status
        this.systemStatus.storage = window.storage ? 'available' : 'unavailable';
        
        // Camera Status
        try {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                this.systemStatus.camera = 'available';
            } else {
                this.systemStatus.camera = 'unavailable';
            }
        } catch (error) {
            this.systemStatus.camera = 'error';
        }
        
        // Update status indicators
        const statusContainer = this.elements.statusBar.querySelector('.status-indicators');
        if (statusContainer) {
            const digikeyClass = this.getStatusClass(this.systemStatus.apis.digikey);
            const mouserClass = this.getStatusClass(this.systemStatus.apis.mouser);
            const storageClass = this.getStatusClass(this.systemStatus.storage);
            const cameraClass = this.getStatusClass(this.systemStatus.camera);
            
            statusContainer.innerHTML = `
                <span class="status-dot ${digikeyClass}" title="Digikey API: ${this.systemStatus.apis.digikey}"></span>
                <span class="status-dot ${mouserClass}" title="Mouser API: ${this.systemStatus.apis.mouser}"></span>
                <span class="status-dot ${storageClass}" title="Storage: ${this.systemStatus.storage}"></span>
                <span class="status-dot ${cameraClass}" title="Camera: ${this.systemStatus.camera}"></span>
            `;
        }
    }
    
    /**
     * Start periodic updates
     */
    startPeriodicUpdates() {
        // Update system status every 30 seconds
        setInterval(() => {
            this.updateSystemStatus();
        }, 30000);
        
        // Update last updated time
        setInterval(() => {
            const lastUpdatedElement = document.getElementById('last-updated');
            if (lastUpdatedElement) {
                lastUpdatedElement.textContent = new Date().toLocaleTimeString();
            }
        }, 60000); // Every minute
    }
    
    /**
     * Utility methods
     */
    formatStatus(status) {
        const statusMap = {
            available: 'Available',
            beta: 'Beta',
            coming_soon: 'Coming Soon'
        };
        return statusMap[status] || status;
    }
    
    formatComplexity(complexity) {
        return complexity.charAt(0).toUpperCase() + complexity.slice(1);
    }
    
    getStatusClass(status) {
        if (status === 'active' || status === 'available') return 'status-success';
        if (status === 'error' || status === 'unavailable') return 'status-error';
        if (status === 'inactive' || status === 'unknown') return 'status-warning';
        return 'status-neutral';
    }
    
    resetFilters() {
        this.currentFilter = 'all';
        this.currentSort = 'alphabetical';
        this.searchQuery = '';
        
        this.elements.searchInput.value = '';
        this.elements.sortSelect.value = 'alphabetical';
        
        this.elements.filterButtons.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        this.elements.filterButtons.querySelector('[data-filter="all"]').classList.add('active');
        
        this.renderTools();
    }
    
    showModal(content) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `<div class="modal-content">${content}</div>`;
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });
        
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
    }
    
    closeModal() {
        const modal = document.querySelector('.modal-overlay');
        if (modal) {
            modal.remove();
            document.body.style.overflow = '';
        }
    }
    
    trackToolLaunch(toolId, type = 'normal') {
        if (window.storage) {
            const usage = window.storage.getItem('tool_usage') || {};
            const key = `${toolId}_${type}`;
            usage[key] = (usage[key] || 0) + 1;
            usage[`${toolId}_last_used`] = Date.now();
            window.storage.setItem('tool_usage', usage);
        }
    }
}

// Create and expose global instance
const toolsDashboard = new ToolsDashboard();
window.toolsDashboard = toolsDashboard;

// Legacy compatibility
window.ToolsDashboard = ToolsDashboard;

// Module export for modern environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ToolsDashboard;
}

console.log('✓ K4LP Tools Dashboard v2.1.0 initialized');
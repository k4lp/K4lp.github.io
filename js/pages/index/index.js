/**
 * Clean Tools Dashboard - Simple tools showcase
 * Single responsibility: Display available tools, no bloated features
 * Clean interface for engineering workflows
 */

class ToolsDashboard {
    constructor() {
        this.tools = [
            {
                id: 'bom-processor',
                title: 'BOM Processor',
                description: 'Process Excel BOMs with supplier integration',
                icon: '📋',
                status: 'coming-soon',
                categories: ['excel', 'bom'],
                url: '#'
            },
            {
                id: 'excel-analyzer',
                title: 'Excel Analyzer', 
                description: 'Analyze Excel files with column mapping',
                icon: '📈',
                status: 'coming-soon',
                categories: ['excel', 'analysis'],
                url: '#'
            },
            {
                id: 'qr-scanner',
                title: 'QR/Barcode Scanner',
                description: 'High-precision scanning with camera controls',
                icon: '📷',
                status: 'coming-soon',
                categories: ['scanner'],
                url: '#'
            },
            {
                id: 'part-lookup',
                title: 'Part Lookup',
                description: 'Search components across Digikey and Mouser',
                icon: '🔍',
                status: 'coming-soon', 
                categories: ['api', 'search'],
                url: '#'
            }
        ];
        
        this.initialize();
    }

    /**
     * Initialize dashboard
     */
    initialize() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.render());
        } else {
            this.render();
        }
    }

    /**
     * Render tools dashboard
     */
    render() {
        const container = document.getElementById('tools-container') || this.createContainer();
        
        const toolsHTML = this.tools.map(tool => this.renderTool(tool)).join('');
        container.innerHTML = toolsHTML;
        
        this.attachEvents();
        this.updateFooter();
        
        console.log('Tools Dashboard rendered');
    }

    /**
     * Create tools container if it doesn't exist
     */
    createContainer() {
        let container = document.querySelector('.tools-grid');
        
        if (!container) {
            const mainContent = document.querySelector('.main-content .container');
            if (mainContent) {
                mainContent.innerHTML = `
                    <header class="page-header">
                        <h1>K4LP Engineering Tools</h1>
                        <p>Professional utilities for PCB assembly and component procurement</p>
                    </header>
                    
                    <div class="tools-grid" id="tools-container">
                        <!-- Tools will be rendered here -->
                    </div>
                `;
                container = document.getElementById('tools-container');
            }
        }
        
        return container;
    }

    /**
     * Render individual tool
     * @param {Object} tool - Tool configuration
     * @returns {string} Tool HTML
     */
    renderTool(tool) {
        const statusClass = `tool-${tool.status}`;
        const buttonText = tool.status === 'available' ? 'Launch Tool' : 'Coming Soon';
        const buttonDisabled = tool.status !== 'available' ? 'disabled' : '';
        
        return `
            <div class="tool-card ${statusClass}" data-tool-id="${tool.id}">
                <div class="tool-header">
                    <div class="tool-icon">${tool.icon}</div>
                    <div class="tool-info">
                        <h3 class="tool-title">${tool.title}</h3>
                        <span class="tool-status">${this.formatStatus(tool.status)}</span>
                    </div>
                </div>
                
                <div class="tool-description">
                    <p>${tool.description}</p>
                </div>
                
                <div class="tool-categories">
                    ${tool.categories.map(cat => `<span class="category-tag">${cat}</span>`).join('')}
                </div>
                
                <div class="tool-actions">
                    <button class="btn tool-btn" 
                            data-tool-id="${tool.id}" 
                            data-url="${tool.url}"
                            ${buttonDisabled}>
                        ${buttonText}
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Attach event listeners
     */
    attachEvents() {
        const container = document.getElementById('tools-container');
        if (!container) return;
        
        container.addEventListener('click', (e) => {
            if (e.target.classList.contains('tool-btn')) {
                this.handleToolLaunch(e.target);
            }
        });
    }

    /**
     * Handle tool launch
     * @param {Element} button - Clicked button
     */
    handleToolLaunch(button) {
        const toolId = button.dataset.toolId;
        const toolUrl = button.dataset.url;
        
        const tool = this.tools.find(t => t.id === toolId);
        if (!tool) return;
        
        if (tool.status === 'available' && toolUrl && toolUrl !== '#') {
            window.location.href = toolUrl;
        } else {
            window.utils?.showNotification(`${tool.title} is coming soon`, 'info');
        }
    }

    /**
     * Format tool status for display
     * @param {string} status - Status value
     * @returns {string} Formatted status
     */
    formatStatus(status) {
        const statusMap = {
            'available': 'Available',
            'beta': 'Beta',
            'coming-soon': 'Coming Soon'
        };
        return statusMap[status] || status;
    }

    /**
     * Update footer with current year
     */
    updateFooter() {
        const yearElement = document.getElementById('footer-year');
        if (yearElement) {
            yearElement.textContent = new Date().getFullYear();
        }
    }
}

// Initialize dashboard
const toolsDashboard = new ToolsDashboard();
window.toolsDashboard = toolsDashboard;
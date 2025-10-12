/**
 * Index page functionality - Clean and minimal
 */

document.addEventListener('DOMContentLoaded', function() {
    initializeIndexPage();
});

function initializeIndexPage() {
    loadToolsList();
    setupToolFiltering();
    setupToolSearch();
    updateFooterYear();
}

function loadToolsList() {
    const tools = [
        {
            title: "BOM Processor",
            description: "Process and analyze component Bill of Materials with supplier integration and price optimization.",
            tags: ["BOM", "Components", "Excel", "API"],
            link: "bom-processor.html",
            category: "processing"
        },
        {
            title: "Excel Analyzer",
            description: "Advanced Excel file analysis with column mapping and automated data extraction capabilities.",
            tags: ["Excel", "Analysis", "Data", "Mapping"],
            link: "excel-analyzer.html",
            category: "analysis"
        },
        {
            title: "QR Scanner",
            description: "High-precision QR and barcode scanning with batch processing and export functionality.",
            tags: ["Scanner", "QR", "Barcode", "Camera"],
            link: "scanner.html",
            category: "scanning"
        },
        {
            title: "Part Lookup",
            description: "Search component part numbers across multiple suppliers with real-time inventory data.",
            tags: ["Parts", "Search", "Components", "Inventory"],
            link: "part-lookup.html",
            category: "search"
        },
        {
            title: "PCB Validator",
            description: "Automated PCB design rule checking and component placement validation tools.",
            tags: ["PCB", "Validation", "DRC", "Design"],
            link: "pcb-validator.html",
            category: "validation"
        },
        {
            title: "Component Database",
            description: "Centralized component library management with lifecycle tracking and supplier data.",
            tags: ["Database", "Components", "Management"],
            link: "component-db.html",
            category: "management"
        }
    ];

    renderTools(tools);
    setupFilterButtons();
}

function renderTools(tools) {
    const toolsContainer = document.getElementById('tools-container');
    if (!toolsContainer) return;

    toolsContainer.innerHTML = tools.map((tool, index) => `
        <div class="tool-card" data-category="${tool.category}" data-index="${index}">
            <div class="tool-card-header">
                <div class="tool-icon">
                    <div class="tool-icon-inner"></div>
                </div>
                <div class="tool-meta">
                    <span class="tool-category">${tool.category}</span>
                </div>
            </div>
            <div class="tool-content">
                <h3 class="tool-title">${tool.title}</h3>
                <p class="tool-description">${tool.description}</p>
                <div class="tool-tags">
                    ${tool.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
            </div>
            <div class="tool-actions">
                <a href="${tool.link}" class="tool-link">
                    <span class="tool-link-text">Open Tool</span>
                    <div class="tool-link-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M7 17L17 7M17 7H7M17 7V17"/>
                        </svg>
                    </div>
                </a>
            </div>
        </div>
    `).join('');
}

function setupFilterButtons() {
    const toolsFilter = document.querySelector('.tools-filter');
    if (!toolsFilter) return;

    const filterButtonsContainer = document.createElement('div');
    filterButtonsContainer.className = 'filter-buttons';
    
    const categories = ['all', 'processing', 'analysis', 'scanning', 'search', 'validation', 'management'];
    const categoryLabels = {
        'all': 'All',
        'processing': 'Processing',
        'analysis': 'Analysis',
        'scanning': 'Scanning',
        'search': 'Search',
        'validation': 'Validation',
        'management': 'Management'
    };

    categories.forEach((category, index) => {
        const button = document.createElement('button');
        button.className = `filter-btn ${index === 0 ? 'active' : ''}`;
        button.dataset.filter = category;
        button.textContent = categoryLabels[category];
        button.type = 'button';
        filterButtonsContainer.appendChild(button);
    });

    toolsFilter.appendChild(filterButtonsContainer);
}

function setupToolFiltering() {
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('filter-btn')) {
            const filterValue = event.target.dataset.filter;
            const filterButtons = document.querySelectorAll('.filter-btn');
            const toolCards = document.querySelectorAll('.tool-card');
            
            // Update active state
            filterButtons.forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');

            // Filter cards
            toolCards.forEach(card => {
                if (filterValue === 'all' || card.dataset.category === filterValue) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });

            // Update results count
            const visibleCards = document.querySelectorAll('.tool-card[style*="flex"], .tool-card:not([style*="none"])');
            updateResultsCount(visibleCards.length);
        }
    });
}

function setupToolSearch() {
    const searchInput = document.getElementById('tool-search');
    if (!searchInput) return;

    const searchHandler = function(event) {
        const query = event.target.value.toLowerCase();
        const toolCards = document.querySelectorAll('.tool-card');
        let visibleCount = 0;

        toolCards.forEach(card => {
            const title = card.querySelector('.tool-title').textContent.toLowerCase();
            const description = card.querySelector('.tool-description').textContent.toLowerCase();
            const tags = Array.from(card.querySelectorAll('.tag')).map(tag => tag.textContent.toLowerCase());
            const category = card.dataset.category.toLowerCase();

            const matches = query === '' || 
                           title.includes(query) || 
                           description.includes(query) || 
                           category.includes(query) ||
                           tags.some(tag => tag.includes(query));

            if (matches) {
                card.style.display = 'flex';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        updateResultsCount(visibleCount, query);
        
        // Reset filter buttons if search is active
        if (query) {
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        }
    };

    // Debounce search input
    let timeout;
    searchInput.addEventListener('input', function(event) {
        clearTimeout(timeout);
        timeout = setTimeout(() => searchHandler(event), 300);
    });
}

function updateResultsCount(count, query = '') {
    let resultsElement = document.getElementById('search-results-count');
    
    if (!resultsElement) {
        resultsElement = document.createElement('div');
        resultsElement.id = 'search-results-count';
        resultsElement.className = 'search-results-count';
        document.querySelector('.tools-filter').appendChild(resultsElement);
    }
    
    if (count === 6 && !query) {
        resultsElement.textContent = '';
    } else {
        if (query) {
            resultsElement.textContent = `${count} result${count !== 1 ? 's' : ''} for "${query}"`;
        } else {
            resultsElement.textContent = `${count} tool${count !== 1 ? 's' : ''} found`;
        }
    }
}

function updateFooterYear() {
    const footerYear = document.getElementById('footer-year');
    if (footerYear) {
        footerYear.textContent = new Date().getFullYear();
    }
}
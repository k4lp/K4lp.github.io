/**
 * Index page functionality - Ultra minimal
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
            description: "Process component Bill of Materials with supplier data and pricing analysis.",
            tags: ["BOM", "Excel", "API"],
            link: "bom-processor.html",
            category: "processing"
        },
        {
            title: "Excel Analyzer",
            description: "Analyze Excel files with column mapping and data extraction.",
            tags: ["Excel", "Analysis", "Data"],
            link: "excel-analyzer.html",
            category: "analysis"
        },
        {
            title: "QR Scanner",
            description: "Scan QR codes and barcodes with camera integration.",
            tags: ["Scanner", "QR", "Camera"],
            link: "scanner.html",
            category: "scanning"
        },
        {
            title: "Part Lookup",
            description: "Search component part numbers across supplier databases.",
            tags: ["Parts", "Search", "Components"],
            link: "part-lookup.html",
            category: "search"
        },
        {
            title: "PCB Validator",
            description: "Validate PCB designs and check component placement.",
            tags: ["PCB", "Validation", "Design"],
            link: "pcb-validator.html",
            category: "validation"
        },
        {
            title: "Component Database",
            description: "Manage component library with supplier information.",
            tags: ["Database", "Components"],
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
                <div class="tool-category">${tool.category}</div>
            </div>
            <div class="tool-content">
                <h3 class="tool-title">${tool.title}</h3>
                <p class="tool-description">${tool.description}</p>
                <div class="tool-tags">
                    ${tool.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
            </div>
            <div class="tool-actions">
                <a href="${tool.link}" class="tool-link">Open</a>
            </div>
        </div>
    `).join('');
}

function setupFilterButtons() {
    const toolsHeader = document.querySelector('.tools-header');
    if (!toolsHeader) return;

    const filterButtonsContainer = document.createElement('div');
    filterButtonsContainer.className = 'filter-buttons';
    
    const categories = ['all', 'processing', 'analysis', 'scanning', 'search', 'validation', 'management'];
    const categoryLabels = {
        'all': 'all',
        'processing': 'processing',
        'analysis': 'analysis',
        'scanning': 'scanning',
        'search': 'search',
        'validation': 'validation',
        'management': 'management'
    };

    categories.forEach((category, index) => {
        const button = document.createElement('button');
        button.className = `filter-btn ${index === 0 ? 'active' : ''}`;
        button.dataset.filter = category;
        button.textContent = categoryLabels[category];
        button.type = 'button';
        filterButtonsContainer.appendChild(button);
    });

    toolsHeader.appendChild(filterButtonsContainer);
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

            updateResultsCount();
        }
    });
}

function setupToolSearch() {
    const searchInput = document.getElementById('tool-search');
    if (!searchInput) return;

    const searchHandler = function(event) {
        const query = event.target.value.toLowerCase();
        const toolCards = document.querySelectorAll('.tool-card');

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
            } else {
                card.style.display = 'none';
            }
        });

        updateResultsCount(query);
        
        // Reset filter buttons if search is active
        if (query) {
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        }
    };

    // Debounce search input
    let timeout;
    searchInput.addEventListener('input', function(event) {
        clearTimeout(timeout);
        timeout = setTimeout(() => searchHandler(event), 200);
    });
}

function updateResultsCount(query = '') {
    const visibleCards = document.querySelectorAll('.tool-card:not([style*="none"])');
    const count = visibleCards.length;
    
    let resultsElement = document.getElementById('search-results-count');
    
    if (!resultsElement) {
        resultsElement = document.createElement('div');
        resultsElement.id = 'search-results-count';
        resultsElement.className = 'search-results-count';
        document.querySelector('.tools-header').appendChild(resultsElement);
    }
    
    if (count === 6 && !query) {
        resultsElement.textContent = '';
    } else {
        if (query) {
            resultsElement.textContent = `${count} results for "${query}"`;
        } else {
            resultsElement.textContent = `${count} tools`;
        }
    }
}

function updateFooterYear() {
    const footerYear = document.getElementById('footer-year');
    if (footerYear) {
        footerYear.textContent = new Date().getFullYear();
    }
}
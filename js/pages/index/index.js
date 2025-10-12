/**
 * Index page functionality
 * Sophisticated tools showcase with advanced interactions
 */

document.addEventListener('DOMContentLoaded', function() {
    initializeIndexPage();
});

function initializeIndexPage() {
    loadToolsList();
    setupToolFiltering();
    setupToolSearch();
    initializeToolAnimations();
    setupIntersectionObserver();
}

function loadToolsList() {
    // Comprehensive tools data structure
    const tools = [
        {
            title: "Component BOM Processor",
            description: "Advanced Bill of Materials processing with intelligent component matching, price analysis, and multi-supplier integration for optimal procurement decisions",
            tags: ["BOM", "Components", "Excel", "API", "Procurement"],
            link: "bom-processor.html",
            category: "processing"
        },
        {
            title: "Excel Sheet Analyzer",
            description: "Sophisticated Excel file analysis with visual column mapping, data validation, range selection, and automated report generation capabilities",
            tags: ["Excel", "Analysis", "Data", "Mapping", "Reports"],
            link: "excel-analyzer.html",
            category: "analysis"
        },
        {
            title: "QR/Barcode Scanner",
            description: "High-precision scanning solution with advanced camera controls, batch processing, custom overlay configurations, and export functionality",
            tags: ["Scanner", "QR", "Barcode", "Camera", "Batch"],
            link: "scanner.html",
            category: "scanning"
        },
        {
            title: "Part Number Lookup",
            description: "Comprehensive component search across multiple suppliers with real-time inventory, pricing, specifications, and alternative parts recommendations",
            tags: ["Parts", "Search", "Components", "Inventory", "Alternatives"],
            link: "part-lookup.html",
            category: "search"
        },
        {
            title: "PCB Design Validator",
            description: "Automated PCB design rule checking, component placement validation, trace analysis, and manufacturing readiness assessment tools",
            tags: ["PCB", "Validation", "DRC", "Manufacturing", "Design"],
            link: "pcb-validator.html",
            category: "validation"
        },
        {
            title: "Component Database Manager",
            description: "Centralized component library management with custom categorization, lifecycle tracking, obsolescence monitoring, and supplier relationship management",
            tags: ["Database", "Components", "Lifecycle", "Management", "Suppliers"],
            link: "component-db.html",
            category: "management"
        },
        {
            title: "Price Comparison Engine",
            description: "Real-time multi-supplier price comparison with market trend analysis, bulk pricing optimization, and procurement cost forecasting",
            tags: ["Pricing", "Comparison", "Market", "Optimization", "Forecasting"],
            link: "price-engine.html",
            category: "analysis"
        },
        {
            title: "Assembly Documentation Generator",
            description: "Automated generation of assembly drawings, pick-and-place files, component placement guides, and manufacturing documentation packages",
            tags: ["Documentation", "Assembly", "Manufacturing", "Drawings", "Guides"],
            link: "assembly-docs.html",
            category: "documentation"
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
                    <span class="tool-link-text">Launch Tool</span>
                    <div class="tool-link-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M7 17L17 7M17 7H7M17 7V17"/>
                        </svg>
                    </div>
                </a>
            </div>
        </div>
    `).join('');

    // Apply staggered animation
    const cards = document.querySelectorAll('.tool-card');
    cards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
        card.classList.add('fade-in-up');
    });
}

function setupFilterButtons() {
    const toolsFilter = document.querySelector('.tools-filter');
    if (!toolsFilter) return;

    // Create filter buttons container
    const filterButtonsContainer = document.createElement('div');
    filterButtonsContainer.className = 'filter-buttons';
    
    const categories = ['all', 'processing', 'analysis', 'scanning', 'search', 'validation', 'management', 'documentation'];
    const categoryLabels = {
        'all': 'All Tools',
        'processing': 'Processing',
        'analysis': 'Analysis',
        'scanning': 'Scanning',
        'search': 'Search',
        'validation': 'Validation',
        'management': 'Management',
        'documentation': 'Documentation'
    };

    categories.forEach((category, index) => {
        const button = document.createElement('button');
        button.className = `filter-btn ${index === 0 ? 'active' : ''}`;
        button.dataset.filter = category;
        button.textContent = categoryLabels[category];
        filterButtonsContainer.appendChild(button);
    });

    toolsFilter.appendChild(filterButtonsContainer);
}

function setupToolFiltering() {
    // Event delegation for filter buttons
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('filter-btn')) {
            const filterValue = event.target.dataset.filter;
            const filterButtons = document.querySelectorAll('.filter-btn');
            const toolCards = document.querySelectorAll('.tool-card');
            
            // Update active state
            filterButtons.forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');

            // Filter cards with animation
            toolCards.forEach((card, index) => {
                if (filterValue === 'all' || card.dataset.category === filterValue) {
                    card.style.display = 'flex';
                    setTimeout(() => {
                        card.classList.add('fade-in-up');
                    }, index * 50);
                } else {
                    card.style.display = 'none';
                    card.classList.remove('fade-in-up');
                }
            });

            // Update results count
            const visibleCards = document.querySelectorAll('.tool-card[style*="flex"]').length;
            updateResultsCount(visibleCards);
        }
    });
}

function setupToolSearch() {
    const searchInput = document.getElementById('tool-search');
    if (!searchInput) return;

    // Create search container with icon
    const searchContainer = searchInput.parentElement;
    searchContainer.classList.add('search-container');
    
    const searchIcon = document.createElement('div');
    searchIcon.className = 'search-icon';
    searchIcon.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
        </svg>
    `;
    searchContainer.appendChild(searchIcon);

    const searchHandler = Utils.debounce((event) => {
        const query = event.target.value.toLowerCase();
        const toolCards = document.querySelectorAll('.tool-card');
        let visibleCount = 0;

        toolCards.forEach((card, index) => {
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
                setTimeout(() => {
                    card.classList.add('fade-in-up');
                }, index * 30);
                visibleCount++;
            } else {
                card.style.display = 'none';
                card.classList.remove('fade-in-up');
            }
        });

        // Update results count
        updateResultsCount(visibleCount, query);
        
        // Reset filter buttons if search is active
        if (query) {
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        }
    }, 300);

    searchInput.addEventListener('input', searchHandler);
    searchInput.addEventListener('focus', function() {
        this.parentElement.classList.add('focused');
    });
    searchInput.addEventListener('blur', function() {
        this.parentElement.classList.remove('focused');
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
    
    if (count === 8 && !query) {
        resultsElement.textContent = '';
        resultsElement.style.opacity = '0';
    } else {
        if (query) {
            resultsElement.textContent = `${count} result${count !== 1 ? 's' : ''} for "${query}"`;
        } else {
            resultsElement.textContent = `${count} tool${count !== 1 ? 's' : ''} found`;
        }
        resultsElement.style.opacity = '1';
    }
}

function initializeToolAnimations() {
    // Add hover effects and interactions
    document.addEventListener('mouseenter', function(event) {
        if (event.target.closest('.tool-card')) {
            const card = event.target.closest('.tool-card');
            card.style.transform = 'translateY(-8px)';
            
            // Add floating animation to icon
            const icon = card.querySelector('.tool-icon');
            if (icon) {
                icon.classList.add('float');
            }
        }
    }, true);

    document.addEventListener('mouseleave', function(event) {
        if (event.target.closest('.tool-card')) {
            const card = event.target.closest('.tool-card');
            card.style.transform = '';
            
            // Remove floating animation
            const icon = card.querySelector('.tool-icon');
            if (icon) {
                icon.classList.remove('float');
            }
        }
    }, true);
}

function setupIntersectionObserver() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                
                // Add glow effect to cards as they become visible
                setTimeout(() => {
                    entry.target.classList.add('glow');
                    setTimeout(() => {
                        entry.target.classList.remove('glow');
                    }, 2000);
                }, Math.random() * 500);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    // Observe all tool cards
    const toolCards = document.querySelectorAll('.tool-card');
    toolCards.forEach(card => {
        observer.observe(card);
    });

    // Observe other elements for animation
    const animatedElements = document.querySelectorAll('.page-header, .tools-header');
    animatedElements.forEach(element => {
        observer.observe(element);
    });
}

// Add sophisticated keyboard navigation
document.addEventListener('keydown', function(event) {
    const toolCards = Array.from(document.querySelectorAll('.tool-card:not([style*="display: none"])'));
    const currentFocus = document.activeElement;
    
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        
        let currentIndex = -1;
        toolCards.forEach((card, index) => {
            if (card.contains(currentFocus) || card === currentFocus) {
                currentIndex = index;
            }
        });
        
        if (event.key === 'ArrowDown') {
            const nextIndex = (currentIndex + 1) % toolCards.length;
            toolCards[nextIndex].querySelector('.tool-link').focus();
        } else {
            const prevIndex = currentIndex <= 0 ? toolCards.length - 1 : currentIndex - 1;
            toolCards[prevIndex].querySelector('.tool-link').focus();
        }
    }
    
    // Quick search activation
    if (event.key === '/' && !event.target.matches('input, textarea, select')) {
        event.preventDefault();
        const searchInput = document.getElementById('tool-search');
        if (searchInput) {
            searchInput.focus();
        }
    }
    
    // Escape to clear search
    if (event.key === 'Escape' && event.target.matches('#tool-search')) {
        event.target.value = '';
        event.target.dispatchEvent(new Event('input'));
        event.target.blur();
    }
});

// Add tool card click tracking for analytics
document.addEventListener('click', function(event) {
    const toolLink = event.target.closest('.tool-link');
    if (toolLink) {
        const toolCard = toolLink.closest('.tool-card');
        const toolTitle = toolCard.querySelector('.tool-title').textContent;
        const toolCategory = toolCard.dataset.category;
        
        // Store interaction data
        const interactionData = {
            tool: toolTitle,
            category: toolCategory,
            timestamp: Date.now(),
            source: 'index'
        };
        
        // Store in localStorage for analytics
        let analytics = JSON.parse(localStorage.getItem('k4lp_analytics') || '[]');
        analytics.push(interactionData);
        
        // Keep only last 100 interactions
        if (analytics.length > 100) {
            analytics = analytics.slice(-100);
        }
        
        localStorage.setItem('k4lp_analytics', JSON.stringify(analytics));
    }
});

// Update footer year dynamically
document.addEventListener('DOMContentLoaded', function() {
    const footerYear = document.getElementById('footer-year');
    if (footerYear) {
        footerYear.textContent = new Date().getFullYear();
    }
});
/**
 * Index page functionality
 */

document.addEventListener('DOMContentLoaded', function() {
    initializeIndexPage();
});

function initializeIndexPage() {
    loadToolsList();
    setupToolFiltering();
}

function loadToolsList() {
    // Tools data structure
    const tools = [
        {
            title: "Component BOM Processor",
            description: "Process and analyze component Bill of Materials with Digikey/Mouser integration",
            tags: ["BOM", "Components", "Excel", "API"],
            link: "#",
            status: "coming-soon"
        },
        {
            title: "Excel Sheet Analyzer",
            description: "Advanced Excel file analysis with column mapping and data extraction",
            tags: ["Excel", "Analysis", "Data"],
            link: "#",
            status: "coming-soon"
        },
        {
            title: "QR/Barcode Scanner",
            description: "Scan QR codes and barcodes with advanced camera controls",
            tags: ["Scanner", "QR", "Barcode", "Camera"],
            link: "#",
            status: "coming-soon"
        },
        {
            title: "Part Number Lookup",
            description: "Search and lookup electronic component part numbers across suppliers",
            tags: ["Parts", "Search", "Components"],
            link: "#",
            status: "coming-soon"
        }
    ];

    renderTools(tools);
}

function renderTools(tools) {
    const toolsContainer = document.getElementById('tools-container');
    if (!toolsContainer) return;

    toolsContainer.innerHTML = tools.map(tool => `
        <div class="tool-card ${tool.status}">
            <div class="tool-header">
                <h3>${tool.title}</h3>
                <span class="tool-status">${tool.status.replace('-', ' ')}</span>
            </div>
            <p class="tool-description">${tool.description}</p>
            <div class="tool-tags">
                ${tool.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
            <div class="tool-actions">
                <a href="${tool.link}" class="tool-link ${tool.status === 'coming-soon' ? 'disabled' : ''}">
                    ${tool.status === 'coming-soon' ? 'Coming Soon' : 'Launch Tool'}
                </a>
            </div>
        </div>
    `).join('');
}

function setupToolFiltering() {
    const searchInput = document.getElementById('tool-search');
    const tagFilters = document.querySelectorAll('.tag-filter');

    if (searchInput) {
        searchInput.addEventListener('input', Utils.debounce(handleSearch, 300));
    }

    tagFilters.forEach(filter => {
        filter.addEventListener('click', handleTagFilter);
    });
}

function handleSearch(event) {
    const query = event.target.value.toLowerCase();
    const toolCards = document.querySelectorAll('.tool-card');

    toolCards.forEach(card => {
        const title = card.querySelector('h3').textContent.toLowerCase();
        const description = card.querySelector('.tool-description').textContent.toLowerCase();
        const tags = Array.from(card.querySelectorAll('.tag')).map(tag => tag.textContent.toLowerCase());

        const matches = title.includes(query) || 
                       description.includes(query) || 
                       tags.some(tag => tag.includes(query));

        card.style.display = matches ? 'block' : 'none';
    });
}

function handleTagFilter(event) {
    // Tag filtering logic will be implemented
    console.log('Tag filter clicked:', event.target.textContent);
}

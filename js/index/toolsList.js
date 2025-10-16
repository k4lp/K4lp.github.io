/*!
 * Renders the list of available tools on the homepage.
 */
document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) {
        console.error('Main content container not found.');
        return;
    }

    const tools = [
        {
            name: 'Advanced BOM Processor',
            description: 'Upload, map, and process Bill of Materials files with API integration.',
            link: 'advancedapi.html',
            tags: ['BOM', 'Excel', 'API']
        },
        {
            name: 'Coming Soon',
            description: 'More tools for PCB assembly are under development.',
            link: '#',
            tags: ['Future']
        }
    ];

    const toolsHTML = `
        <div class="tool-list">
            ${tools.map(tool => `
                <a href="${tool.link}" class="tool-card">
                    <h3>${tool.name}</h3>
                    <p>${tool.description}</p>
                    <div class="tags">
                        ${tool.tags.map(tag => `<span>${tag}</span>`).join('')}
                    </div>
                </a>
            `).join('')}
        </div>
    `;

    mainContent.innerHTML = toolsHTML;
});
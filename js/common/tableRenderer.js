/*!
 * Table Renderer
 *
 * Renders data from an Excel worksheet into an HTML table.
 */
const tableRenderer = {
    /**
     * Renders a worksheet into an HTML table inside a given container.
     * @param {Object} worksheet - The worksheet object from the xlsx library.
     * @param {HTMLElement} container - The DOM element to render the table into.
     */
    render: (worksheet, container) => {
        if (!worksheet || !container) {
            console.error('Worksheet or container not provided for rendering.');
            return;
        }

        // Clear previous content
        container.innerHTML = '';

        // Convert sheet to an array of arrays
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        if (data.length === 0) {
            container.innerHTML = '<p>The selected sheet is empty.</p>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'data-table';

        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');

        // Create table header
        const headerRow = document.createElement('tr');
        const headerData = data[0];
        headerData.forEach(cellText => {
            const th = document.createElement('th');
            th.textContent = cellText;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);

        // Create table body
        for (let i = 1; i < data.length; i++) {
            const rowData = data[i];
            const tr = document.createElement('tr');
            rowData.forEach(cellText => {
                const td = document.createElement('td');
                td.textContent = cellText;
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        }

        table.appendChild(thead);
        table.appendChild(tbody);
        container.appendChild(table);
    }
};

window.tableRenderer = tableRenderer;
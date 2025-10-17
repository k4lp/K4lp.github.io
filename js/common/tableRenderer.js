export const tableRenderer = {
    render: (worksheet, container) => {
        if (!worksheet || !container) return;
        container.innerHTML = '';
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        if (data.length === 0) return;

        const table = document.createElement('table');
        table.className = 'data-table';
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');

        const headerRow = document.createElement('tr');
        data[0].forEach(cellText => {
            const th = document.createElement('th');
            th.textContent = cellText;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);

        data.slice(1).forEach(rowData => {
            const tr = document.createElement('tr');
            rowData.forEach(cellText => {
                const td = document.createElement('td');
                td.textContent = cellText;
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });

        table.appendChild(thead);
        table.appendChild(tbody);
        container.appendChild(table);
    }
};
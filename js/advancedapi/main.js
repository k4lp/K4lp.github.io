import { initNavbar } from '/js/common/navbar.js';
import { initFooter } from '/js/common/footer.js';
import { initSettingsModal } from '/js/common/settings.js';
import { excelCore } from '/js/common/excelCore.js';
import { tableRenderer } from '/js/common/tableRenderer.js';
import { CellSelector } from '/js/common/cellSelector.js';
import { RangeSelector } from '/js/common/rangeSelector.js';

function initAdvancedApiTool() {
    const wizardContainer = document.getElementById('wizard-container');
    if (!wizardContainer) return;

    let workbook;
    let currentWorksheet;

    wizardContainer.innerHTML = `
        <div class="wizard">
            <div id="step-1" class="wizard-step">
                <h2>Step 1: Upload Your BOM File</h2>
                <div id="file-drop-zone" class="file-drop-zone"><p>Drag & drop, or click to select.</p></div>
                <input type="file" id="file-input" class="visually-hidden" accept=".xlsx, .xls, .csv">
            </div>
            <div id="step-2" class="wizard-step">
                <h2>Step 2: Select a Sheet</h2>
                <div id="sheet-list" class="sheet-list"></div>
            </div>
            <div id="step-3" class="wizard-step">
                <h2>Step 3: Map Columns, Define Range & Process</h2>
                <div class="mapping-grid" id="mapping-interface"></div>
                <div class="range-selection-ui">
                    <div class="form-group">
                        <label for="start-cell">Start Cell</label>
                        <input type="text" id="start-cell" class="cell-input" placeholder="e.g., A1">
                    </div>
                    <div class="form-group">
                        <label for="end-cell">End Cell</label>
                        <input type="text" id="end-cell" class="cell-input" placeholder="e.g., B50">
                    </div>
                    <button id="visual-select-toggle" class="btn">Enable Visual Selection</button>
                </div>
                <div class="table-preview-container" id="table-preview-container"></div>
                <div class="wizard-footer">
                    <button id="process-data-button" class="btn" disabled>Process Data</button>
                </div>
            </div>
        </div>
    `;

    const goToStep = (step) => {
        document.querySelectorAll('.wizard-step').forEach(s => s.classList.remove('is-active'));
        document.getElementById(`step-${step}`).classList.add('is-active');
    };

    const handleFile = async (file) => {
        try {
            workbook = await excelCore.parseFile(file);
            const sheetList = document.getElementById('sheet-list');
            sheetList.innerHTML = '';
            workbook.SheetNames.forEach(name => {
                const btn = document.createElement('button');
                btn.className = 'btn';
                btn.textContent = name;
                btn.addEventListener('click', () => handleSheetSelection(name));
                sheetList.appendChild(btn);
            });
            goToStep(2);
        } catch (error) {
            alert(error.message);
        }
    };

    const handleSheetSelection = (sheetName) => {
        currentWorksheet = workbook.Sheets[sheetName];
        const tableContainer = document.getElementById('table-preview-container');
        tableRenderer.render(currentWorksheet, tableContainer);
        renderMappingInterface(currentWorksheet);

        const cellSelector = new CellSelector(tableContainer);
        const rangeSelector = new RangeSelector(tableContainer);
        const startCellInput = document.getElementById('start-cell');
        const endCellInput = document.getElementById('end-cell');
        const toggleButton = document.getElementById('visual-select-toggle');
        let visualSelectionEnabled = false;

        cellSelector.onSelect(cellAddress => {
            if (!visualSelectionEnabled) {
                startCellInput.value = cellAddress;
            }
        });

        rangeSelector.onRangeChange(({ start, end }) => {
            startCellInput.value = start;
            endCellInput.value = end;
        });

        toggleButton.addEventListener('click', () => {
            visualSelectionEnabled = !visualSelectionEnabled;
            if (visualSelectionEnabled) {
                toggleButton.textContent = 'Disable Visual Selection';
                toggleButton.classList.add('is-active');
                cellSelector.disable();
                rangeSelector.enable();
            } else {
                toggleButton.textContent = 'Enable Visual Selection';
                toggleButton.classList.remove('is-active');
                rangeSelector.disable();
                cellSelector.enable();
            }
        });

        // Initially enable cell selector for single clicks
        cellSelector.enable();

        goToStep(3);
    };

    const renderMappingInterface = (worksheet) => {
        const container = document.getElementById('mapping-interface');
        container.innerHTML = '';
        const headers = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0];
        const options = ['Ignore', 'Part Number', 'Quantity', 'Description'];

        headers.forEach((header, i) => {
            const colLetter = String.fromCharCode(65 + i);
            const card = document.createElement('div');
            card.className = 'mapping-card';
            card.innerHTML = `<label>${colLetter}: ${header}</label>`;
            const select = document.createElement('select');
            select.className = 'mapping-select';
            select.dataset.columnIndex = colLetter;
            options.forEach(opt => {
                const optionEl = document.createElement('option');
                optionEl.value = opt.toLowerCase().replace(' ', '-');
                optionEl.textContent = opt;
                select.appendChild(optionEl);
            });
            select.addEventListener('change', checkMappingCompleteness);
            card.appendChild(select);
            container.appendChild(card);
        });
    };

    const processData = () => {
        const mapping = getColumnMapping();
        const range = {
            start: document.getElementById('start-cell').value,
            end: document.getElementById('end-cell').value
        };
        const data = excelCore.extractData(currentWorksheet, mapping, range);
        console.log("--- Extracted Data ---");
        console.table(data);
        alert(`Processed ${data.length} rows. See console for details.`);
    };

    const getColumnMapping = () => {
        const mapping = {};
        document.querySelectorAll('.mapping-select').forEach(s => {
            if (s.value !== 'ignore') mapping[s.value] = s.dataset.columnIndex;
        });
        return mapping;
    };

    const checkMappingCompleteness = () => {
        const mapping = getColumnMapping();
        document.getElementById('process-data-button').disabled = !(mapping['part-number'] && mapping['quantity']);
    };

    document.getElementById('file-drop-zone').addEventListener('click', () => document.getElementById('file-input').click());
    document.getElementById('file-input').addEventListener('change', (e) => handleFile(e.target.files[0]));
    document.getElementById('process-data-button').addEventListener('click', processData);

    goToStep(1);
}

document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    initFooter();
    initSettingsModal();
    initAdvancedApiTool();
});
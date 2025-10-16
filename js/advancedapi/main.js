import { initNavbar } from '/js/common/navbar.js';
import { initFooter } from '/js/common/footer.js';
import { initSettingsModal } from '/js/common/settings.js';
import { excelCore } from '/js/common/excelCore.js';
import { tableRenderer } from '/js/common/tableRenderer.js';

/*!
 * Main script for the Advanced API tool page.
 * Manages the step-by-step workflow for uploading and processing Excel files.
 */
function initAdvancedApiTool() {
    const wizardContainer = document.getElementById('wizard-container');
    if (!wizardContainer) {
        console.error('Wizard container not found.');
        return;
    }

    // --- STATE ---
    let workbook;

    // --- WIZARD HTML ---
    const wizardHTML = `
        <div id="wizard" class="wizard">
            <!-- Step 1: File Upload -->
            <div id="step-1" class="wizard-step">
                <h2>Step 1: Upload Your BOM File</h2>
                <p>Select an Excel (.xlsx, .xls) or CSV (.csv) file to begin.</p>
                <div id="file-drop-zone" class="file-drop-zone">
                    <p>Drag & drop your file here, or click to select a file.</p>
                    <input type="file" id="file-input" class="visually-hidden" accept=".xlsx, .xls, .csv">
                </div>
                <div id="file-info" class="file-info"></div>
            </div>
            <!-- Step 2: Sheet Selection -->
            <div id="step-2" class="wizard-step">
                <h2>Step 2: Select a Sheet</h2>
                <p>The following sheets were found in your workbook. Please select one to process.</p>
                <div id="sheet-list" class="sheet-list"></div>
            </div>
            <!-- Step 3: Column Mapping & Preview -->
            <div id="step-3" class="wizard-step">
                <h2>Step 3: Map Columns and Preview Data</h2>
                <p>Define which columns contain the part number, quantity, and other relevant data.</p>
                <div id="mapping-interface"></div>
                <div id="table-preview-container"></div>
            </div>
        </div>
    `;
    wizardContainer.innerHTML = wizardHTML;

    // --- DOM ELEMENTS ---
    const dropZone = document.getElementById('file-drop-zone');
    const fileInput = document.getElementById('file-input');
    const fileInfo = document.getElementById('file-info');

    // --- FUNCTIONS ---
    const goToStep = (stepNumber) => {
        document.querySelectorAll('.wizard-step').forEach(step => step.classList.remove('is-active'));
        document.getElementById(`step-${stepNumber}`).classList.add('is-active');
    };

    const handleFile = async (file) => {
        if (!file) {
            fileInfo.textContent = 'No file selected.';
            return;
        }
        fileInfo.textContent = `Selected file: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`;

        try {
            workbook = await excelCore.parseFile(file);
            populateSheetList(workbook);
            goToStep(2);
        } catch (error) {
            fileInfo.textContent = `Error: ${error.message}`;
            console.error(error);
        }
    };

    const populateSheetList = (workbook) => {
        const sheetListContainer = document.getElementById('sheet-list');
        sheetListContainer.innerHTML = '';
        workbook.SheetNames.forEach(sheetName => {
            const button = document.createElement('button');
            button.className = 'btn';
            button.textContent = sheetName;
            button.addEventListener('click', () => handleSheetSelection(sheetName));
            sheetListContainer.appendChild(button);
        });
    };

    const handleSheetSelection = (sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        if (worksheet) {
            const previewContainer = document.getElementById('table-preview-container');
            const mappingContainer = document.getElementById('mapping-interface');
            tableRenderer.render(worksheet, previewContainer);
            renderMappingInterface(worksheet);
        } else {
            console.error(`Sheet "${sheetName}" not found in workbook.`);
        }
        goToStep(3);
    };

    const renderMappingInterface = (worksheet) => {
        const mappingContainer = document.getElementById('mapping-interface');
        mappingContainer.innerHTML = '';
        const headers = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })[0];
        const mappingOptions = ['Ignore', 'Part Number', 'Quantity', 'Description'];
        const grid = document.createElement('div');
        grid.className = 'mapping-grid';

        headers.forEach((header, index) => {
            const card = document.createElement('div');
            card.className = 'mapping-card';
            const label = document.createElement('label');
            label.htmlFor = `map-col-${index}`;
            label.textContent = `Column ${String.fromCharCode(65 + index)}: ${header}`;
            const select = document.createElement('select');
            select.id = `map-col-${index}`;
            select.className = 'mapping-select';
            mappingOptions.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt.toLowerCase().replace(' ', '-');
                option.textContent = opt;
                select.appendChild(option);
            });
            card.appendChild(label);
            card.appendChild(select);
            grid.appendChild(card);
        });
        mappingContainer.appendChild(grid);
    };

    // --- EVENT LISTENERS ---
    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('is-dragover');
    });
    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('is-dragover');
    });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('is-dragover');
        const files = e.dataTransfer.files;
        if (files.length) {
            handleFile(files[0]);
        }
    });

    // --- INITIALIZATION ---
    goToStep(1);
}

// Initialize all components for the page
document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    initFooter();
    initSettingsModal();
    initAdvancedApiTool();
});
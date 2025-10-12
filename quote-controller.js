/**
 * Quote Generator Main Controller
 * Modular architecture for future extensibility
 * Author: Generated for K4lp.github.io
 */

(function() {
    'use strict';

    // Main Controller Class
    class QuoteController {
        constructor() {
            this.state = {
                currentFile: null,
                currentSheet: null,
                sheetData: null,
                selectedRows: new Set(),
                columnMapping: new Map(),
                mpnColumn: null,
                manufacturerColumn: null,
                quantityColumn: null,
                outputColumns: [],
                isProcessing: false,
                results: [],
                stats: { processed: 0, success: 0, warning: 0, error: 0, startTime: 0 },
                digikeyToken: null,
                digikeyTokenExpiry: 0
            };

            this.initializeModules();
            this.bindEvents();
            this.log('Quote Controller initialized', 'success');
        }

        initializeModules() {
            // Initialize core modules
            this.config = this.createConfigManager();
            this.excel = this.createExcelProcessor();
            this.api = this.createAPIManager();
            this.ui = this.createUIManager();
        }

        createConfigManager() {
            return {
                saveDigikeyCredentials: (id, secret, env, locale) => {
                    const creds = { clientId: id, clientSecret: secret, environment: env, locale };
                    localStorage.setItem('dk_quote_creds', JSON.stringify(creds));
                    this.log('Digikey credentials saved', 'success');
                    return creds;
                },
                saveMouserCredentials: (apiKey) => {
                    const creds = { apiKey };
                    localStorage.setItem('mouser_quote_creds', JSON.stringify(creds));
                    this.log('Mouser credentials saved', 'success');
                    return creds;
                },
                getDigikeyCredentials: () => {
                    try {
                        return JSON.parse(localStorage.getItem('dk_quote_creds') || '{}');
                    } catch { return {}; }
                },
                getMouserCredentials: () => {
                    try {
                        return JSON.parse(localStorage.getItem('mouser_quote_creds') || '{}');
                    } catch { return {}; }
                },
                clearCredentials: () => {
                    localStorage.removeItem('dk_quote_creds');
                    localStorage.removeItem('mouser_quote_creds');
                    this.log('All credentials cleared', 'info');
                }
            };
        }

        createExcelProcessor() {
            return {
                parseFile: async (file) => {
                    // Load SheetJS library dynamically
                    if (!window.XLSX) {
                        await this.loadSheetJS();
                    }

                    return new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            try {
                                const data = new Uint8Array(e.target.result);
                                const workbook = window.XLSX.read(data, { type: 'array' });
                                
                                const sheets = workbook.SheetNames.map(name => {
                                    const sheet = workbook.Sheets[name];
                                    const jsonData = window.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
                                    return { name, data: jsonData };
                                });

                                resolve({ workbook, sheets });
                            } catch (error) {
                                reject(error);
                            }
                        };
                        reader.onerror = reject;
                        reader.readAsArrayBuffer(file);
                    });
                },

                exportWithData: async (originalFile, newData, selectedSheet) => {
                    const workbook = originalFile.workbook;
                    const sheet = workbook.Sheets[selectedSheet];
                    
                    // Update sheet with new data while preserving formatting
                    newData.forEach((item) => {
                        const rowIndex = item.rowIndex;
                        Object.entries(item).forEach(([colKey, value]) => {
                            if (colKey === 'rowIndex') return; // Skip rowIndex
                            
                            const colIndex = parseInt(colKey);
                            if (isNaN(colIndex)) return;
                            
                            const cellAddress = window.XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
                            if (!sheet[cellAddress]) {
                                sheet[cellAddress] = { t: 's', v: '' };
                            }
                            sheet[cellAddress].v = value;
                            if (typeof value === 'number') {
                                sheet[cellAddress].t = 'n';
                            } else {
                                sheet[cellAddress].t = 's';
                            }
                        });
                    });

                    // Export modified workbook
                    const wbout = window.XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
                    const blob = new Blob([wbout], { type: 'application/octet-stream' });
                    
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    const timestamp = new Date().toISOString().split('T')[0];
                    a.href = url;
                    a.download = `processed-${timestamp}-${originalFile.name || 'export'}.xlsx`;
                    a.click();
                    URL.revokeObjectURL(url);

                    this.log('Excel file exported successfully', 'success');
                }
            };
        }

        createAPIManager() {
            return {
                searchDigikey: async (mpn, manufacturer, credentials) => {
                    // Implement Digikey API calls
                    const config = credentials.environment === 'sandbox' ? 
                        { baseUrl: 'https://sandbox-api.digikey.com', tokenUrl: 'https://sandbox-api.digikey.com/v1/oauth2/token' } :
                        { baseUrl: 'https://api.digikey.com', tokenUrl: 'https://api.digikey.com/v1/oauth2/token' };

                    // Get token if needed
                    if (!this.state.digikeyToken || this.state.digikeyTokenExpiry < Date.now() + 300000) {
                        await this.authenticateDigikey(credentials, config);
                    }

                    try {
                        const response = await fetch(`${config.baseUrl}/products/v4/search/${encodeURIComponent(mpn)}/productdetails`, {
                            headers: {
                                'Content-Type': 'application/json',
                                'X-DIGIKEY-Client-Id': credentials.clientId,
                                'Authorization': `Bearer ${this.state.digikeyToken}`,
                                'X-DIGIKEY-Locale-Site': credentials.locale.split('/')[0],
                                'X-DIGIKEY-Locale-Language': 'en',
                                'X-DIGIKEY-Locale-Currency': credentials.locale.split('/')[1]
                            }
                        });

                        if (!response.ok) throw new Error(`Digikey API error: ${response.status}`);
                        
                        const data = await response.json();
                        return this.parseDigikeyResponse(data);
                    } catch (error) {
                        this.log(`Digikey API error for ${mpn}: ${error.message}`, 'error');
                        return null;
                    }
                },

                searchMouser: async (mpn, manufacturer, apiKey) => {
                    try {
                        const response = await fetch('https://api.mouser.com/api/v1/search/partnumber', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Accept': 'application/json'
                            },
                            body: JSON.stringify({
                                SearchByPartRequest: {
                                    mouserPartNumber: mpn,
                                    partSearchOptions: apiKey
                                }
                            })
                        });

                        if (!response.ok) throw new Error(`Mouser API error: ${response.status}`);
                        
                        const data = await response.json();
                        return this.parseMouserResponse(data);
                    } catch (error) {
                        this.log(`Mouser API error for ${mpn}: ${error.message}`, 'error');
                        return null;
                    }
                }
            };
        }

        createUIManager() {
            return {
                updateProgress: (current, total) => {
                    const pct = Math.round((current / total) * 100);
                    const progressBar = document.getElementById('progressBar');
                    const progressText = document.getElementById('progressText');
                    
                    if (progressBar) progressBar.style.width = pct + '%';
                    if (progressText) progressText.textContent = `${current} / ${total} (${pct}%)`;

                    // Update stats
                    const elements = ['statProcessed', 'statSuccess', 'statWarning', 'statError'];
                    const values = [current, this.state.stats.success, this.state.stats.warning, this.state.stats.error];
                    
                    elements.forEach((id, index) => {
                        const el = document.getElementById(id);
                        if (el) el.textContent = values[index];
                    });

                    // Calculate rate and ETA
                    const elapsed = (Date.now() - this.state.stats.startTime) / 1000;
                    const rate = current / elapsed;
                    const remaining = total - current;
                    const eta = remaining / rate;

                    const rateEl = document.getElementById('statRate');
                    const etaEl = document.getElementById('statETA');
                    
                    if (rateEl) rateEl.textContent = isFinite(rate) ? rate.toFixed(1) + '/s' : '0/s';
                    if (etaEl) {
                        if (isFinite(eta) && eta > 0) {
                            const m = Math.floor(eta / 60);
                            const s = Math.floor(eta % 60);
                            etaEl.textContent = m > 0 ? `${m}m ${s}s` : `${s}s`;
                        } else {
                            etaEl.textContent = '--';
                        }
                    }
                },

                showElement: (id) => {
                    const el = document.getElementById(id);
                    if (el) el.classList.remove('hidden');
                },

                hideElement: (id) => {
                    const el = document.getElementById(id);
                    if (el) el.classList.add('hidden');
                },

                updateStatus: (elementId, status, text) => {
                    const el = document.getElementById(elementId);
                    if (el) {
                        el.className = `badge badge--${status}`;
                        el.textContent = text;
                    }
                }
            };
        }

        async loadSheetJS() {
            if (window.XLSX) return;
            
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }

        async authenticateDigikey(credentials, config) {
            try {
                const response = await fetch(config.tokenUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        client_id: credentials.clientId,
                        client_secret: credentials.clientSecret,
                        grant_type: 'client_credentials'
                    })
                });

                if (!response.ok) throw new Error(`Authentication failed: ${response.status}`);
                
                const data = await response.json();
                this.state.digikeyToken = data.access_token;
                this.state.digikeyTokenExpiry = Date.now() + ((data.expires_in - 60) * 1000);
                
                this.ui.updateStatus('dkStatus', 'success', 'Active');
                this.log('Digikey authentication successful', 'success');
            } catch (error) {
                this.ui.updateStatus('dkStatus', 'error', 'Auth Failed');
                this.log(`Digikey authentication failed: ${error.message}`, 'error');
                throw error;
            }
        }

        parseDigikeyResponse(data) {
            if (!data?.Product) return null;
            
            const product = data.Product;
            return {
                unitPrice: product.UnitPrice || '',
                manufacturer: product.Manufacturer?.Name || '',
                detailedDescription: product.Description?.DetailedDescription || '',
                datasheet: product.PrimaryDatasheet || product.DatasheetUrl || '',
                stockAvailable: product.QuantityAvailable || 0,
                packageCase: this.extractParam(product.Parameters, ['Package', 'Case']),
                htsusFull: product.Classifications?.HtsusCode || '',
                htsusStripped: this.cleanHTSUS(product.Classifications?.HtsusCode || '')
            };
        }

        parseMouserResponse(data) {
            if (!data?.SearchResults?.Parts?.length) return null;
            
            const part = data.SearchResults.Parts[0];
            return {
                unitPrice: part.UnitPrice || '',
                manufacturer: part.Manufacturer || '',
                detailedDescription: part.Description || '',
                datasheet: part.DataSheetUrl || '',
                stockAvailable: part.Availability || 0,
                htsusFull: part.HtsusCode || '',
                htsusStripped: this.cleanHTSUS(part.HtsusCode || '')
            };
        }

        extractParam(parameters, names) {
            if (!Array.isArray(parameters)) return '';
            const param = parameters.find(p => 
                p?.ParameterText && names.some(n => 
                    p.ParameterText.toLowerCase().includes(n.toLowerCase())
                )
            );
            return param?.ValueText || '';
        }

        cleanHTSUS(code) {
            if (!code) return '';
            return String(code).replace(/\D/g, '').slice(0, 8);
        }

        bindEvents() {
            // Configuration panel
            document.getElementById('showConfig')?.addEventListener('click', () => this.toggleConfigPanel(true));
            document.getElementById('toggleConfig')?.addEventListener('click', () => this.toggleConfigPanel(false));
            
            // Credential management
            document.getElementById('saveDkCreds')?.addEventListener('click', () => this.saveDigikeyCredentials());
            document.getElementById('clearDkCreds')?.addEventListener('click', () => this.clearDigikeyCredentials());
            document.getElementById('saveMouserCreds')?.addEventListener('click', () => this.saveMouserCredentials());
            document.getElementById('clearMouserCreds')?.addEventListener('click', () => this.clearMouserCredentials());
            
            // File processing
            document.getElementById('fileInput')?.addEventListener('change', (e) => this.handleFileUpload(e));
            document.getElementById('sheetSelect')?.addEventListener('change', (e) => this.handleSheetSelection(e));
            
            // Row selection
            document.getElementById('selectDataRows')?.addEventListener('click', () => this.openRowSelectionModal());
            document.getElementById('clearRowSelection')?.addEventListener('click', () => this.clearRowSelection());
            document.getElementById('closeRowModal')?.addEventListener('click', () => this.closeRowSelectionModal());
            document.getElementById('confirmRowSelection')?.addEventListener('click', () => this.confirmRowSelection());
            document.getElementById('cancelRowSelection')?.addEventListener('click', () => this.closeRowSelectionModal());
            
            // Column management
            document.getElementById('addColumn')?.addEventListener('click', () => this.addOutputColumn());
            
            // Processing
            document.getElementById('processFile')?.addEventListener('click', () => this.processFile());
            document.getElementById('exportResult')?.addEventListener('click', () => this.exportResults());
            
            // Load saved credentials
            this.loadSavedCredentials();
        }

        toggleConfigPanel(show) {
            const panel = document.getElementById('configPanel');
            const status = document.getElementById('configCount');
            
            if (show || panel.style.display === 'none') {
                panel.style.display = 'block';
                status.textContent = 'Open';
            } else {
                panel.style.display = 'none';
                status.textContent = 'Closed';
            }
        }

        saveDigikeyCredentials() {
            const id = document.getElementById('dkClientId').value.trim();
            const secret = document.getElementById('dkClientSecret').value.trim();
            const env = document.getElementById('dkEnvironment').value;
            const locale = document.getElementById('dkLocale').value;
            
            if (!id || !secret) {
                alert('Please enter both Client ID and Secret');
                return;
            }
            
            this.config.saveDigikeyCredentials(id, secret, env, locale);
            this.ui.updateStatus('dkStatus', 'warning', 'Testing...');
            
            // Test credentials
            this.testDigikeyCredentials({ clientId: id, clientSecret: secret, environment: env, locale });
        }

        async testDigikeyCredentials(creds) {
            try {
                const config = creds.environment === 'sandbox' ? 
                    { tokenUrl: 'https://sandbox-api.digikey.com/v1/oauth2/token' } :
                    { tokenUrl: 'https://api.digikey.com/v1/oauth2/token' };
                
                await this.authenticateDigikey(creds, config);
            } catch (error) {
                this.ui.updateStatus('dkStatus', 'error', 'Invalid');
            }
        }

        saveMouserCredentials() {
            const apiKey = document.getElementById('mouserApiKey').value.trim();
            
            if (!apiKey) {
                alert('Please enter API Key');
                return;
            }
            
            this.config.saveMouserCredentials(apiKey);
            this.log('Mouser credentials saved', 'success');
        }

        clearDigikeyCredentials() {
            document.getElementById('dkClientId').value = '';
            document.getElementById('dkClientSecret').value = '';
            this.ui.updateStatus('dkStatus', 'neutral', 'Inactive');
            this.config.clearCredentials();
        }

        clearMouserCredentials() {
            document.getElementById('mouserApiKey').value = '';
            this.config.clearCredentials();
        }

        loadSavedCredentials() {
            const dkCreds = this.config.getDigikeyCredentials();
            const mouserCreds = this.config.getMouserCredentials();
            
            if (dkCreds.clientId) {
                document.getElementById('dkClientId').value = dkCreds.clientId;
                document.getElementById('dkClientSecret').value = dkCreds.clientSecret;
                document.getElementById('dkEnvironment').value = dkCreds.environment || 'production';
                document.getElementById('dkLocale').value = dkCreds.locale || 'US/USD';
                this.ui.updateStatus('dkStatus', 'warning', 'Saved');
            }
            
            if (mouserCreds.apiKey) {
                document.getElementById('mouserApiKey').value = mouserCreds.apiKey;
            }
        }

        async handleFileUpload(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            this.log(`Processing file: ${file.name}`, 'info');
            
            try {
                const result = await this.excel.parseFile(file);
                this.state.currentFile = { ...result, name: file.name };
                
                // Update file info
                document.getElementById('fileName').textContent = file.name;
                document.getElementById('fileSize').textContent = `${(file.size / 1024).toFixed(1)} KB`;
                document.getElementById('sheetCount').textContent = result.sheets.length;
                
                // Populate sheet selector
                const sheetSelect = document.getElementById('sheetSelect');
                sheetSelect.innerHTML = '<option value="">-- Select Sheet --</option>';
                result.sheets.forEach(sheet => {
                    const option = document.createElement('option');
                    option.value = sheet.name;
                    option.textContent = `${sheet.name} (${sheet.data.length} rows)`;
                    sheetSelect.appendChild(option);
                });
                
                this.ui.showElement('fileInfo');
                this.ui.showElement('sheetSelection');
                
                this.log(`File loaded: ${result.sheets.length} sheets found`, 'success');
            } catch (error) {
                this.log(`File loading error: ${error.message}`, 'error');
                alert(`Failed to load file: ${error.message}`);
            }
        }

        handleSheetSelection(event) {
            const sheetName = event.target.value;
            if (!sheetName || !this.state.currentFile) return;
            
            const sheet = this.state.currentFile.sheets.find(s => s.name === sheetName);
            if (!sheet) return;
            
            this.state.currentSheet = sheet;
            this.state.sheetData = sheet.data;
            
            this.renderDataPreview();
            this.ui.showElement('dataPreview');
            
            this.log(`Sheet selected: ${sheetName} (${sheet.data.length} rows)`, 'success');
        }

        renderDataPreview() {
            if (!this.state.sheetData || !this.state.sheetData.length) return;
            
            const previewData = this.state.sheetData.slice(0, 10); // Show first 10 rows
            const table = this.createTable(previewData, false);
            
            document.getElementById('previewTable').innerHTML = '';
            document.getElementById('previewTable').appendChild(table);
        }

        createTable(data, selectable = false) {
            const table = document.createElement('table');
            table.className = 'results-table';
            
            if (!data || !data.length) return table;
            
            // Create header
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            
            if (selectable) {
                const th = document.createElement('th');
                th.textContent = 'Row';
                th.style.width = '60px';
                headerRow.appendChild(th);
            }
            
            const maxCols = Math.max(...data.map(row => row.length));
            for (let i = 0; i < maxCols; i++) {
                const th = document.createElement('th');
                th.textContent = this.getColumnLabel(i);
                headerRow.appendChild(th);
            }
            
            thead.appendChild(headerRow);
            table.appendChild(thead);
            
            // Create body
            const tbody = document.createElement('tbody');
            data.forEach((row, rowIndex) => {
                const tr = document.createElement('tr');
                
                if (selectable) {
                    const td = document.createElement('td');
                    td.textContent = rowIndex + 1;
                    td.className = 'row-selector';
                    td.style.cursor = 'pointer';
                    td.style.backgroundColor = this.state.selectedRows.has(rowIndex) ? '#e3f2fd' : '';
                    td.addEventListener('click', () => this.toggleRowSelection(rowIndex, td));
                    tr.appendChild(td);
                }
                
                for (let i = 0; i < maxCols; i++) {
                    const td = document.createElement('td');
                    td.textContent = row[i] || '';
                    td.style.maxWidth = '200px';
                    td.style.overflow = 'hidden';
                    td.style.textOverflow = 'ellipsis';
                    tr.appendChild(td);
                }
                
                tbody.appendChild(tr);
            });
            
            table.appendChild(tbody);
            return table;
        }

        getColumnLabel(index) {
            let label = '';
            while (index >= 0) {
                label = String.fromCharCode(65 + (index % 26)) + label;
                index = Math.floor(index / 26) - 1;
            }
            return label;
        }

        openRowSelectionModal() {
            if (!this.state.sheetData || !this.state.sheetData.length) {
                alert('Please select a sheet first');
                return;
            }
            
            // Populate column selectors
            this.populateColumnSelectors();
            
            // Create selectable table
            const table = this.createTable(this.state.sheetData, true);
            document.getElementById('rowSelectionTable').innerHTML = '';
            document.getElementById('rowSelectionTable').appendChild(table);
            
            document.getElementById('rowSelectionModal').classList.add('is-open');
        }

        populateColumnSelectors() {
            const selectors = ['mpnColumnSelect', 'mfgColumnSelect', 'qtyColumnSelect'];
            const firstRow = this.state.sheetData[0] || [];
            
            selectors.forEach(selectorId => {
                const select = document.getElementById(selectorId);
                select.innerHTML = `<option value="">-- Select Column --</option>`;
                
                firstRow.forEach((header, index) => {
                    const option = document.createElement('option');
                    option.value = index;
                    option.textContent = `${this.getColumnLabel(index)} - ${header || 'Empty'}`;
                    select.appendChild(option);
                });
            });
        }

        toggleRowSelection(rowIndex, element) {
            if (this.state.selectedRows.has(rowIndex)) {
                this.state.selectedRows.delete(rowIndex);
                element.style.backgroundColor = '';
            } else {
                this.state.selectedRows.add(rowIndex);
                element.style.backgroundColor = '#e3f2fd';
            }
        }

        confirmRowSelection() {
            const mpnCol = document.getElementById('mpnColumnSelect').value;
            const mfgCol = document.getElementById('mfgColumnSelect').value;
            const qtyCol = document.getElementById('qtyColumnSelect').value;
            
            if (!mpnCol) {
                alert('Please select MPN column');
                return;
            }
            
            if (this.state.selectedRows.size === 0) {
                alert('Please select at least one data row');
                return;
            }
            
            // Save selection
            this.state.mpnColumn = parseInt(mpnCol);
            this.state.manufacturerColumn = mfgCol ? parseInt(mfgCol) : null;
            this.state.quantityColumn = qtyCol ? parseInt(qtyCol) : null;
            
            // Update UI
            const firstRow = this.state.sheetData[0] || [];
            document.getElementById('selectedMpnCol').textContent = `${this.getColumnLabel(this.state.mpnColumn)} - ${firstRow[this.state.mpnColumn] || 'Empty'}`;
            document.getElementById('selectedMfgCol').textContent = this.state.manufacturerColumn !== null ? 
                `${this.getColumnLabel(this.state.manufacturerColumn)} - ${firstRow[this.state.manufacturerColumn] || 'Empty'}` : 'Not selected';
            document.getElementById('selectedQtyCol').textContent = this.state.quantityColumn !== null ? 
                `${this.getColumnLabel(this.state.quantityColumn)} - ${firstRow[this.state.quantityColumn] || 'Empty'}` : 'Not selected';
            document.getElementById('selectedDataRows').textContent = `${this.state.selectedRows.size} rows selected`;
            
            this.ui.showElement('rowSelectionInfo');
            this.ui.showElement('columnMapping');
            this.ui.showElement('processingControls');
            
            this.closeRowSelectionModal();
            
            this.log(`Row selection confirmed: ${this.state.selectedRows.size} rows, MPN column: ${this.getColumnLabel(this.state.mpnColumn)}`, 'success');
        }

        closeRowSelectionModal() {
            document.getElementById('rowSelectionModal').classList.remove('is-open');
        }

        clearRowSelection() {
            this.state.selectedRows.clear();
            this.state.mpnColumn = null;
            this.state.manufacturerColumn = null;
            this.state.quantityColumn = null;
            
            this.ui.hideElement('rowSelectionInfo');
            this.ui.hideElement('columnMapping');
            this.ui.hideElement('processingControls');
            
            this.log('Row selection cleared', 'info');
        }

        addOutputColumn() {
            const columnId = Date.now();
            const columnDiv = document.createElement('div');
            columnDiv.className = 'card';
            columnDiv.innerHTML = `
                <div class="card__header">
                    <h4 class="card__title">Output Column ${this.state.outputColumns.length + 1}</h4>
                    <button class="button button--ghost text-error" onclick="quoteController.removeOutputColumn(${columnId})">×</button>
                </div>
                <div class="p-16">
                    <div class="form__group mb-16">
                        <label class="label">Data Source</label>
                        <select class="select source-select" data-column-id="${columnId}">
                            <option value="">-- Select Source --</option>
                            <optgroup label="Digikey">
                                <option value="dk-unitprice">Unit Price</option>
                                <option value="dk-manufacturer">Manufacturer</option>
                                <option value="dk-description">Detailed Description</option>
                                <option value="dk-datasheet">Datasheet</option>
                                <option value="dk-stock">Stock Available</option>
                                <option value="dk-package">Package / Case</option>
                                <option value="dk-htsus">HTSUS Number</option>
                                <option value="dk-htsus-stripped">HTSUS Stripped</option>
                            </optgroup>
                            <optgroup label="Mouser">
                                <option value="ms-unitprice">Unit Price</option>
                                <option value="ms-manufacturer">Manufacturer</option>
                                <option value="ms-description">Detailed Description</option>
                                <option value="ms-datasheet">Datasheet</option>
                                <option value="ms-stock">Stock Available</option>
                                <option value="ms-htsus">HTSUS Number</option>
                                <option value="ms-htsus-stripped">HTSUS Stripped</option>
                            </optgroup>
                        </select>
                    </div>
                    <div class="form__group">
                        <label class="label">Column Header</label>
                        <input type="text" class="input header-input" data-column-id="${columnId}" placeholder="Enter column header">
                    </div>
                </div>
            `;
            
            document.getElementById('columnList').appendChild(columnDiv);
            this.state.outputColumns.push({ id: columnId, source: '', header: '' });
            
            // Bind events for this column
            columnDiv.querySelector('.source-select').addEventListener('change', (e) => {
                const column = this.state.outputColumns.find(col => col.id === columnId);
                if (column) column.source = e.target.value;
            });
            
            columnDiv.querySelector('.header-input').addEventListener('input', (e) => {
                const column = this.state.outputColumns.find(col => col.id === columnId);
                if (column) column.header = e.target.value;
            });
            
            this.log('Output column added', 'info');
        }

        removeOutputColumn(columnId) {
            const columnDiv = document.querySelector(`[data-column-id="${columnId}"]`).closest('.card');
            if (columnDiv) {
                columnDiv.remove();
                this.state.outputColumns = this.state.outputColumns.filter(col => col.id !== columnId);
                this.log('Output column removed', 'info');
            }
        }

        async processFile() {
            if (!this.validateProcessingReadiness()) return;
            
            this.state.isProcessing = true;
            this.state.stats = { processed: 0, success: 0, warning: 0, error: 0, startTime: Date.now() };
            
            document.getElementById('processFile').disabled = true;
            this.ui.showElement('progressSection');
            
            const processableRows = Array.from(this.state.selectedRows);
            const totalRows = processableRows.length;
            
            this.log(`Starting processing: ${totalRows} rows`, 'info');
            
            try {
                const concurrency = parseInt(document.getElementById('concurrency').value) || 3;
                const results = [];
                
                // Process in batches
                for (let i = 0; i < processableRows.length; i += concurrency) {
                    const batch = processableRows.slice(i, i + concurrency);
                    const batchPromises = batch.map(rowIndex => this.processRow(rowIndex));
                    
                    const batchResults = await Promise.allSettled(batchPromises);
                    batchResults.forEach((result, batchIndex) => {
                        const actualIndex = i + batchIndex;
                        if (result.status === 'fulfilled') {
                            results.push(result.value);
                            this.state.stats.success++;
                        } else {
                            results.push({ error: result.reason, rowIndex: processableRows[actualIndex] });
                            this.state.stats.error++;
                        }
                        this.state.stats.processed++;
                        this.ui.updateProgress(this.state.stats.processed, totalRows);
                    });
                    
                    // Small delay between batches
                    if (i + concurrency < processableRows.length) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                }
                
                this.state.results = results;
                this.displayResults();
                
                document.getElementById('exportResult').disabled = false;
                this.log(`Processing complete: ${this.state.stats.success} success, ${this.state.stats.error} errors`, 'success');
                
            } catch (error) {
                this.log(`Processing failed: ${error.message}`, 'error');
                alert(`Processing failed: ${error.message}`);
            } finally {
                this.state.isProcessing = false;
                document.getElementById('processFile').disabled = false;
            }
        }

        validateProcessingReadiness() {
            if (!this.state.sheetData) {
                alert('Please load an Excel file first');
                return false;
            }
            
            if (this.state.selectedRows.size === 0) {
                alert('Please select data rows first');
                return false;
            }
            
            if (this.state.mpnColumn === null) {
                alert('Please configure MPN column');
                return false;
            }
            
            if (this.state.outputColumns.length === 0) {
                alert('Please add at least one output column');
                return false;
            }
            
            const hasValidColumns = this.state.outputColumns.some(col => col.source && col.header);
            if (!hasValidColumns) {
                alert('Please configure at least one output column properly');
                return false;
            }
            
            return true;
        }

        async processRow(rowIndex) {
            const row = this.state.sheetData[rowIndex];
            const mpn = row[this.state.mpnColumn]?.toString().trim();
            const manufacturer = this.state.manufacturerColumn !== null ? row[this.state.manufacturerColumn]?.toString().trim() : '';
            const quantity = this.state.quantityColumn !== null ? row[this.state.quantityColumn]?.toString().trim() : '';
            
            if (!mpn) {
                throw new Error('Empty MPN');
            }
            
            const result = { rowIndex, mpn, manufacturer, quantity, data: {} };
            
            // Process each output column
            for (const outputCol of this.state.outputColumns) {
                if (!outputCol.source || !outputCol.header) continue;
                
                try {
                    const [api, field] = outputCol.source.split('-');
                    let apiResult = null;
                    
                    if (api === 'dk') {
                        const dkCreds = this.config.getDigikeyCredentials();
                        if (dkCreds.clientId) {
                            apiResult = await this.api.searchDigikey(mpn, manufacturer, dkCreds);
                        }
                    } else if (api === 'ms') {
                        const mouserCreds = this.config.getMouserCredentials();
                        if (mouserCreds.apiKey) {
                            apiResult = await this.api.searchMouser(mpn, manufacturer, mouserCreds.apiKey);
                        }
                    }
                    
                    if (apiResult) {
                        result.data[outputCol.header] = this.extractFieldValue(apiResult, field);
                    } else {
                        result.data[outputCol.header] = 'N/A';
                    }
                } catch (error) {
                    result.data[outputCol.header] = `Error: ${error.message}`;
                }
            }
            
            return result;
        }

        extractFieldValue(apiResult, field) {
            const fieldMap = {
                'unitprice': 'unitPrice',
                'manufacturer': 'manufacturer',
                'description': 'detailedDescription',
                'datasheet': 'datasheet',
                'stock': 'stockAvailable',
                'package': 'packageCase',
                'htsus': 'htsusFull',
                'htsus-stripped': 'htsusStripped'
            };
            
            const mappedField = fieldMap[field] || field;
            return apiResult[mappedField] || '';
        }

        displayResults() {
            if (!this.state.results.length) {
                document.getElementById('emptyResults').classList.remove('hidden');
                document.getElementById('resultsTable').classList.add('hidden');
                return;
            }
            
            document.getElementById('emptyResults').classList.add('hidden');
            
            // Create results table
            const table = document.createElement('table');
            table.className = 'results-table';
            
            // Headers
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            
            ['Row', 'MPN', 'Manufacturer', 'Quantity'].forEach(header => {
                const th = document.createElement('th');
                th.textContent = header;
                headerRow.appendChild(th);
            });
            
            this.state.outputColumns.forEach(col => {
                if (col.header) {
                    const th = document.createElement('th');
                    th.textContent = col.header;
                    headerRow.appendChild(th);
                }
            });
            
            thead.appendChild(headerRow);
            table.appendChild(thead);
            
            // Body
            const tbody = document.createElement('tbody');
            this.state.results.forEach(result => {
                const row = document.createElement('tr');
                
                // Basic columns
                [result.rowIndex + 1, result.mpn, result.manufacturer, result.quantity].forEach(value => {
                    const td = document.createElement('td');
                    td.textContent = value || '';
                    row.appendChild(td);
                });
                
                // Data columns
                this.state.outputColumns.forEach(col => {
                    if (col.header) {
                        const td = document.createElement('td');
                        td.textContent = result.data[col.header] || '';
                        row.appendChild(td);
                    }
                });
                
                tbody.appendChild(row);
            });
            
            table.appendChild(tbody);
            
            document.getElementById('resultsTable').innerHTML = '';
            document.getElementById('resultsTable').appendChild(table);
            document.getElementById('resultsTable').classList.remove('hidden');
        }

        async exportResults() {
            if (!this.state.results.length || !this.state.currentFile) {
                alert('No results to export');
                return;
            }
            
            try {
                // Prepare enhanced data for export
                const enhancedData = [];
                
                this.state.results.forEach(result => {
                    // Find the next available column after existing data
                    const originalRow = this.state.sheetData[result.rowIndex] || [];
                    let nextCol = originalRow.length;
                    
                    const rowData = { rowIndex: result.rowIndex };
                    
                    this.state.outputColumns.forEach(col => {
                        if (col.header && result.data[col.header]) {
                            rowData[nextCol] = result.data[col.header];
                            nextCol++;
                        }
                    });
                    
                    enhancedData.push(rowData);
                });
                
                await this.excel.exportWithData(this.state.currentFile, enhancedData, this.state.currentSheet.name);
                
                this.log('Export completed successfully', 'success');
            } catch (error) {
                this.log(`Export failed: ${error.message}`, 'error');
                alert(`Export failed: ${error.message}`);
            }
        }

        log(message, type = 'info') {
            const logElement = document.getElementById('log');
            const timestamp = new Date().toLocaleTimeString();
            const prefix = {
                'info': '•',
                'success': '✓',
                'warning': '⚠',
                'error': '✗'
            }[type] || '•';
            
            logElement.textContent += `\n[${timestamp}] ${prefix} ${message}`;
            logElement.scrollTop = logElement.scrollHeight;
        }
    }

    // Initialize controller when DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        window.quoteController = new QuoteController();
    });
    
    // Initialize immediately if DOM is already ready
    if (document.readyState !== 'loading') {
        window.quoteController = new QuoteController();
    }

})();
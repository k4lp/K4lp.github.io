(function() {
    'use strict';

    // Main Quote Controller - Orchestrates all modules
    class QuoteController {
        constructor() {
            this.modules = {};
            this.state = {
                isProcessing: false,
                currentFile: null,
                processedData: null,
                originalWorkbook: null
            };
            
            this.init();
        }

        async init() {
            try {
                // Initialize core modules
                await this.loadModules();
                
                // Setup event listeners
                this.setupEventListeners();
                
                // Initialize UI components
                this.initializeUI();
                
                this.log('Quote Controller initialized successfully', 'success');
            } catch (error) {
                this.log(`Failed to initialize Quote Controller: ${error.message}`, 'error');
            }
        }

        async loadModules() {
            // Dynamic module loading - extensible for future features
            const modulePromises = [
                this.loadModule('CredentialManager', 'js/quote/credential-manager.js'),
                this.loadModule('ExcelProcessor', 'js/quote/excel-processor.js'),
                this.loadModule('ApiManager', 'js/quote/api-manager.js'),
                this.loadModule('UIManager', 'js/quote/ui-manager.js')
            ];

            await Promise.all(modulePromises);
        }

        async loadModule(name, path) {
            try {
                // Load module script dynamically
                await this.loadScript(path);
                
                // Initialize module if it exists in global scope
                if (window[name]) {
                    this.modules[name] = new window[name](this);
                    this.log(`Module ${name} loaded successfully`, 'info');
                } else {
                    throw new Error(`Module ${name} not found in global scope`);
                }
            } catch (error) {
                this.log(`Failed to load module ${name}: ${error.message}`, 'error');
                throw error;
            }
        }

        loadScript(src) {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = src;
                script.onload = resolve;
                script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
                document.head.appendChild(script);
            });
        }

        setupEventListeners() {
            // Settings panel toggle
            document.getElementById('toggleSettings').addEventListener('click', () => {
                this.modules.UIManager?.toggleSettings();
            });

            // Credential management
            document.getElementById('saveCredentials').addEventListener('click', () => {
                this.modules.CredentialManager?.saveCredentials();
            });

            document.getElementById('testCredentials').addEventListener('click', () => {
                this.modules.CredentialManager?.testCredentials();
            });

            document.getElementById('clearCredentials').addEventListener('click', () => {
                this.modules.CredentialManager?.clearCredentials();
            });

            // Excel file processing
            document.getElementById('excelFile').addEventListener('change', (e) => {
                this.handleFileUpload(e.target.files[0]);
            });

            document.getElementById('sheetSelect').addEventListener('change', (e) => {
                this.handleSheetSelection(e.target.value);
            });

            // Column mapping
            document.getElementById('addColumn').addEventListener('click', () => {
                this.modules.UIManager?.addDynamicColumn();
            });

            // Processing controls
            document.getElementById('startProcessing').addEventListener('click', () => {
                this.startProcessing();
            });

            document.getElementById('cancelProcessing').addEventListener('click', () => {
                this.cancelProcessing();
            });

            // Export controls
            document.getElementById('downloadExcel').addEventListener('click', () => {
                this.downloadExcel();
            });

            document.getElementById('previewResults').addEventListener('click', () => {
                this.previewResults();
            });

            document.getElementById('resetTool').addEventListener('click', () => {
                this.resetTool();
            });

            // Modal controls
            document.getElementById('closePreview').addEventListener('click', () => {
                this.modules.UIManager?.closeModal();
            });

            // Column change validation
            ['mpnColumn', 'manufacturerColumn', 'quantityColumn'].forEach(id => {
                document.getElementById(id).addEventListener('change', () => {
                    this.validateColumnMapping();
                });
            });
        }

        initializeUI() {
            // Load saved credentials
            this.modules.CredentialManager?.loadCredentials();
            
            // Set initial UI state
            this.updateSystemStatus('Ready');
        }

        async handleFileUpload(file) {
            if (!file) return;

            this.log(`Processing file: ${file.name}`, 'info');
            
            try {
                const workbook = await this.modules.ExcelProcessor.loadFile(file);
                this.state.originalWorkbook = workbook;
                this.state.currentFile = file;
                
                this.modules.UIManager.populateSheetSelection(workbook.SheetNames);
                this.log(`File loaded successfully: ${workbook.SheetNames.length} sheets found`, 'success');
            } catch (error) {
                this.log(`Failed to load file: ${error.message}`, 'error');
            }
        }

        handleSheetSelection(sheetName) {
            if (!sheetName || !this.state.originalWorkbook) return;

            try {
                const sheetData = this.modules.ExcelProcessor.getSheetData(this.state.originalWorkbook, sheetName);
                this.modules.UIManager.showDataPreview(sheetData);
                this.modules.UIManager.populateColumnSelectors(sheetData.headers);
                
                this.log(`Sheet '${sheetName}' selected and preview loaded`, 'success');
            } catch (error) {
                this.log(`Failed to process sheet: ${error.message}`, 'error');
            }
        }

        validateColumnMapping() {
            const mpnColumn = document.getElementById('mpnColumn').value;
            const manufacturerColumn = document.getElementById('manufacturerColumn').value;
            const quantityColumn = document.getElementById('quantityColumn').value;

            const isValid = mpnColumn && manufacturerColumn && quantityColumn;
            document.getElementById('startProcessing').disabled = !isValid;

            if (isValid) {
                this.log('Column mapping configured successfully', 'success');
            }
        }

        async startProcessing() {
            if (this.state.isProcessing) return;

            try {
                this.state.isProcessing = true;
                this.updateSystemStatus('Processing');
                
                // Show processing section
                this.modules.UIManager.showProcessingProgress();
                
                // Get configuration
                const config = this.getProcessingConfig();
                
                // Start processing
                const results = await this.modules.ExcelProcessor.processWithAPIs(
                    this.state.originalWorkbook,
                    config,
                    this.modules.ApiManager,
                    (progress) => this.updateProgress(progress)
                );

                this.state.processedData = results;
                
                // Show export section
                this.modules.UIManager.showExportSection();
                this.updateSystemStatus('Complete');
                
                this.log('Processing completed successfully', 'success');
            } catch (error) {
                this.log(`Processing failed: ${error.message}`, 'error');
                this.updateSystemStatus('Error');
            } finally {
                this.state.isProcessing = false;
            }
        }

        getProcessingConfig() {
            return {
                sheetName: document.getElementById('sheetSelect').value,
                mpnColumn: document.getElementById('mpnColumn').value,
                manufacturerColumn: document.getElementById('manufacturerColumn').value,
                quantityColumn: document.getElementById('quantityColumn').value,
                dynamicColumns: this.modules.UIManager.getDynamicColumnsConfig(),
                credentials: this.modules.CredentialManager.getCredentials()
            };
        }

        cancelProcessing() {
            if (!this.state.isProcessing) return;

            this.modules.ExcelProcessor.cancelProcessing();
            this.state.isProcessing = false;
            this.updateSystemStatus('Cancelled');
            this.modules.UIManager.hideProcessingProgress();
            
            this.log('Processing cancelled by user', 'warning');
        }

        updateProgress(progress) {
            this.modules.UIManager.updateProgress(progress);
        }

        downloadExcel() {
            if (!this.state.processedData) {
                this.log('No processed data available for download', 'error');
                return;
            }

            try {
                this.modules.ExcelProcessor.downloadEnhancedFile(
                    this.state.processedData, 
                    this.state.currentFile.name
                );
                
                this.log('Enhanced Excel file downloaded successfully', 'success');
            } catch (error) {
                this.log(`Failed to download file: ${error.message}`, 'error');
            }
        }

        previewResults() {
            if (!this.state.processedData) {
                this.log('No processed data available for preview', 'error');
                return;
            }

            this.modules.UIManager.showResultsPreview(this.state.processedData);
        }

        resetTool() {
            // Reset state
            this.state = {
                isProcessing: false,
                currentFile: null,
                processedData: null,
                originalWorkbook: null
            };

            // Reset UI
            this.modules.UIManager.resetUI();
            this.updateSystemStatus('Ready');
            
            this.log('Tool reset successfully', 'info');
        }

        updateSystemStatus(status) {
            document.getElementById('systemStatus').textContent = status;
        }

        log(message, type = 'info') {
            const timestamp = new Date().toLocaleTimeString();
            const prefix = {
                'success': '✓',
                'error': '✗',
                'warning': '⚠',
                'info': '•'
            }[type] || '•';
            
            const logElement = document.getElementById('systemLog');
            logElement.textContent += `\n[${timestamp}] ${prefix} ${message}`;
            logElement.scrollTop = logElement.scrollHeight;
        }

        // Public API for modules to communicate with controller
        getState() {
            return { ...this.state };
        }

        setState(updates) {
            Object.assign(this.state, updates);
        }

        getModule(name) {
            return this.modules[name];
        }
    }

    // Initialize controller when DOM is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.quoteController = new QuoteController();
        });
    } else {
        window.quoteController = new QuoteController();
    }
})();
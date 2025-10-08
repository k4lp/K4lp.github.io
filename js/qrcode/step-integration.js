/**
 * Step Integration Module
 * Connects Excel/Range/Scanner handlers to Step Tracker
 */

window.QRScannerStepIntegration = {
    initialized: false,
    
    init() {
        if (this.initialized) return;
        
        console.log('Initializing Step Integration...');
        
        // Hook into existing file upload handler
        this._hookFileUpload();
        
        // Hook into sheet selection
        this._hookSheetSelection();
        
        // Hook into range selection
        this._hookRangeSelection();
        
        // Hook into column mapping
        this._hookColumnMapping();
        
        this.initialized = true;
        console.log('✓ Step Integration initialized');
    },
    
    _hookFileUpload() {
        const fileInput = document.getElementById('excelFile');
        if (!fileInput) return;
        
        // Monitor for successful file load
        const originalHandler = fileInput.onchange;
        
        fileInput.addEventListener('change', (event) => {
            // Wait for file to be processed
            setTimeout(() => {
                const step2 = document.getElementById('step2');
                if (step2 && !step2.classList.contains('hidden')) {
                    console.log('File loaded → Completing Step 1');
                    window.QRScannerStepManager.markStepCompleted(1);
                    window.QRScannerStepManager.activateStep(2);
                }
            }, 500);
        });
    },
    
    _hookSheetSelection() {
        const sheetSelect = document.getElementById('sheetSelect');
        if (!sheetSelect) return;
        
        sheetSelect.addEventListener('change', (event) => {
            if (event.target.value) {
                // Wait for sheet to be loaded
                setTimeout(() => {
                    const step3 = document.getElementById('step3');
                    if (step3 && !step3.classList.contains('hidden')) {
                        console.log('Sheet selected → Completing Step 2');
                        window.QRScannerStepManager.markStepCompleted(2);
                        window.QRScannerStepManager.activateStep(3);
                    }
                }, 500);
            }
        });
    },
    
    _hookRangeSelection() {
        const confirmBtn = document.getElementById('confirmRange');
        if (!confirmBtn) return;
        
        confirmBtn.addEventListener('click', () => {
            // Wait for confirmation to process
            setTimeout(() => {
                const step4 = document.getElementById('step4');
                if (step4 && !step4.classList.contains('hidden')) {
                    console.log('Range confirmed → Completing Step 3');
                    window.QRScannerStepManager.markStepCompleted(3);
                    window.QRScannerStepManager.activateStep(4);
                }
            }, 500);
        });
    },
    
    _hookColumnMapping() {
        const confirmBtn = document.getElementById('confirmMapping');
        if (!confirmBtn) return;
        
        confirmBtn.addEventListener('click', () => {
            // Wait for mapping to process
            setTimeout(() => {
                const step5 = document.getElementById('step5');
                if (step5 && !step5.classList.contains('hidden')) {
                    console.log('Mapping confirmed → Completing Step 4');
                    window.QRScannerStepManager.markStepCompleted(4);
                    window.QRScannerStepManager.activateStep(5);
                }
            }, 500);
        });
    }
};

// Auto-initialize after step tracker
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            window.QRScannerStepIntegration.init();
        }, 200);
    });
} else {
    setTimeout(() => {
        window.QRScannerStepIntegration.init();
    }, 200);
}

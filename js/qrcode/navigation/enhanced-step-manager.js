/**
 * Enhanced Step Manager - Ultra Compatibility Layer
 * QR Code Component Scanner - K4lp.github.io
 * 
 * ENHANCED: October 8, 2025
 * - Ultra-reliable compatibility with UltraStepTracker
 * - Enhanced error handling and recovery
 * - Production-grade fallback mechanisms
 * - Swiss design integration
 */

class EnhancedStepManager {
    constructor() {
        this.ultraTracker = null;
        this.initialized = false;
        this.fallbackMode = false;
        this.retryCount = 0;
        this.maxRetries = 3;
        
        // Compatibility state for fallback mode
        this.fallbackState = {
            currentVisible: 1,
            highestCompleted: 0,
            autoScrollEnabled: true,
            transitionInProgress: false
        };
    }

    // Initialize with enhanced error handling
    async init() {
        if (this.initialized) {
            console.log('Enhanced Step Manager already initialized');
            return;
        }

        try {
            console.log('🎯 Initializing Enhanced Step Manager...');

            // Wait for UltraStepTracker to be available
            await this._waitForUltraTracker();
            
            if (window.UltraStepTracker) {
                this.ultraTracker = window.UltraStepTracker;
                
                // Ensure UltraStepTracker is initialized
                if (!this.ultraTracker.initialized) {
                    await this.ultraTracker.init();
                }
                
                // Bind to UltraStepTracker events
                this._bindUltraTrackerEvents();
                
                console.log('✅ Enhanced Step Manager initialized with UltraStepTracker');
            } else {
                throw new Error('UltraStepTracker not available');
            }

            this.initialized = true;

        } catch (error) {
            console.error('❌ Failed to initialize Enhanced Step Manager:', error);
            
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                console.log(`🔄 Retry ${this.retryCount}/${this.maxRetries}...`);
                setTimeout(() => this.init(), 1000 * this.retryCount);
            } else {
                console.warn('⚠️ Falling back to compatibility mode');
                this._initializeFallbackMode();
            }
        }
    }

    // Wait for UltraStepTracker with timeout
    async _waitForUltraTracker(timeout = 5000) {
        const startTime = Date.now();
        
        while (!window.UltraStepTracker && (Date.now() - startTime) < timeout) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (!window.UltraStepTracker) {
            throw new Error('UltraStepTracker not loaded within timeout');
        }
    }

    // Bind to UltraStepTracker events
    _bindUltraTrackerEvents() {
        document.addEventListener('step:state-changed', (event) => {
            const { currentVisible, highestCompleted } = event.detail;
            this.fallbackState.currentVisible = currentVisible;
            this.fallbackState.highestCompleted = Math.max(this.fallbackState.highestCompleted, highestCompleted);
        });

        document.addEventListener('step:viewing-changed', (event) => {
            const { stepId } = event.detail;
            this.fallbackState.currentVisible = stepId;
        });

        console.log('🔗 UltraStepTracker events bound');
    }

    // Initialize fallback mode
    _initializeFallbackMode() {
        console.log('⚠️ Initializing fallback compatibility mode...');
        
        this.fallbackMode = true;
        this.initialized = true;
        
        // Setup basic step tracking
        this._setupFallbackTracking();
        
        console.log('✅ Fallback mode initialized');
    }

    // Setup fallback tracking mechanisms
    _setupFallbackTracking() {
        // Basic scroll-based tracking
        let scrollTimeout;
        const handleScroll = () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                this._detectCurrentStepFallback();
            }, 200);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        
        // Basic step indicator update
        setTimeout(() => {
            this._updateStepIndicatorFallback();
        }, 500);
    }

    // Fallback step detection
    _detectCurrentStepFallback() {
        const steps = [
            { id: 1, selector: 'section.mb-48:first-of-type' },
            { id: 2, selector: '#step2' },
            { id: 3, selector: '#step3' },
            { id: 4, selector: '#step4' },
            { id: 5, selector: '#step5' }
        ];

        const viewport = {
            top: window.pageYOffset,
            bottom: window.pageYOffset + window.innerHeight
        };

        let currentStep = 1;
        let maxVisibility = 0;

        steps.forEach(({ id, selector }) => {
            const element = document.querySelector(selector);
            if (!element || element.classList.contains('hidden')) return;

            const rect = element.getBoundingClientRect();
            const elementTop = rect.top + window.pageYOffset;
            const elementBottom = elementTop + rect.height;

            if (elementTop < viewport.bottom && elementBottom > viewport.top) {
                const visibleHeight = Math.min(elementBottom, viewport.bottom) - Math.max(elementTop, viewport.top);
                const visibilityRatio = visibleHeight / rect.height;

                if (visibilityRatio > maxVisibility && visibilityRatio > 0.3) {
                    maxVisibility = visibilityRatio;
                    currentStep = id;
                }
            }
        });

        if (currentStep !== this.fallbackState.currentVisible) {
            this.fallbackState.currentVisible = currentStep;
            this._updateStepIndicatorFallback();
        }
    }

    // Fallback step indicator update
    _updateStepIndicatorFallback() {
        const indicators = document.querySelectorAll('.step-indicator__item');
        
        indicators.forEach((indicator, index) => {
            const stepId = index + 1;
            const numberEl = indicator.querySelector('.step-indicator__number');
            if (!numberEl) return;

            // Clear existing classes
            indicator.classList.remove('is-current', 'is-complete', 'is-active');
            
            // Reset styles
            numberEl.style.backgroundColor = '';
            numberEl.style.color = '';
            numberEl.style.borderColor = '';
            numberEl.textContent = stepId;

            // Apply state
            if (stepId <= this.fallbackState.highestCompleted) {
                indicator.classList.add('is-complete');
                numberEl.style.backgroundColor = 'var(--success, #22c55e)';
                numberEl.style.color = 'white';
                numberEl.style.borderColor = 'var(--success, #22c55e)';
                numberEl.textContent = '✓';
            } else if (stepId === this.fallbackState.currentVisible) {
                indicator.classList.add('is-current');
                numberEl.style.backgroundColor = 'var(--black, #000)';
                numberEl.style.color = 'white';
                numberEl.style.borderColor = 'var(--black, #000)';
            } else if (this.isStepAccessible(stepId)) {
                indicator.classList.add('is-active');
                numberEl.style.borderColor = 'var(--black, #000)';
            } else {
                numberEl.style.color = 'var(--gray-400, #9ca3af)';
                numberEl.style.borderColor = 'var(--gray-400, #9ca3af)';
            }
        });
    }

    // PUBLIC API - Enhanced with ultra-reliable error handling

    markStepCompleted(stepId) {
        if (!this._isValidStep(stepId)) return false;

        try {
            if (this.ultraTracker && !this.fallbackMode) {
                return this.ultraTracker.completeStep(stepId);
            } else {
                // Fallback implementation
                this.fallbackState.highestCompleted = Math.max(this.fallbackState.highestCompleted, stepId);
                
                // Dispatch compatibility event
                document.dispatchEvent(new CustomEvent('qr-scanner-step-completed', {
                    detail: { stepId }
                }));
                
                // Update UI
                this._updateStepIndicatorFallback();
                
                return true;
            }
        } catch (error) {
            console.error('❌ Error marking step completed:', error);
            return false;
        }
    }

    activateStep(stepId) {
        if (!this._isValidStep(stepId)) return false;

        try {
            if (this.ultraTracker && !this.fallbackMode) {
                return this.ultraTracker.activateStep(stepId);
            } else {
                // Fallback implementation
                const element = this._getStepElement(stepId);
                if (element) {
                    element.classList.remove('hidden');
                    
                    // Dispatch compatibility event
                    document.dispatchEvent(new CustomEvent('qr-scanner-step-activated', {
                        detail: { stepId }
                    }));
                    
                    return true;
                }
            }
        } catch (error) {
            console.error('❌ Error activating step:', error);
            return false;
        }
        
        return false;
    }

    navigateToStep(stepId) {
        if (!this._isValidStep(stepId)) return false;

        try {
            if (this.ultraTracker && !this.fallbackMode) {
                return this.ultraTracker.navigateToStep(stepId);
            } else {
                // Fallback navigation
                const element = this._getStepElement(stepId);
                if (element && !element.classList.contains('hidden')) {
                    const rect = element.getBoundingClientRect();
                    const absoluteTop = rect.top + window.pageYOffset;
                    const offset = window.innerHeight * 0.1;

                    window.scrollTo({
                        top: Math.max(0, absoluteTop - offset),
                        behavior: 'smooth'
                    });

                    return true;
                }
            }
        } catch (error) {
            console.error('❌ Error navigating to step:', error);
            return false;
        }

        return false;
    }

    getCurrentStep() {
        try {
            if (this.ultraTracker && !this.fallbackMode) {
                return this.ultraTracker.getCurrentStep();
            } else {
                return this.fallbackState.currentVisible;
            }
        } catch (error) {
            console.error('❌ Error getting current step:', error);
            return 1;
        }
    }

    getHighestCompletedStep() {
        try {
            if (this.ultraTracker && !this.fallbackMode) {
                const completedSteps = this.ultraTracker.getCompletedSteps();
                return completedSteps.length > 0 ? Math.max(...completedSteps) : 0;
            } else {
                return this.fallbackState.highestCompleted;
            }
        } catch (error) {
            console.error('❌ Error getting highest completed step:', error);
            return 0;
        }
    }

    getAvailableSteps() {
        try {
            if (this.ultraTracker && !this.fallbackMode) {
                return this.ultraTracker.getAvailableSteps();
            } else {
                // Fallback - check which steps are visible
                const available = [];
                for (let stepId = 1; stepId <= 5; stepId++) {
                    const element = this._getStepElement(stepId);
                    if (element && !element.classList.contains('hidden')) {
                        available.push(stepId);
                    }
                }
                return available;
            }
        } catch (error) {
            console.error('❌ Error getting available steps:', error);
            return [1];
        }
    }

    isStepAccessible(stepId) {
        if (!this._isValidStep(stepId)) return false;

        try {
            if (this.ultraTracker && !this.fallbackMode) {
                return this.ultraTracker.getAvailableSteps().includes(stepId);
            } else {
                const element = this._getStepElement(stepId);
                return element && !element.classList.contains('hidden');
            }
        } catch (error) {
            console.error('❌ Error checking step accessibility:', error);
            return false;
        }
    }

    setAutoScroll(enabled) {
        this.fallbackState.autoScrollEnabled = enabled;
        console.log(`🔄 Auto-scroll ${enabled ? 'enabled' : 'disabled'}`);
    }

    getNavigationState() {
        try {
            if (this.ultraTracker && !this.fallbackMode) {
                const state = this.ultraTracker.getState();
                return {
                    currentStep: state.currentVisible,
                    highestCompleted: state.highestCompleted,
                    availableSteps: state.availableSteps,
                    autoScrollEnabled: this.fallbackState.autoScrollEnabled,
                    transitionInProgress: state.transitionInProgress,
                    initialized: this.initialized,
                    ultraMode: true
                };
            } else {
                return {
                    currentStep: this.fallbackState.currentVisible,
                    highestCompleted: this.fallbackState.highestCompleted,
                    availableSteps: this.getAvailableSteps(),
                    autoScrollEnabled: this.fallbackState.autoScrollEnabled,
                    transitionInProgress: this.fallbackState.transitionInProgress,
                    initialized: this.initialized,
                    ultraMode: false
                };
            }
        } catch (error) {
            console.error('❌ Error getting navigation state:', error);
            return {
                currentStep: 1,
                highestCompleted: 0,
                availableSteps: [1],
                autoScrollEnabled: true,
                transitionInProgress: false,
                initialized: false,
                ultraMode: false
            };
        }
    }

    getStepInfo(stepId) {
        const element = this._getStepElement(stepId);
        
        const titles = {
            1: 'Import File',
            2: 'Select Sheet',
            3: 'Data Range',
            4: 'Map Columns',
            5: 'Scanner'
        };

        const completedSteps = this.getCompletedSteps ? this.getCompletedSteps() : [];

        return {
            id: stepId,
            title: titles[stepId] || `Step ${stepId}`,
            element: element,
            isVisible: element && !element.classList.contains('hidden'),
            isCompleted: completedSteps.includes(stepId),
            isInViewport: false,
            wasProcessed: true
        };
    }

    refreshStepIndicator() {
        try {
            if (this.ultraTracker && !this.fallbackMode) {
                this.ultraTracker.forceRefresh();
            } else {
                this._updateStepIndicatorFallback();
            }
            console.log('✅ Step indicator refreshed');
        } catch (error) {
            console.error('❌ Error refreshing step indicator:', error);
        }
    }

    addObserver(callback) {
        if (typeof callback === 'function') {
            document.addEventListener('step:state-changed', (event) => {
                callback(event.detail.currentVisible, 'visible');
            });
            return true;
        }
        return false;
    }

    removeObserver(callback) {
        // Note: Would need to track listeners to remove them properly
        return false;
    }

    getDebugInfo() {
        try {
            const baseInfo = {
                initialized: this.initialized,
                fallbackMode: this.fallbackMode,
                retryCount: this.retryCount,
                autoScrollEnabled: this.fallbackState.autoScrollEnabled
            };

            if (this.ultraTracker && !this.fallbackMode) {
                const state = this.ultraTracker.getState();
                return {
                    ...baseInfo,
                    currentStep: state.currentVisible,
                    highestCompleted: state.highestCompleted,
                    availableSteps: state.availableSteps,
                    completedSteps: state.completedSteps,
                    transitionInProgress: state.transitionInProgress,
                    ultraTracker: true
                };
            } else {
                return {
                    ...baseInfo,
                    currentStep: this.fallbackState.currentVisible,
                    highestCompleted: this.fallbackState.highestCompleted,
                    availableSteps: this.getAvailableSteps(),
                    transitionInProgress: this.fallbackState.transitionInProgress,
                    ultraTracker: false
                };
            }
        } catch (error) {
            console.error('❌ Error getting debug info:', error);
            return { error: error.message };
        }
    }

    reset() {
        try {
            if (this.ultraTracker && !this.fallbackMode) {
                this.ultraTracker.reset();
            } else {
                // Fallback reset
                this.fallbackState.currentVisible = 1;
                this.fallbackState.highestCompleted = 0;
                this.fallbackState.transitionInProgress = false;

                // Hide all steps except first
                for (let stepId = 2; stepId <= 5; stepId++) {
                    const element = this._getStepElement(stepId);
                    if (element) {
                        element.classList.add('hidden');
                    }
                }

                this._updateStepIndicatorFallback();
            }

            console.log('✅ Enhanced Step Manager reset');
        } catch (error) {
            console.error('❌ Error resetting step manager:', error);
        }
    }

    destroy() {
        try {
            if (this.ultraTracker && !this.fallbackMode) {
                // Don't destroy UltraStepTracker as other code might be using it
                console.log('🔗 Unlinking from UltraStepTracker');
            }

            this.initialized = false;
            this.ultraTracker = null;

            console.log('✅ Enhanced Step Manager destroyed');
        } catch (error) {
            console.error('❌ Error destroying step manager:', error);
        }
    }

    // Helper methods

    _getStepElement(stepId) {
        const selectors = {
            1: 'section.mb-48:first-of-type',
            2: '#step2',
            3: '#step3',
            4: '#step4',
            5: '#step5'
        };

        const selector = selectors[stepId];
        if (!selector) return null;

        return document.querySelector(selector) ||
               (stepId === 1 ? document.querySelector('section.mb-48') : document.getElementById(`step${stepId}`));
    }

    _isValidStep(stepId) {
        return Number.isInteger(stepId) && stepId >= 1 && stepId <= 5;
    }

    // Enhanced compatibility methods
    
    getCompletedSteps() {
        try {
            if (this.ultraTracker && !this.fallbackMode) {
                return this.ultraTracker.getCompletedSteps();
            } else {
                const completed = [];
                for (let i = 1; i <= this.fallbackState.highestCompleted; i++) {
                    completed.push(i);
                }
                return completed;
            }
        } catch (error) {
            console.error('❌ Error getting completed steps:', error);
            return [];
        }
    }

    forceRefresh() {
        this.refreshStepIndicator();
    }

    // Async initialization helper
    static async create() {
        const manager = new EnhancedStepManager();
        await manager.init();
        return manager;
    }
}

// Create global instance
window.QRScannerStepManager = new EnhancedStepManager();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.QRScannerStepManager.init().catch(console.error);
    });
} else {
    window.QRScannerStepManager.init().catch(console.error);
}

// Enhanced development helpers
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.debugStepManager = () => {
        console.log('🐛 Enhanced Step Manager Debug Info:');
        console.log(window.QRScannerStepManager.getDebugInfo());
    };
    
    window.testStepManager = () => {
        console.log('🧪 Testing Step Manager functionality...');
        
        const tests = [
            () => window.QRScannerStepManager.getCurrentStep(),
            () => window.QRScannerStepManager.getAvailableSteps(),
            () => window.QRScannerStepManager.getNavigationState(),
            () => window.QRScannerStepManager.isStepAccessible(1),
            () => window.QRScannerStepManager.getStepInfo(1)
        ];
        
        tests.forEach((test, i) => {
            try {
                const result = test();
                console.log(`✅ Test ${i + 1} passed:`, result);
            } catch (error) {
                console.error(`❌ Test ${i + 1} failed:`, error);
            }
        });
    };
}
/**
 * Step Manager - Revamped with Smart Tracking
 * QR Code Component Scanner
 * 
 * REVAMPED: October 8, 2025
 * - Maintains original API for compatibility
 * - Uses new SmartStepTracker internally
 * - Clean, reliable implementation
 * - Natural human behavior consideration for navigation
 */

// Compatibility layer - expose SmartStepTracker as QRScannerStepManager
window.QRScannerStepManager = {
    // Internal reference to the smart tracker
    _smartTracker: null,
    
    // State variables for compatibility
    _currentVisibleStep: 1,
    _highestCompletedStep: 0,
    _autoScrollEnabled: true,
    _initialized: false,
    
    // Initialize the step manager
    init() {
        if (this._initialized) {
            console.log('Step manager already initialized');
            return;
        }
        
        try {
            console.log('Initializing Step Manager with Smart Tracker...');
            
            // Initialize the smart tracker
            if (window.SmartStepTracker) {
                this._smartTracker = window.SmartStepTracker;
                
                // Listen to smart tracker events
                this._bindSmartTrackerEvents();
                
                // Ensure smart tracker is initialized
                if (!this._smartTracker.initialized) {
                    this._smartTracker.init();
                }
                
                this._initialized = true;
                console.log('✓ Step Manager initialized with Smart Tracker');
            } else {
                throw new Error('SmartStepTracker not found');
            }
            
        } catch (error) {
            console.error('Failed to initialize step manager:', error);
            // Fallback initialization without smart tracker
            this._initialized = true;
        }
    },
    
    // Bind to smart tracker events
    _bindSmartTrackerEvents() {
        // Listen for state changes from smart tracker
        document.addEventListener('step:state-changed', (event) => {
            const { currentVisible, highestCompleted } = event.detail;
            this._currentVisibleStep = currentVisible;
            this._highestCompletedStep = Math.max(this._highestCompletedStep, highestCompleted);
        });
        
        // Listen for viewing changes
        document.addEventListener('step:viewing-changed', (event) => {
            const { stepId } = event.detail;
            this._currentVisibleStep = stepId;
        });
        
        console.log('✓ Smart tracker events bound');
    },
    
    // PUBLIC API - Maintains compatibility with existing code
    
    /**
     * Mark step as completed
     */
    markStepCompleted(stepId) {
        if (this._smartTracker) {
            return this._smartTracker.completeStep(stepId);
        }
        
        // Fallback implementation
        if (stepId >= 1 && stepId <= 5) {
            this._highestCompletedStep = Math.max(this._highestCompletedStep, stepId);
            
            // Dispatch old-style event for backward compatibility
            document.dispatchEvent(new CustomEvent('qr-scanner-step-completed', {
                detail: { stepId }
            }));
            
            return true;
        }
        return false;
    },
    
    /**
     * Activate step
     */
    activateStep(stepId) {
        if (this._smartTracker) {
            return this._smartTracker.activateStep(stepId);
        }
        
        // Fallback implementation
        if (stepId >= 1 && stepId <= 5) {
            const element = document.querySelector(`#step${stepId}`) || 
                          (stepId === 1 ? document.querySelector('section.mb-48:first-of-type') : null);
            
            if (element) {
                element.classList.remove('hidden');
                
                // Dispatch old-style event
                document.dispatchEvent(new CustomEvent('qr-scanner-step-activated', {
                    detail: { stepId }
                }));
                
                return true;
            }
        }
        return false;
    },
    
    /**
     * Navigate to step
     */
    navigateToStep(stepId) {
        if (this._smartTracker) {
            return this._smartTracker.navigateToStep(stepId);
        }
        
        // Fallback implementation
        const element = document.querySelector(`#step${stepId}`) || 
                       (stepId === 1 ? document.querySelector('section.mb-48:first-of-type') : null);
        
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
        
        return false;
    },
    
    /**
     * Get current visible step
     */
    getCurrentStep() {
        if (this._smartTracker) {
            return this._smartTracker.getCurrentStep();
        }
        return this._currentVisibleStep;
    },
    
    /**
     * Get highest completed step
     */
    getHighestCompletedStep() {
        if (this._smartTracker) {
            const completedSteps = this._smartTracker.getCompletedSteps();
            return completedSteps.length > 0 ? Math.max(...completedSteps) : 0;
        }
        return this._highestCompletedStep;
    },
    
    /**
     * Get available steps
     */
    getAvailableSteps() {
        if (this._smartTracker) {
            return this._smartTracker.getAvailableSteps();
        }
        
        // Fallback - check which steps are visible
        const available = [];
        for (let stepId = 1; stepId <= 5; stepId++) {
            const element = document.querySelector(`#step${stepId}`) || 
                           (stepId === 1 ? document.querySelector('section.mb-48:first-of-type') : null);
            
            if (element && !element.classList.contains('hidden')) {
                available.push(stepId);
            }
        }
        
        return available;
    },
    
    /**
     * Check if step is accessible
     */
    isStepAccessible(stepId) {
        if (this._smartTracker) {
            return this._smartTracker.getAvailableSteps().includes(stepId);
        }
        
        const element = document.querySelector(`#step${stepId}`) || 
                       (stepId === 1 ? document.querySelector('section.mb-48:first-of-type') : null);
        
        return element && !element.classList.contains('hidden');
    },
    
    /**
     * Set auto-scroll behavior
     */
    setAutoScroll(enabled) {
        this._autoScrollEnabled = enabled;
        console.log(`Auto-scroll ${enabled ? 'enabled' : 'disabled'}`);
    },
    
    /**
     * Get navigation state
     */
    getNavigationState() {
        if (this._smartTracker) {
            const state = this._smartTracker.getState();
            return {
                currentStep: state.currentVisible,
                highestCompleted: state.highestCompleted,
                availableSteps: state.availableSteps,
                autoScrollEnabled: this._autoScrollEnabled,
                transitionInProgress: state.transitionInProgress,
                initialized: this._initialized
            };
        }
        
        return {
            currentStep: this._currentVisibleStep,
            highestCompleted: this._highestCompletedStep,
            availableSteps: this.getAvailableSteps(),
            autoScrollEnabled: this._autoScrollEnabled,
            transitionInProgress: false,
            initialized: this._initialized
        };
    },
    
    /**
     * Get step information
     */
    getStepInfo(stepId) {
        const element = document.querySelector(`#step${stepId}`) || 
                       (stepId === 1 ? document.querySelector('section.mb-48:first-of-type') : null);
        
        const titles = {
            1: 'Import File',
            2: 'Select Sheet', 
            3: 'Data Range',
            4: 'Map Columns',
            5: 'Scanner'
        };
        
        return {
            id: stepId,
            title: titles[stepId] || `Step ${stepId}`,
            element: element,
            isVisible: element && !element.classList.contains('hidden'),
            isCompleted: this._smartTracker ? 
                        this._smartTracker.getCompletedSteps().includes(stepId) : 
                        stepId <= this._highestCompletedStep,
            isInViewport: false, // This would require viewport detection
            wasProcessed: true
        };
    },
    
    /**
     * Force refresh step indicator
     */
    refreshStepIndicator() {
        if (this._smartTracker) {
            // Smart tracker handles this automatically
            this._smartTracker._updateUI();
        } else {
            // Fallback manual update
            this._updateStepIndicatorFallback();
        }
        
        console.log('✓ Step indicator refreshed');
    },
    
    /**
     * Fallback step indicator update
     */
    _updateStepIndicatorFallback() {
        const indicators = document.querySelectorAll('.step-indicator__item');
        
        indicators.forEach((indicator, index) => {
            const stepId = index + 1;
            const numberEl = indicator.querySelector('.step-indicator__number');
            if (!numberEl) return;
            
            // Clear all state classes
            indicator.classList.remove('is-current', 'is-complete', 'is-active');
            
            // Reset styles
            numberEl.style.backgroundColor = '';
            numberEl.style.color = '';
            numberEl.textContent = stepId;
            
            // Apply state
            if (stepId <= this._highestCompletedStep) {
                indicator.classList.add('is-complete');
                numberEl.style.backgroundColor = 'var(--color-success, #22c55e)';
                numberEl.style.color = 'white';
                numberEl.textContent = '✓';
            } else if (stepId === this._currentVisibleStep) {
                indicator.classList.add('is-current');
                numberEl.style.backgroundColor = 'var(--color-black, #000)';
                numberEl.style.color = 'white';
            } else if (this.isStepAccessible(stepId)) {
                indicator.classList.add('is-active');
            } else {
                numberEl.style.color = 'var(--color-gray-400, #9ca3af)';
            }
        });
    },
    
    /**
     * Add observer for step changes
     */
    addObserver(callback) {
        if (typeof callback === 'function') {
            // Add as event listener since we don't maintain our own observer set
            document.addEventListener('step:state-changed', (event) => {
                callback(event.detail.currentVisible, 'visible');
            });
            return true;
        }
        return false;
    },
    
    /**
     * Remove observer (no-op in this implementation)
     */
    removeObserver(callback) {
        // Would need to track listeners to remove them
        return false;
    },
    
    /**
     * Get debug information
     */
    getDebugInfo() {
        if (this._smartTracker) {
            const state = this._smartTracker.getState();
            return {
                initialized: this._initialized,
                currentStep: state.currentVisible,
                highestCompleted: state.highestCompleted,
                autoScrollEnabled: this._autoScrollEnabled,
                transitionInProgress: state.transitionInProgress,
                availableSteps: state.availableSteps,
                completedSteps: state.completedSteps,
                smartTracker: true
            };
        }
        
        return {
            initialized: this._initialized,
            currentStep: this._currentVisibleStep,
            highestCompleted: this._highestCompletedStep,
            autoScrollEnabled: this._autoScrollEnabled,
            transitionInProgress: false,
            availableSteps: this.getAvailableSteps(),
            smartTracker: false
        };
    },
    
    /**
     * Reset step manager
     */
    reset() {
        if (this._smartTracker) {
            this._smartTracker.reset();
        } else {
            // Fallback reset
            this._currentVisibleStep = 1;
            this._highestCompletedStep = 0;
            
            // Hide all steps except first
            for (let stepId = 2; stepId <= 5; stepId++) {
                const element = document.querySelector(`#step${stepId}`);
                if (element) {
                    element.classList.add('hidden');
                }
            }
            
            this._updateStepIndicatorFallback();
        }
        
        console.log('✓ Step manager reset');
    },
    
    /**
     * Destroy step manager
     */
    destroy() {
        if (this._smartTracker) {
            this._smartTracker.destroy();
        }
        
        this._initialized = false;
        this._smartTracker = null;
        
        console.log('✓ Step manager destroyed');
    }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        try {
            window.QRScannerStepManager.init();
        } catch (error) {
            console.error('Failed to initialize step manager on DOMContentLoaded:', error);
        }
    });
} else {
    try {
        window.QRScannerStepManager.init();
    } catch (error) {
        console.error('Failed to initialize step manager immediately:', error);
    }
}
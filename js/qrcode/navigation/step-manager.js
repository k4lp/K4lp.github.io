/**
 * QR Code Component Scanner - Enhanced Step Management System
 * Alica Technologies - Version 3.1 FIXED
 * 
 * CRITICAL FIXES:
 * - Fixed step indicator visual updates
 * - Enhanced step navigation controls
 * - Improved auto-progression detection
 * - Better step visibility tracking
 * - Root cause fix for step transitions
 */

window.QRScannerStepManager = {
    // Internal state
    _currentVisibleStep: 1,
    _highestCompletedStep: 0,
    _autoScrollEnabled: true,
    _stepElements: new Map(),
    _observers: new Set(),
    _navigationContainer: null,
    _initialized: false,
    
    // Step configuration
    STEPS: {
        FILE_IMPORT: { id: 1, element: 'step1', title: 'Import File' },
        SHEET_SELECT: { id: 2, element: 'step2', title: 'Select Sheet' },
        DATA_RANGE: { id: 3, element: 'step3', title: 'Data Range' },
        COLUMN_MAPPING: { id: 4, element: 'step4', title: 'Map Columns' },
        SCANNER: { id: 5, element: 'step5', title: 'Scanner' }
    },

    /**
     * Initialize step manager
     */
    init() {
        if (this._initialized) return;
        
        this._initializeStepElements();
        this._createNavigationControls();
        this._setupIntersectionObserver();
        this._bindEvents();
        this._updateStepIndicator();
        
        this._initialized = true;
        console.log('Enhanced step manager initialized');
    },

    /**
     * Initialize step element mapping
     */
    _initializeStepElements() {
        Object.values(this.STEPS).forEach(step => {
            const element = document.getElementById(step.element);
            
            if (element) {
                this._stepElements.set(step.id, {
                    ...step,
                    element: element,
                    isVisible: !element.classList.contains('hidden'),
                    isCompleted: false,
                    isInViewport: false
                });
            }
        });

        console.log('Step elements initialized:', this._stepElements.size);
    },

    /**
     * CRITICAL FIX: Enhanced navigation controls
     */
    _createNavigationControls() {
        const container = this._getOrCreateNavigationContainer();
        
        // Previous step button
        const prevButton = document.createElement('button');
        prevButton.id = 'step-nav-prev';
        prevButton.className = 'button button--ghost button--sm';
        prevButton.innerHTML = '←  PREV';
        prevButton.title = 'Go to previous step';
        prevButton.style.cssText = 'margin-right: 12px;';
        
        // Next step button
        const nextButton = document.createElement('button');
        nextButton.id = 'step-nav-next';
        nextButton.className = 'button button--ghost button--sm';
        nextButton.innerHTML = 'NEXT  →';
        nextButton.title = 'Go to next step';
        nextButton.style.cssText = 'margin-left: 12px;';
        
        // Current step indicator
        const indicator = document.createElement('div');
        indicator.id = 'step-nav-indicator';
        indicator.className = 'meta';
        indicator.style.cssText = `
            margin: 0 12px;
            display: flex;
            align-items: center;
            text-align: center;
            min-width: 120px;
            font-size: 10px;
        `;
        
        // Add to container
        container.appendChild(prevButton);
        container.appendChild(indicator);
        container.appendChild(nextButton);
        
        // Add event listeners
        prevButton.addEventListener('click', this._handlePreviousStep.bind(this));
        nextButton.addEventListener('click', this._handleNextStep.bind(this));
        
        this._updateNavigationButtons();
    },

    /**
     * Get or create navigation container
     */
    _getOrCreateNavigationContainer() {
        if (this._navigationContainer) {
            return this._navigationContainer;
        }
        
        let container = document.getElementById('step-navigation-controls');
        
        if (!container) {
            container = document.createElement('div');
            container.id = 'step-navigation-controls';
            container.className = 'card';
            container.style.cssText = `
                position: fixed;
                bottom: 24px;
                right: 24px;
                z-index: 100;
                display: flex;
                align-items: center;
                padding: 12px 16px;
                background: var(--white, #fff);
                border: 1px solid var(--black, #000);
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                min-width: 280px;
                max-width: 90vw;
            `;
            
            document.body.appendChild(container);
        }
        
        this._navigationContainer = container;
        return container;
    },

    /**
     * CRITICAL FIX: Enhanced intersection observer for accurate step tracking
     */
    _setupIntersectionObserver() {
        if (!('IntersectionObserver' in window)) {
            console.warn('IntersectionObserver not supported');
            return;
        }
        
        const options = {
            root: null,
            rootMargin: '-20% 0px -40% 0px',
            threshold: [0.1, 0.3, 0.5, 0.7]
        };
        
        this._intersectionObserver = new IntersectionObserver(
            this._handleIntersection.bind(this),
            options
        );
        
        // Observe all step elements
        this._stepElements.forEach(step => {
            if (step.element) {
                this._intersectionObserver.observe(step.element);
            }
        });

        console.log('Intersection observer setup with enhanced detection');
    },

    /**
     * CRITICAL FIX: Enhanced intersection handling
     */
    _handleIntersection(entries) {
        let mostVisibleStep = null;
        let maxVisibility = 0;
        
        entries.forEach(entry => {
            const stepId = this._findStepIdByElement(entry.target);
            if (!stepId) return;
            
            const step = this._stepElements.get(stepId);
            if (!step) return;
            
            step.isInViewport = entry.isIntersecting;
            
            if (entry.isIntersecting && entry.intersectionRatio > maxVisibility) {
                maxVisibility = entry.intersectionRatio;
                mostVisibleStep = stepId;
            }
        });
        
        if (mostVisibleStep && mostVisibleStep !== this._currentVisibleStep) {
            this._currentVisibleStep = mostVisibleStep;
            this._updateNavigationIndicator();
            this._updateStepIndicator();
            
            this._notifyObservers(mostVisibleStep, 'visible');
            
            console.log(`Current visible step: ${mostVisibleStep}`);
        }
        
        this._updateNavigationButtons();
    },

    /**
     * Find step ID by element
     */
    _findStepIdByElement(element) {
        for (const [stepId, step] of this._stepElements) {
            if (step.element === element) {
                return stepId;
            }
        }
        return null;
    },

    /**
     * Bind additional events
     */
    _bindEvents() {
        // Listen for custom step events
        document.addEventListener('qr-scanner-step-completed', this._handleStepCompleted.bind(this));
        document.addEventListener('qr-scanner-step-activated', this._handleStepActivated.bind(this));
    },

    /**
     * CRITICAL FIX: Enhanced step completion handling
     */
    _handleStepCompleted(event) {
        const stepId = event.detail?.stepId;
        if (!stepId) return;
        
        const step = this._stepElements.get(stepId);
        if (step) {
            step.isCompleted = true;
            this._highestCompletedStep = Math.max(this._highestCompletedStep, stepId);
        }
        
        // CRITICAL FIX: Auto-progress logic
        if (this._autoScrollEnabled) {
            const nextStepId = stepId + 1;
            if (nextStepId <= 5) {
                setTimeout(() => {
                    this._scrollToNextStep(stepId);
                }, 800);
            }
        }
        
        this._updateStepIndicator();
        this._updateNavigationButtons();
        
        console.log(`Step ${stepId} completed, highest: ${this._highestCompletedStep}`);
    },

    /**
     * Handle step activation
     */
    _handleStepActivated(event) {
        const stepId = event.detail?.stepId;
        if (!stepId) return;
        
        this._updateStepIndicator();
        this._updateNavigationButtons();
        
        console.log(`Step ${stepId} activated`);
    },

    /**
     * CRITICAL FIX: Enhanced scroll to next step
     */
    _scrollToNextStep(currentStepId) {
        const nextStepId = currentStepId + 1;
        const nextStep = this._stepElements.get(nextStepId);
        
        if (nextStep && nextStep.element && !nextStep.element.classList.contains('hidden')) {
            this.navigateToStep(nextStepId);
        } else {
            for (let stepId = nextStepId + 1; stepId <= 5; stepId++) {
                const step = this._stepElements.get(stepId);
                if (step && step.element && !step.element.classList.contains('hidden')) {
                    this.navigateToStep(stepId);
                    break;
                }
            }
        }
    },

    /**
     * CRITICAL FIX: Enhanced previous step navigation
     */
    _handlePreviousStep() {
        const currentStep = this._currentVisibleStep;
        let targetStep = null;
        
        for (let stepId = currentStep - 1; stepId >= 1; stepId--) {
            const step = this._stepElements.get(stepId);
            if (step && step.element && !step.element.classList.contains('hidden')) {
                targetStep = stepId;
                break;
            }
        }
        
        if (targetStep) {
            this.navigateToStep(targetStep);
        }
    },

    /**
     * CRITICAL FIX: Enhanced next step navigation
     */
    _handleNextStep() {
        const currentStep = this._currentVisibleStep;
        let targetStep = null;
        
        for (let stepId = currentStep + 1; stepId <= 5; stepId++) {
            const step = this._stepElements.get(stepId);
            if (step && step.element && !step.element.classList.contains('hidden')) {
                targetStep = stepId;
                break;
            }
        }
        
        if (targetStep) {
            this.navigateToStep(targetStep);
        }
    },

    /**
     * Navigate to specific step
     */
    navigateToStep(stepId) {
        const step = this._stepElements.get(stepId);
        if (!step || !step.element) return;
        
        step.element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start',
            inline: 'nearest'
        });
        
        this._currentVisibleStep = stepId;
        this._updateNavigationIndicator();
        this._updateNavigationButtons();
        
        document.dispatchEvent(new CustomEvent('qr-scanner-step-navigated', {
            detail: { stepId, stepName: step.title }
        }));
        
        console.log(`Navigated to step ${stepId}: ${step.title}`);
    },

    /**
     * CRITICAL FIX: Enhanced navigation buttons state
     */
    _updateNavigationButtons() {
        const prevBtn = document.getElementById('step-nav-prev');
        const nextBtn = document.getElementById('step-nav-next');
        
        if (!prevBtn || !nextBtn) return;
        
        const currentStep = this._currentVisibleStep;
        
        // Check for previous step availability
        let hasPrevious = false;
        let previousStepTitle = '';
        for (let stepId = currentStep - 1; stepId >= 1; stepId--) {
            const step = this._stepElements.get(stepId);
            if (step && step.element && !step.element.classList.contains('hidden')) {
                hasPrevious = true;
                previousStepTitle = step.title;
                break;
            }
        }
        
        // Check for next step availability
        let hasNext = false;
        let nextStepTitle = '';
        for (let stepId = currentStep + 1; stepId <= 5; stepId++) {
            const step = this._stepElements.get(stepId);
            if (step && step.element && !step.element.classList.contains('hidden')) {
                hasNext = true;
                nextStepTitle = step.title;
                break;
            }
        }
        
        // Update button states
        prevBtn.disabled = !hasPrevious;
        nextBtn.disabled = !hasNext;
        
        if (hasPrevious) {
            prevBtn.classList.remove('disabled');
            prevBtn.title = `Go to previous step: ${previousStepTitle}`;
        } else {
            prevBtn.classList.add('disabled');
            prevBtn.title = 'No previous step available';
        }
        
        if (hasNext) {
            nextBtn.classList.remove('disabled');
            nextBtn.title = `Go to next step: ${nextStepTitle}`;
        } else {
            nextBtn.classList.add('disabled');
            nextBtn.title = 'No next step available';
        }
    },

    /**
     * Update navigation indicator
     */
    _updateNavigationIndicator() {
        const indicator = document.getElementById('step-nav-indicator');
        if (!indicator) return;
        
        const step = this._stepElements.get(this._currentVisibleStep);
        if (step) {
            indicator.innerHTML = `
                <div style="text-align: center; line-height: 1.2;">
                    <div>STEP ${this._currentVisibleStep}/5</div>
                    <div style="font-size: 9px; margin-top: 2px;">${step.title.toUpperCase()}</div>
                </div>
            `;
        }
    },

    /**
     * CRITICAL FIX: Root cause fix for step indicator visual updates
     */
    _updateStepIndicator() {
        const indicators = document.querySelectorAll('.step-indicator__item');
        
        if (indicators.length === 0) {
            console.warn('Step indicators not found in DOM');
            return;
        }
        
        indicators.forEach((indicator, index) => {
            const stepId = index + 1;
            const step = this._stepElements.get(stepId);
            
            // Clear ALL existing state classes first
            indicator.classList.remove('is-current', 'is-complete', 'is-active', 'completed');
            
            // Apply new state classes based on step status
            if (step && step.isCompleted) {
                indicator.classList.add('is-complete', 'completed');
                
                // Also update the step number element
                const numberEl = indicator.querySelector('.step-indicator__number');
                if (numberEl) {
                    numberEl.style.backgroundColor = 'var(--color-success, #22c55e)';
                    numberEl.style.color = 'white';
                    numberEl.innerHTML = '✓'; // Check mark
                }
                
            } else if (stepId === this._currentVisibleStep) {
                indicator.classList.add('is-current');
                
                // Highlight current step
                const numberEl = indicator.querySelector('.step-indicator__number');
                if (numberEl) {
                    numberEl.style.backgroundColor = 'var(--color-primary, #000)';
                    numberEl.style.color = 'white';
                    numberEl.innerHTML = stepId;
                }
                
            } else if (step && step.element && !step.element.classList.contains('hidden')) {
                indicator.classList.add('is-active');
                
                // Reset number element for inactive but available steps
                const numberEl = indicator.querySelector('.step-indicator__number');
                if (numberEl) {
                    numberEl.style.backgroundColor = '';
                    numberEl.style.color = '';
                    numberEl.innerHTML = stepId;
                }
            } else {
                // Reset number element for unavailable steps
                const numberEl = indicator.querySelector('.step-indicator__number');
                if (numberEl) {
                    numberEl.style.backgroundColor = '';
                    numberEl.style.color = '';
                    numberEl.innerHTML = stepId;
                }
            }
        });
        
        console.log(`Step indicator updated - Current: ${this._currentVisibleStep}, Completed: ${this._highestCompletedStep}`);
    },

    /**
     * Notify observers
     */
    _notifyObservers(stepId, action) {
        this._observers.forEach(callback => {
            try {
                callback(stepId, action);
            } catch (error) {
                console.error('Observer callback error:', error);
            }
        });
    },

    /**
     * Mark step as completed - PUBLIC API
     */
    markStepCompleted(stepId) {
        document.dispatchEvent(new CustomEvent('qr-scanner-step-completed', {
            detail: { stepId }
        }));
    },

    /**
     * Activate step - PUBLIC API
     */
    activateStep(stepId) {
        const step = this._stepElements.get(stepId);
        if (!step) return;
        
        // Show the step
        if (step.element) {
            step.element.classList.remove('hidden');
            step.isVisible = true;
        }
        
        // Dispatch activation event
        document.dispatchEvent(new CustomEvent('qr-scanner-step-activated', {
            detail: { stepId }
        }));
        
        // Auto-scroll to step if it's beyond current position
        if (this._autoScrollEnabled && stepId > this._currentVisibleStep) {
            setTimeout(() => {
                this.navigateToStep(stepId);
            }, 200);
        }
    },

    /**
     * Get current visible step - PUBLIC API
     */
    getCurrentStep() {
        return this._currentVisibleStep;
    },

    /**
     * Get highest completed step - PUBLIC API
     */
    getHighestCompletedStep() {
        return this._highestCompletedStep;
    },

    /**
     * Toggle auto-scroll behavior - PUBLIC API
     */
    setAutoScroll(enabled) {
        this._autoScrollEnabled = enabled;
        console.log('Auto-scroll', enabled ? 'enabled' : 'disabled');
    },

    /**
     * Add observer for step changes - PUBLIC API
     */
    addObserver(callback) {
        if (typeof callback === 'function') {
            this._observers.add(callback);
        }
    },

    /**
     * Remove observer - PUBLIC API
     */
    removeObserver(callback) {
        this._observers.delete(callback);
    },

    /**
     * Get step information - PUBLIC API
     */
    getStepInfo(stepId) {
        return this._stepElements.get(stepId);
    },

    /**
     * Get available steps - PUBLIC API
     */
    getAvailableSteps() {
        const available = [];
        this._stepElements.forEach((step, stepId) => {
            if (step.element && !step.element.classList.contains('hidden')) {
                available.push(stepId);
            }
        });
        return available;
    },

    /**
     * Check if step is accessible - PUBLIC API
     */
    isStepAccessible(stepId) {
        const step = this._stepElements.get(stepId);
        return step && step.element && !step.element.classList.contains('hidden');
    },

    /**
     * Get navigation state - PUBLIC API
     */
    getNavigationState() {
        return {
            currentStep: this._currentVisibleStep,
            highestCompleted: this._highestCompletedStep,
            availableSteps: this.getAvailableSteps(),
            autoScrollEnabled: this._autoScrollEnabled
        };
    },

    /**
     * Force refresh step indicator - PUBLIC API
     */
    refreshStepIndicator() {
        this._updateStepIndicator();
        this._updateNavigationButtons();
        this._updateNavigationIndicator();
    },

    /**
     * Destroy step manager - PUBLIC API
     */
    destroy() {
        if (this._intersectionObserver) {
            this._intersectionObserver.disconnect();
        }
        
        if (this._navigationContainer && this._navigationContainer.parentNode) {
            this._navigationContainer.parentNode.removeChild(this._navigationContainer);
        }
        
        this._observers.clear();
        this._stepElements.clear();
        this._navigationContainer = null;
        this._initialized = false;
    }
};

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.QRScannerStepManager.init();
    });
} else {
    window.QRScannerStepManager.init();
}
/**
 * QR Code Component Scanner - Step Management System
 * Alica Technologies
 * 
 * Enhanced step management with intelligent navigation and auto-progression
 */

window.QRScannerStepManager = {
    // Internal state
    _currentVisibleStep: 1,
    _highestCompletedStep: 0,
    _autoScrollEnabled: true,
    _stepElements: new Map(),
    _observers: new Set(),
    
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
        this._initializeStepElements();
        this._createNavigationControls();
        this._setupIntersectionObserver();
        this._bindEvents();
        this._updateStepIndicator();
        
        window.QRScannerUtils.log.debug('Step manager initialized');
    },

    /**
     * Initialize step element mapping
     */
    _initializeStepElements() {
        Object.values(this.STEPS).forEach(step => {
            const element = document.getElementById(step.element) || 
                          document.querySelector(`#${step.element}`);
            
            if (element) {
                this._stepElements.set(step.id, {
                    ...step,
                    element: element,
                    isVisible: !element.classList.contains('hidden'),
                    isCompleted: false
                });
            }
        });
    },

    /**
     * Create navigation controls
     */
    _createNavigationControls() {
        const container = this._getOrCreateNavigationContainer();
        
        // Previous step button
        const prevButton = document.createElement('button');
        prevButton.id = 'step-nav-prev';
        prevButton.className = 'button button--ghost button--sm';
        prevButton.innerHTML = '←  PREV STEP';
        prevButton.title = 'Go to previous step';
        prevButton.style.cssText = 'margin-right: 16px;';
        
        // Next step button
        const nextButton = document.createElement('button');
        nextButton.id = 'step-nav-next';
        nextButton.className = 'button button--ghost button--sm';
        nextButton.innerHTML = 'NEXT STEP  →';
        nextButton.title = 'Go to next step';
        
        // Current step indicator
        const indicator = document.createElement('div');
        indicator.id = 'step-nav-indicator';
        indicator.className = 'meta';
        indicator.style.cssText = 'margin: 0 16px; display: flex; align-items: center;';
        
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
                background: var(--white);
                border: 1px solid var(--black);
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                min-width: 280px;
            `;
            
            document.body.appendChild(container);
        }
        
        return container;
    },

    /**
     * Setup intersection observer to track visible steps
     */
    _setupIntersectionObserver() {
        if (!('IntersectionObserver' in window)) {
            window.QRScannerUtils.log.warn('IntersectionObserver not supported');
            return;
        }
        
        const options = {
            root: null,
            rootMargin: '-20% 0px -20% 0px',
            threshold: 0.3
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
    },

    /**
     * Handle intersection changes
     */
    _handleIntersection(entries) {
        entries.forEach(entry => {
            // Find which step this element belongs to
            const stepId = this._findStepIdByElement(entry.target);
            if (!stepId) return;
            
            const step = this._stepElements.get(stepId);
            if (!step) return;
            
            // Update visibility tracking
            const wasVisible = step.isInViewport;
            step.isInViewport = entry.isIntersecting;
            
            // If step became visible and we haven't seen it before
            if (entry.isIntersecting && !wasVisible) {
                this._handleStepBecameVisible(stepId);
            }
        });
        
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
     * Handle step becoming visible
     */
    _handleStepBecameVisible(stepId) {
        this._currentVisibleStep = stepId;
        this._updateNavigationIndicator();
        
        // Notify observers
        this._observers.forEach(callback => {
            try {
                callback(stepId, 'visible');
            } catch (error) {
                window.QRScannerUtils.log.error('Observer callback error:', error);
            }
        });
        
        window.QRScannerUtils.log.debug(`Step ${stepId} became visible`);
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
     * Handle step completion
     */
    _handleStepCompleted(event) {
        const stepId = event.detail?.stepId;
        if (!stepId) return;
        
        const step = this._stepElements.get(stepId);
        if (step) {
            step.isCompleted = true;
            this._highestCompletedStep = Math.max(this._highestCompletedStep, stepId);
        }
        
        // Auto-progress to next step if enabled
        if (this._autoScrollEnabled && stepId <= 3) {
            setTimeout(() => {
                this._scrollToNextStep(stepId);
            }, 500);
        }
        
        this._updateStepIndicator();
        this._updateNavigationButtons();
        
        window.QRScannerUtils.log.debug(`Step ${stepId} completed`);
    },

    /**
     * Handle step activation
     */
    _handleStepActivated(event) {
        const stepId = event.detail?.stepId;
        if (!stepId) return;
        
        this._currentVisibleStep = stepId;
        this._updateStepIndicator();
        this._updateNavigationButtons();
        
        window.QRScannerUtils.log.debug(`Step ${stepId} activated`);
    },

    /**
     * Scroll to next step
     */
    _scrollToNextStep(currentStepId) {
        const nextStepId = currentStepId + 1;
        const nextStep = this._stepElements.get(nextStepId);
        
        if (nextStep && nextStep.element && !nextStep.element.classList.contains('hidden')) {
            this.navigateToStep(nextStepId);
        }
    },

    /**
     * Handle previous step navigation
     */
    _handlePreviousStep() {
        const currentStep = this._currentVisibleStep;
        let targetStep = null;
        
        // Find the previous visible/accessible step
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
     * Handle next step navigation
     */
    _handleNextStep() {
        const currentStep = this._currentVisibleStep;
        let targetStep = null;
        
        // Find the next visible/accessible step
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
        
        // Smooth scroll to step
        step.element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start',
            inline: 'nearest'
        });
        
        this._currentVisibleStep = stepId;
        this._updateNavigationIndicator();
        this._updateNavigationButtons();
        
        // Dispatch event
        document.dispatchEvent(new CustomEvent('qr-scanner-step-navigated', {
            detail: { stepId, stepName: step.title }
        }));
        
        window.QRScannerUtils.log.debug(`Navigated to step ${stepId}`);
    },

    /**
     * Update navigation buttons state
     */
    _updateNavigationButtons() {
        const prevBtn = document.getElementById('step-nav-prev');
        const nextBtn = document.getElementById('step-nav-next');
        
        if (!prevBtn || !nextBtn) return;
        
        const currentStep = this._currentVisibleStep;
        
        // Check for previous step availability
        let hasPrevious = false;
        for (let stepId = currentStep - 1; stepId >= 1; stepId--) {
            const step = this._stepElements.get(stepId);
            if (step && step.element && !step.element.classList.contains('hidden')) {
                hasPrevious = true;
                break;
            }
        }
        
        // Check for next step availability
        let hasNext = false;
        for (let stepId = currentStep + 1; stepId <= 5; stepId++) {
            const step = this._stepElements.get(stepId);
            if (step && step.element && !step.element.classList.contains('hidden')) {
                hasNext = true;
                break;
            }
        }
        
        // Update button states
        prevBtn.disabled = !hasPrevious;
        nextBtn.disabled = !hasNext;
        
        if (hasPrevious) {
            prevBtn.classList.remove('disabled');
        } else {
            prevBtn.classList.add('disabled');
        }
        
        if (hasNext) {
            nextBtn.classList.remove('disabled');
        } else {
            nextBtn.classList.add('disabled');
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
                <span>STEP ${this._currentVisibleStep}/5</span>
                <br>
                <small>${step.title.toUpperCase()}</small>
            `;
        }
    },

    /**
     * Update main step indicator
     */
    _updateStepIndicator() {
        const indicators = document.querySelectorAll('.step-indicator__item');
        
        indicators.forEach((indicator, index) => {
            const stepId = index + 1;
            const step = this._stepElements.get(stepId);
            
            // Clear existing classes
            indicator.classList.remove('is-current', 'is-complete');
            
            if (step && step.isCompleted) {
                indicator.classList.add('is-complete');
            } else if (stepId === this._currentVisibleStep) {
                indicator.classList.add('is-current');
            }
        });
    },

    /**
     * Mark step as completed
     */
    markStepCompleted(stepId) {
        document.dispatchEvent(new CustomEvent('qr-scanner-step-completed', {
            detail: { stepId }
        }));
    },

    /**
     * Activate step (show and make accessible)
     */
    activateStep(stepId) {
        const step = this._stepElements.get(stepId);
        if (!step) return;
        
        // Show the step
        if (step.element) {
            step.element.classList.remove('hidden');
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
     * Get current visible step
     */
    getCurrentStep() {
        return this._currentVisibleStep;
    },

    /**
     * Get highest completed step
     */
    getHighestCompletedStep() {
        return this._highestCompletedStep;
    },

    /**
     * Toggle auto-scroll behavior
     */
    setAutoScroll(enabled) {
        this._autoScrollEnabled = enabled;
        window.QRScannerUtils.log.debug('Auto-scroll', enabled ? 'enabled' : 'disabled');
    },

    /**
     * Add observer for step changes
     */
    addObserver(callback) {
        if (typeof callback === 'function') {
            this._observers.add(callback);
        }
    },

    /**
     * Remove observer
     */
    removeObserver(callback) {
        this._observers.delete(callback);
    },

    /**
     * Get step information
     */
    getStepInfo(stepId) {
        return this._stepElements.get(stepId);
    },

    /**
     * Destroy step manager
     */
    destroy() {
        if (this._intersectionObserver) {
            this._intersectionObserver.disconnect();
        }
        
        const navContainer = document.getElementById('step-navigation-controls');
        if (navContainer && navContainer.parentNode) {
            navContainer.parentNode.removeChild(navContainer);
        }
        
        this._observers.clear();
        this._stepElements.clear();
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
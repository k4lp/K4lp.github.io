/**
 * Smart Step Tracker - Revamped Implementation
 * QR Code Component Scanner
 * 
 * REVAMPED: October 8, 2025
 * - Maintains smart viewport detection (IntersectionObserver)
 * - Cleaned up over-complex logic while preserving intelligent features
 * - Natural human behavior consideration for navigation
 * - Automatic current step detection based on viewport visibility
 * - Smart prev/next navigation based on actual viewing state
 */

window.SmartStepTracker = {
    // Core state - simplified but smart
    state: {
        currentVisible: 1,        // What user is actually viewing
        highestCompleted: 0,      // Progress tracking
        availableSteps: new Set([1]),
        completedSteps: new Set(),
        transitionInProgress: false
    },
    
    // Step configuration
    steps: {
        1: { selector: 'section.mb-48:first-of-type', title: 'Import File' },
        2: { selector: '#step2', title: 'Select Sheet' },
        3: { selector: '#step3', title: 'Data Range' },
        4: { selector: '#step4', title: 'Map Columns' },
        5: { selector: '#step5', title: 'Scanner' }
    },
    
    // Cached elements and observers
    elements: new Map(),
    intersectionObserver: null,
    mutationObserver: null,
    navigationContainer: null,
    initialized: false,
    
    // Initialize smart tracker
    init() {
        if (this.initialized) {
            console.log('Smart Step Tracker already initialized');
            return;
        }
        
        console.log('Initializing Smart Step Tracker...');
        
        try {
            this._cacheStepElements();
            this._setupSmartViewportDetection();
            this._setupVisibilityObserver();
            this._createNavigationControls();
            this._bindEvents();
            this._performInitialScan();
            
            this.initialized = true;
            console.log('✓ Smart Step Tracker initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize Smart Step Tracker:', error);
        }
    },
    
    // Cache step elements with multiple detection strategies
    _cacheStepElements() {
        this.elements.clear();
        
        Object.entries(this.steps).forEach(([stepId, config]) => {
            const id = parseInt(stepId);
            let element = null;
            
            // Multiple strategies to find elements (keeping robust detection)
            const strategies = [
                () => document.querySelector(config.selector),
                () => {
                    if (id === 1) {
                        return document.querySelector('section.mb-48');
                    }
                    return document.getElementById(`step${id}`);
                },
                () => {
                    // Find by title content
                    const sections = document.querySelectorAll('section');
                    for (const section of sections) {
                        const title = section.querySelector('h2, .card__title');
                        if (title?.textContent.toLowerCase().includes(config.title.toLowerCase())) {
                            return section;
                        }
                    }
                    return null;
                }
            ];
            
            // Try each strategy
            for (const strategy of strategies) {
                try {
                    element = strategy();
                    if (element) break;
                } catch (error) {
                    // Continue to next strategy
                }
            }
            
            if (element) {
                // Ensure element has ID for reference
                if (!element.id) {
                    element.id = `step${id}-auto`;
                }
                
                this.elements.set(id, {
                    element,
                    config,
                    isVisible: !element.classList.contains('hidden'),
                    isInViewport: false,
                    viewportRatio: 0
                });
                
                console.log(`✓ Step ${id} (${config.title}) element cached`);
            } else {
                console.warn(`⚠ Step ${id} (${config.title}) element not found`);
            }
        });
        
        console.log(`Elements cached: ${this.elements.size}/5`);
    },
    
    // Setup smart viewport detection using IntersectionObserver
    _setupSmartViewportDetection() {
        if (!('IntersectionObserver' in window)) {
            console.warn('IntersectionObserver not supported, using scroll fallback');
            this._setupScrollFallback();
            return;
        }
        
        // Clean up existing observer
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }
        
        // Smart observer configuration
        const options = {
            root: null,
            rootMargin: '-15% 0px -35% 0px', // Smart detection zone
            threshold: [0, 0.1, 0.25, 0.5, 0.75, 0.9] // Multiple thresholds for accuracy
        };
        
        this.intersectionObserver = new IntersectionObserver(
            this._handleViewportIntersection.bind(this),
            options
        );
        
        // Observe all step elements
        this.elements.forEach((stepData, stepId) => {
            if (stepData.element) {
                this.intersectionObserver.observe(stepData.element);
                console.log(`✓ Observing step ${stepId} for viewport detection`);
            }
        });
        
        console.log('✓ Smart viewport detection setup complete');
    },
    
    // Handle smart viewport intersection - determines what user is actually viewing
    _handleViewportIntersection(entries) {
        if (this.state.transitionInProgress) {
            return; // Skip during programmatic transitions
        }
        
        let mostVisibleStep = null;
        let maxVisibility = 0;
        let visibleSteps = [];
        
        // Analyze all intersecting entries
        entries.forEach(entry => {
            const stepId = this._findStepByElement(entry.target);
            if (!stepId) return;
            
            const stepData = this.elements.get(stepId);
            if (!stepData) return;
            
            // Update viewport status
            stepData.isInViewport = entry.isIntersecting;
            stepData.viewportRatio = entry.intersectionRatio;
            
            if (entry.isIntersecting) {
                visibleSteps.push({
                    stepId,
                    ratio: entry.intersectionRatio,
                    rect: entry.boundingClientRect
                });
                
                // Find most visible step using smart logic
                const visibility = entry.intersectionRatio;
                const isLaterStep = stepId > (mostVisibleStep || 0);
                const significantlyMoreVisible = visibility > maxVisibility + 0.15;
                
                // Prefer later steps if visibility is similar (natural progression)
                if (significantlyMoreVisible || (visibility >= maxVisibility && isLaterStep)) {
                    maxVisibility = visibility;
                    mostVisibleStep = stepId;
                }
            }
        });
        
        // Update current visible step if changed
        if (mostVisibleStep && mostVisibleStep !== this.state.currentVisible) {
            console.log(`✓ Current viewing step: ${this.state.currentVisible} → ${mostVisibleStep}`);
            
            this.state.currentVisible = mostVisibleStep;
            this._updateUI();
            
            // Dispatch viewing event
            document.dispatchEvent(new CustomEvent('step:viewing-changed', {
                detail: { 
                    stepId: mostVisibleStep,
                    visibleSteps: visibleSteps.map(s => s.stepId)
                }
            }));
        }
        
        // Update debug info
        this._updateDebugInfo(visibleSteps, mostVisibleStep);
    },
    
    // Setup mutation observer for visibility changes
    _setupVisibilityObserver() {
        if (!('MutationObserver' in window)) {
            console.warn('MutationObserver not supported');
            return;
        }
        
        this.mutationObserver = new MutationObserver((mutations) => {
            let needsRefresh = false;
            
            mutations.forEach(mutation => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const stepId = this._findStepByElement(mutation.target);
                    if (stepId) {
                        const stepData = this.elements.get(stepId);
                        if (stepData) {
                            const wasVisible = stepData.isVisible;
                            const isVisible = !mutation.target.classList.contains('hidden');
                            
                            if (wasVisible !== isVisible) {
                                console.log(`Step ${stepId} visibility changed: ${isVisible}`);
                                stepData.isVisible = isVisible;
                                
                                if (isVisible) {
                                    this.state.availableSteps.add(stepId);
                                    // Re-observe if needed
                                    if (this.intersectionObserver) {
                                        this.intersectionObserver.observe(stepData.element);
                                    }
                                } else {
                                    this.state.availableSteps.delete(stepId);
                                }
                                
                                needsRefresh = true;
                            }
                        }
                    }
                }
            });
            
            if (needsRefresh) {
                setTimeout(() => this._updateUI(), 100);
            }
        });
        
        // Observe all step elements for class changes
        this.elements.forEach(stepData => {
            if (stepData.element) {
                this.mutationObserver.observe(stepData.element, {
                    attributes: true,
                    attributeFilter: ['class']
                });
            }
        });
        
        console.log('✓ Visibility observer setup complete');
    },
    
    // Scroll-based fallback for older browsers
    _setupScrollFallback() {
        let scrollTimeout;
        const handleScroll = () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                this._detectCurrentStepByScroll();
            }, 150);
        };
        
        window.addEventListener('scroll', handleScroll, { passive: true });
        console.log('✓ Scroll fallback detection setup');
    },
    
    // Fallback step detection
    _detectCurrentStepByScroll() {
        const viewport = {
            top: window.pageYOffset,
            bottom: window.pageYOffset + window.innerHeight
        };
        
        let currentStep = 1;
        let maxVisibility = 0;
        
        this.elements.forEach((stepData, stepId) => {
            if (!stepData.element || !stepData.isVisible) return;
            
            const rect = stepData.element.getBoundingClientRect();
            const elementTop = rect.top + window.pageYOffset;
            const elementBottom = elementTop + rect.height;
            
            if (elementTop < viewport.bottom && elementBottom > viewport.top) {
                const visibleHeight = Math.min(elementBottom, viewport.bottom) - Math.max(elementTop, viewport.top);
                const visibilityRatio = visibleHeight / rect.height;
                
                if (visibilityRatio > maxVisibility && visibilityRatio > 0.3) {
                    maxVisibility = visibilityRatio;
                    currentStep = stepId;
                }
            }
        });
        
        if (currentStep !== this.state.currentVisible) {
            this.state.currentVisible = currentStep;
            this._updateUI();
        }
    },
    
    // Create smart navigation controls
    _createNavigationControls() {
        this.navigationContainer = this._getOrCreateNavigationContainer();
        
        // Clear existing content
        this.navigationContainer.innerHTML = '';
        
        // Previous button
        const prevBtn = this._createNavigationButton('step-nav-prev', '← PREV', this._handleSmartPrevious.bind(this));
        
        // Current step indicator
        const indicator = document.createElement('div');
        indicator.id = 'step-nav-indicator';
        indicator.className = 'meta';
        indicator.style.cssText = `
            margin: 0 12px;
            display: flex;
            align-items: center;
            text-align: center;
            min-width: 140px;
            font-size: 10px;
            font-weight: 600;
        `;
        
        // Next button
        const nextBtn = this._createNavigationButton('step-nav-next', 'NEXT →', this._handleSmartNext.bind(this));
        
        // Debug info
        const debugInfo = document.createElement('div');
        debugInfo.id = 'step-debug-info';
        debugInfo.className = 'meta';
        debugInfo.style.cssText = `
            margin-left: 12px;
            font-size: 8px;
            opacity: 0.7;
            max-width: 120px;
            overflow: hidden;
        `;
        
        // Add to container
        this.navigationContainer.appendChild(prevBtn);
        this.navigationContainer.appendChild(indicator);
        this.navigationContainer.appendChild(nextBtn);
        this.navigationContainer.appendChild(debugInfo);
        
        console.log('✓ Smart navigation controls created');
    },
    
    // Create navigation button helper
    _createNavigationButton(id, text, clickHandler) {
        const button = document.createElement('button');
        button.id = id;
        button.className = 'button button--ghost button--sm';
        button.innerHTML = text;
        button.style.cssText = 'margin: 0 6px; font-size: 10px;';
        button.addEventListener('click', clickHandler);
        return button;
    },
    
    // Get or create navigation container
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
                padding: 8px 12px;
                background: var(--color-white, #fff);
                border: 2px solid var(--color-black, #000);
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                min-width: 340px;
                max-width: 90vw;
                font-size: 10px;
            `;
            
            // Mobile responsive
            const mediaQuery = window.matchMedia('(max-width: 768px)');
            if (mediaQuery.matches) {
                container.style.cssText += `
                    bottom: 16px;
                    right: 16px;
                    left: 16px;
                    min-width: auto;
                    max-width: none;
                `;
            }
            
            document.body.appendChild(container);
        }
        
        return container;
    },
    
    // Bind event listeners
    _bindEvents() {
        // Listen for step completion
        document.addEventListener('step:completed', this._handleStepCompleted.bind(this));
        
        // Listen for step activation
        document.addEventListener('step:activated', this._handleStepActivated.bind(this));
        
        // Listen for resize
        window.addEventListener('resize', this._handleResize.bind(this), { passive: true });
        
        console.log('✓ Event listeners bound');
    },
    
    // Handle step completion
    _handleStepCompleted(event) {
        const { stepId } = event.detail;
        
        if (!this._isValidStep(stepId)) {
            console.warn('Invalid step ID for completion:', stepId);
            return;
        }
        
        this.state.completedSteps.add(stepId);
        this.state.highestCompleted = Math.max(this.state.highestCompleted, stepId);
        
        // Activate next step
        const nextStep = stepId + 1;
        if (nextStep <= 5) {
            this.activateStep(nextStep);
            
            // Auto-scroll with delay for natural progression
            setTimeout(() => {
                this._smartScrollToStep(nextStep);
            }, 1200);
        }
        
        console.log(`✓ Step ${stepId} completed, highest: ${this.state.highestCompleted}`);
        this._updateUI();
    },
    
    // Handle step activation
    _handleStepActivated(event) {
        const { stepId } = event.detail;
        
        if (!this._isValidStep(stepId)) return;
        
        this.state.availableSteps.add(stepId);
        
        const stepData = this.elements.get(stepId);
        if (stepData?.element) {
            stepData.element.classList.remove('hidden');
            stepData.isVisible = true;
            
            // Re-observe if needed
            if (this.intersectionObserver) {
                this.intersectionObserver.observe(stepData.element);
            }
        }
        
        console.log(`✓ Step ${stepId} activated`);
        this._updateUI();
    },
    
    // Handle window resize
    _handleResize() {
        if (this.navigationContainer) {
            const mediaQuery = window.matchMedia('(max-width: 768px)');
            if (mediaQuery.matches) {
                this.navigationContainer.style.cssText += `
                    bottom: 16px;
                    right: 16px;
                    left: 16px;
                    min-width: auto;
                    max-width: none;
                `;
            }
        }
    },
    
    // Smart previous step navigation - considers natural user behavior
    _handleSmartPrevious() {
        const currentStep = this.state.currentVisible;
        let targetStep = null;
        
        // Find previous available step
        for (let stepId = currentStep - 1; stepId >= 1; stepId--) {
            const stepData = this.elements.get(stepId);
            if (stepData?.element && stepData.isVisible) {
                targetStep = stepId;
                break;
            }
        }
        
        if (targetStep) {
            console.log(`Smart navigation: ${currentStep} → ${targetStep} (previous)`);
            this._smartScrollToStep(targetStep);
        } else {
            console.log('No previous step available');
        }
    },
    
    // Smart next step navigation - considers natural user behavior
    _handleSmartNext() {
        const currentStep = this.state.currentVisible;
        let targetStep = null;
        
        // Find next available step
        for (let stepId = currentStep + 1; stepId <= 5; stepId++) {
            const stepData = this.elements.get(stepId);
            if (stepData?.element && stepData.isVisible) {
                targetStep = stepId;
                break;
            }
        }
        
        if (targetStep) {
            console.log(`Smart navigation: ${currentStep} → ${targetStep} (next)`);
            this._smartScrollToStep(targetStep);
        } else {
            console.log('No next step available');
        }
    },
    
    // Smart scroll to step - human-friendly scrolling
    _smartScrollToStep(stepId) {
        const stepData = this.elements.get(stepId);
        if (!stepData?.element || !stepData.isVisible) {
            console.warn(`Cannot scroll to step ${stepId}: not available`);
            return false;
        }
        
        this.state.transitionInProgress = true;
        
        try {
            const rect = stepData.element.getBoundingClientRect();
            const absoluteTop = rect.top + window.pageYOffset;
            const offset = window.innerHeight * 0.12; // Smart offset for natural viewing
            
            window.scrollTo({
                top: Math.max(0, absoluteTop - offset),
                behavior: 'smooth'
            });
            
            // Clear transition flag after scroll
            setTimeout(() => {
                this.state.transitionInProgress = false;
            }, 1000);
            
            console.log(`✓ Smart scroll to step ${stepId}`);
            return true;
            
        } catch (error) {
            console.error('Error during smart scroll:', error);
            this.state.transitionInProgress = false;
            return false;
        }
    },
    
    // Perform initial scan
    _performInitialScan() {
        console.log('Performing initial step scan...');
        
        // Identify initially visible steps
        this.elements.forEach((stepData, stepId) => {
            if (stepData.element && !stepData.element.classList.contains('hidden')) {
                stepData.isVisible = true;
                this.state.availableSteps.add(stepId);
                console.log(`Step ${stepId} initially available`);
            }
        });
        
        // Set current visible step
        const availableSteps = Array.from(this.state.availableSteps).sort((a, b) => a - b);
        if (availableSteps.length > 0) {
            this.state.currentVisible = availableSteps[0];
        }
        
        console.log(`Initial scan complete. Available: [${availableSteps.join(', ')}], Current: ${this.state.currentVisible}`);
        this._updateUI();
    },
    
    // Update all UI components
    _updateUI() {
        this._updateStepIndicator();
        this._updateNavigationButtons();
        this._updateNavigationIndicator();
        this._notifyStateChange();
    },
    
    // Update step indicator visual state
    _updateStepIndicator() {
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
            
            // Apply appropriate state
            if (this.state.completedSteps.has(stepId)) {
                indicator.classList.add('is-complete');
                numberEl.style.backgroundColor = 'var(--color-success, #22c55e)';
                numberEl.style.color = 'white';
                numberEl.textContent = '✓';
            } else if (stepId === this.state.currentVisible) {
                indicator.classList.add('is-current');
                numberEl.style.backgroundColor = 'var(--color-black, #000)';
                numberEl.style.color = 'white';
            } else if (this.state.availableSteps.has(stepId)) {
                indicator.classList.add('is-active');
            } else {
                numberEl.style.color = 'var(--color-gray-400, #9ca3af)';
            }
        });
    },
    
    // Update navigation buttons
    _updateNavigationButtons() {
        const prevBtn = document.getElementById('step-nav-prev');
        const nextBtn = document.getElementById('step-nav-next');
        
        if (!prevBtn || !nextBtn) return;
        
        const currentStep = this.state.currentVisible;
        
        // Check for previous step
        let hasPrevious = false;
        let previousTitle = '';
        for (let stepId = currentStep - 1; stepId >= 1; stepId--) {
            const stepData = this.elements.get(stepId);
            if (stepData?.isVisible) {
                hasPrevious = true;
                previousTitle = stepData.config.title;
                break;
            }
        }
        
        // Check for next step
        let hasNext = false;
        let nextTitle = '';
        for (let stepId = currentStep + 1; stepId <= 5; stepId++) {
            const stepData = this.elements.get(stepId);
            if (stepData?.isVisible) {
                hasNext = true;
                nextTitle = stepData.config.title;
                break;
            }
        }
        
        // Update button states
        prevBtn.disabled = !hasPrevious;
        nextBtn.disabled = !hasNext;
        
        prevBtn.style.opacity = hasPrevious ? '1' : '0.4';
        nextBtn.style.opacity = hasNext ? '1' : '0.4';
        
        prevBtn.title = hasPrevious ? `Previous: ${previousTitle}` : 'No previous step';
        nextBtn.title = hasNext ? `Next: ${nextTitle}` : 'No next step';
    },
    
    // Update navigation indicator
    _updateNavigationIndicator() {
        const indicator = document.getElementById('step-nav-indicator');
        if (!indicator) return;
        
        const stepData = this.elements.get(this.state.currentVisible);
        if (stepData) {
            const isCompleted = this.state.completedSteps.has(this.state.currentVisible);
            const completionMark = isCompleted ? ' ✓' : '';
            
            indicator.innerHTML = `
                <div style="text-align: center; line-height: 1.1;">
                    <div style="font-weight: 700;">STEP ${this.state.currentVisible}/5${completionMark}</div>
                    <div style="font-size: 8px; margin-top: 2px; opacity: 0.8;">${stepData.config.title.toUpperCase()}</div>
                </div>
            `;
        }
    },
    
    // Update debug info
    _updateDebugInfo(visibleSteps, currentStep) {
        const debugInfo = document.getElementById('step-debug-info');
        if (!debugInfo) return;
        
        const visible = visibleSteps?.map(s => s.stepId).join(',') || 'none';
        debugInfo.innerHTML = `
            <div style="line-height: 1.1;">
                <div>VIS: ${visible}</div>
                <div>CUR: ${currentStep || this.state.currentVisible}</div>
                <div>AVL: ${Array.from(this.state.availableSteps).join(',')}</div>
            </div>
        `;
    },
    
    // Notify of state changes
    _notifyStateChange() {
        document.dispatchEvent(new CustomEvent('step:state-changed', {
            detail: {
                currentVisible: this.state.currentVisible,
                highestCompleted: this.state.highestCompleted,
                availableSteps: Array.from(this.state.availableSteps),
                completedSteps: Array.from(this.state.completedSteps)
            }
        }));
    },
    
    // Helper methods
    _findStepByElement(element) {
        for (const [stepId, stepData] of this.elements) {
            if (stepData.element === element) {
                return stepId;
            }
        }
        return null;
    },
    
    _isValidStep(stepId) {
        return Number.isInteger(stepId) && stepId >= 1 && stepId <= 5;
    },
    
    // PUBLIC API
    
    // Complete a step
    completeStep(stepId) {
        if (!this._isValidStep(stepId)) return false;
        
        document.dispatchEvent(new CustomEvent('step:completed', {
            detail: { stepId }
        }));
        return true;
    },
    
    // Activate a step
    activateStep(stepId) {
        if (!this._isValidStep(stepId)) return false;
        
        document.dispatchEvent(new CustomEvent('step:activated', {
            detail: { stepId }
        }));
        return true;
    },
    
    // Navigate to step
    navigateToStep(stepId) {
        if (!this._isValidStep(stepId) || !this.state.availableSteps.has(stepId)) {
            console.warn(`Cannot navigate to step ${stepId}: not available`);
            return false;
        }
        
        return this._smartScrollToStep(stepId);
    },
    
    // Get current visible step
    getCurrentStep() {
        return this.state.currentVisible;
    },
    
    // Get available steps
    getAvailableSteps() {
        return Array.from(this.state.availableSteps).sort((a, b) => a - b);
    },
    
    // Get completed steps
    getCompletedSteps() {
        return Array.from(this.state.completedSteps).sort((a, b) => a - b);
    },
    
    // Get full state
    getState() {
        return {
            currentVisible: this.state.currentVisible,
            highestCompleted: this.state.highestCompleted,
            availableSteps: this.getAvailableSteps(),
            completedSteps: this.getCompletedSteps(),
            transitionInProgress: this.state.transitionInProgress
        };
    },
    
    // Reset tracker
    reset() {
        this.state.currentVisible = 1;
        this.state.highestCompleted = 0;
        this.state.availableSteps.clear();
        this.state.completedSteps.clear();
        this.state.availableSteps.add(1);
        
        // Hide all steps except first
        this.elements.forEach((stepData, stepId) => {
            if (stepId > 1 && stepData.element) {
                stepData.element.classList.add('hidden');
                stepData.isVisible = false;
            }
        });
        
        this._updateUI();
        console.log('✓ Smart Step Tracker reset');
    },
    
    // Destroy tracker
    destroy() {
        console.log('Destroying Smart Step Tracker...');
        
        // Disconnect observers
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
            this.intersectionObserver = null;
        }
        
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
            this.mutationObserver = null;
        }
        
        // Remove navigation container
        if (this.navigationContainer?.parentNode) {
            this.navigationContainer.parentNode.removeChild(this.navigationContainer);
            this.navigationContainer = null;
        }
        
        // Clear state
        this.elements.clear();
        this.state.availableSteps.clear();
        this.state.completedSteps.clear();
        this.initialized = false;
        
        console.log('✓ Smart Step Tracker destroyed');
    }
};

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.SmartStepTracker.init();
    });
} else {
    window.SmartStepTracker.init();
}
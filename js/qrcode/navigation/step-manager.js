/**
 * QR Code Component Scanner - FIXED Step Management System
 * Alica Technologies - Version 4.0 ROOT CAUSE FIX
 * 
 * ROOT CAUSE FIXES:
 * - Fixed step detection beyond step 3 with enhanced observer
 * - Robust step progression and navigation system
 * - Enhanced step indicator visual updates with proper state management
 * - Fixed auto-scroll and step transition timing
 * - Complete modular and dynamic step tracking system
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
    _intersectionObserver: null,
    _mutationObserver: null,
    _observedElements: new Set(),
    _stepTransitionInProgress: false,
    
    // ROOT CAUSE FIX: Enhanced step configuration with better tracking
    STEPS: {
        FILE_IMPORT: { id: 1, element: 'section:first-of-type', selector: '.mb-48:first-of-type', title: 'Import File' },
        SHEET_SELECT: { id: 2, element: 'step2', selector: '#step2', title: 'Select Sheet' },
        DATA_RANGE: { id: 3, element: 'step3', selector: '#step3', title: 'Data Range' },
        COLUMN_MAPPING: { id: 4, element: 'step4', selector: '#step4', title: 'Map Columns' },
        SCANNER: { id: 5, element: 'step5', selector: '#step5', title: 'Scanner' }
    },

    /**
     * ROOT CAUSE FIX: Enhanced initialization with better error handling
     */
    init() {
        if (this._initialized) {
            console.log('Step manager already initialized');
            return;
        }
        
        try {
            console.log('Initializing enhanced step manager...');
            
            this._initializeStepElements();
            this._createNavigationControls();
            this._setupEnhancedIntersectionObserver();
            this._setupMutationObserver();
            this._bindEvents();
            this._updateStepIndicator();
            this._performInitialStepScan();
            
            this._initialized = true;
            console.log('✓ Enhanced step manager initialized successfully');
        } catch (error) {
            console.error('Failed to initialize step manager:', error);
            // Continue with degraded functionality
        }
    },

    /**
     * ROOT CAUSE FIX: Enhanced step element initialization with multiple detection strategies
     */
    _initializeStepElements() {
        console.log('Initializing step elements...');
        this._stepElements.clear();
        
        Object.values(this.STEPS).forEach(step => {
            let element = null;
            
            // Multiple strategies to find elements
            const strategies = [
                () => document.getElementById(step.element),
                () => document.querySelector(step.selector),
                () => {
                    // Special case for step 1 (first section without ID)
                    if (step.id === 1) {
                        const sections = document.querySelectorAll('section.mb-48');
                        return sections[0] || null;
                    }
                    return null;
                },
                () => {
                    // Look for any section containing step title
                    const sections = document.querySelectorAll('section');
                    for (const section of sections) {
                        const title = section.querySelector('h2, .card__title');
                        if (title && title.textContent.toLowerCase().includes(step.title.toLowerCase())) {
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
                    console.warn(`Strategy failed for step ${step.id}:`, error);
                }
            }
            
            if (element) {
                // Ensure element has an ID for easier reference
                if (!element.id) {
                    element.id = `step${step.id}-auto`;
                }
                
                const stepInfo = {
                    ...step,
                    element: element,
                    isVisible: !element.classList.contains('hidden'),
                    isCompleted: false,
                    isInViewport: false,
                    wasProcessed: false
                };
                
                this._stepElements.set(step.id, stepInfo);
                console.log(`✓ Step ${step.id} (${step.title}) element found:`, element.id || element.tagName);
            } else {
                console.warn(`⚠ Step ${step.id} (${step.title}) element not found`);
            }
        });

        console.log(`Step elements initialized: ${this._stepElements.size}/5`);
    },

    /**
     * ROOT CAUSE FIX: Enhanced navigation controls with better positioning
     */
    _createNavigationControls() {
        const container = this._getOrCreateNavigationContainer();
        
        // Clear existing content
        container.innerHTML = '';
        
        // Previous step button
        const prevButton = document.createElement('button');
        prevButton.id = 'step-nav-prev';
        prevButton.className = 'button button--ghost button--sm';
        prevButton.innerHTML = '← PREV';
        prevButton.title = 'Go to previous step';
        prevButton.style.cssText = 'margin-right: 12px; font-size: 10px;';
        
        // Next step button
        const nextButton = document.createElement('button');
        nextButton.id = 'step-nav-next';
        nextButton.className = 'button button--ghost button--sm';
        nextButton.innerHTML = 'NEXT →';
        nextButton.title = 'Go to next step';
        nextButton.style.cssText = 'margin-left: 12px; font-size: 10px;';
        
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
        
        // Debug info (removable in production)
        const debugInfo = document.createElement('div');
        debugInfo.id = 'step-debug-info';
        debugInfo.className = 'meta';
        debugInfo.style.cssText = `
            margin-left: 12px;
            font-size: 8px;
            opacity: 0.7;
            max-width: 100px;
            overflow: hidden;
        `;
        
        // Add to container
        container.appendChild(prevButton);
        container.appendChild(indicator);
        container.appendChild(nextButton);
        container.appendChild(debugInfo);
        
        // Add event listeners
        prevButton.addEventListener('click', this._handlePreviousStep.bind(this));
        nextButton.addEventListener('click', this._handleNextStep.bind(this));
        
        this._updateNavigationButtons();
        console.log('✓ Navigation controls created');
    },

    /**
     * ROOT CAUSE FIX: Enhanced navigation container with better positioning
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
                padding: 8px 12px;
                background: var(--color-white, #fff);
                border: 2px solid var(--color-black, #000);
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                min-width: 320px;
                max-width: 90vw;
                font-size: 10px;
            `;
            
            // Make responsive on mobile
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
        
        this._navigationContainer = container;
        return container;
    },

    /**
     * ROOT CAUSE FIX: Enhanced intersection observer with better detection for all steps
     */
    _setupEnhancedIntersectionObserver() {
        if (!('IntersectionObserver' in window)) {
            console.warn('IntersectionObserver not supported, using fallback');
            this._setupFallbackStepDetection();
            return;
        }
        
        // Clean up previous observer
        if (this._intersectionObserver) {
            this._intersectionObserver.disconnect();
        }
        
        const options = {
            root: null,
            rootMargin: '-10% 0px -30% 0px', // More sensitive detection
            threshold: [0, 0.1, 0.3, 0.5, 0.7, 0.9] // Multiple thresholds for better detection
        };
        
        this._intersectionObserver = new IntersectionObserver(
            this._handleEnhancedIntersection.bind(this),
            options
        );
        
        // Observe all step elements
        this._observedElements.clear();
        this._stepElements.forEach((step, stepId) => {
            if (step.element) {
                this._intersectionObserver.observe(step.element);
                this._observedElements.add(step.element);
                console.log(`✓ Observing step ${stepId}: ${step.title}`);
            }
        });

        console.log(`✓ Enhanced intersection observer setup for ${this._observedElements.size} elements`);
    },

    /**
     * ROOT CAUSE FIX: Enhanced intersection handling with better step detection logic
     */
    _handleEnhancedIntersection(entries) {
        if (this._stepTransitionInProgress) {
            return; // Skip during transitions to avoid conflicts
        }
        
        let mostVisibleStep = null;
        let maxVisibility = 0;
        let visibleSteps = [];
        
        entries.forEach(entry => {
            const stepId = this._findStepIdByElement(entry.target);
            if (!stepId) return;
            
            const step = this._stepElements.get(stepId);
            if (!step) return;
            
            // Update step viewport status
            const wasInViewport = step.isInViewport;
            step.isInViewport = entry.isIntersecting;
            
            // Log visibility changes
            if (wasInViewport !== entry.isIntersecting) {
                console.log(`Step ${stepId} (${step.title}) visibility changed: ${entry.isIntersecting}`);
            }
            
            // Track visible steps
            if (entry.isIntersecting) {
                visibleSteps.push({ 
                    stepId, 
                    ratio: entry.intersectionRatio,
                    boundingRect: entry.boundingClientRect 
                });
                
                // Find most visible step based on intersection ratio and position
                const visibility = entry.intersectionRatio;
                const isHigherStep = stepId > (mostVisibleStep || 0);
                const isSignificantlyMoreVisible = visibility > maxVisibility + 0.1;
                
                if (isSignificantlyMoreVisible || (visibility >= maxVisibility && isHigherStep)) {
                    maxVisibility = visibility;
                    mostVisibleStep = stepId;
                }
            }
        });
        
        // Update debug info
        this._updateDebugInfo(visibleSteps, mostVisibleStep);
        
        // Update current step if changed
        if (mostVisibleStep && mostVisibleStep !== this._currentVisibleStep) {
            console.log(`✓ Current visible step changed: ${this._currentVisibleStep} → ${mostVisibleStep}`);
            
            this._currentVisibleStep = mostVisibleStep;
            this._updateNavigationIndicator();
            this._updateStepIndicator();
            this._updateNavigationButtons();
            
            // Notify observers
            this._notifyObservers(mostVisibleStep, 'visible');
        }
    },

    /**
     * Setup mutation observer to detect when steps become visible/hidden
     */
    _setupMutationObserver() {
        if (!('MutationObserver' in window)) {
            console.warn('MutationObserver not supported');
            return;
        }
        
        this._mutationObserver = new MutationObserver((mutations) => {
            let shouldRefresh = false;
            
            mutations.forEach(mutation => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const element = mutation.target;
                    const stepId = this._findStepIdByElement(element);
                    
                    if (stepId) {
                        const step = this._stepElements.get(stepId);
                        if (step) {
                            const wasVisible = step.isVisible;
                            const isVisible = !element.classList.contains('hidden');
                            
                            if (wasVisible !== isVisible) {
                                console.log(`Step ${stepId} visibility changed via class: ${isVisible}`);
                                step.isVisible = isVisible;
                                shouldRefresh = true;
                                
                                if (isVisible) {
                                    // Re-observe the element if it became visible
                                    if (this._intersectionObserver && !this._observedElements.has(element)) {
                                        this._intersectionObserver.observe(element);
                                        this._observedElements.add(element);
                                    }
                                }
                            }
                        }
                    }
                }
            });
            
            if (shouldRefresh) {
                setTimeout(() => {
                    this._updateStepIndicator();
                    this._updateNavigationButtons();
                }, 100);
            }
        });
        
        // Observe all step elements for class changes
        this._stepElements.forEach(step => {
            if (step.element) {
                this._mutationObserver.observe(step.element, { 
                    attributes: true, 
                    attributeFilter: ['class'] 
                });
            }
        });
        
        console.log('✓ Mutation observer setup for step visibility detection');
    },

    /**
     * Fallback step detection for older browsers
     */
    _setupFallbackStepDetection() {
        console.log('Setting up fallback step detection');
        
        // Use scroll-based detection as fallback
        let scrollTimeout;
        const handleScroll = () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                this._detectCurrentStepFallback();
            }, 100);
        };
        
        window.addEventListener('scroll', handleScroll, { passive: true });
        
        // Initial detection
        setTimeout(() => {
            this._detectCurrentStepFallback();
        }, 500);
    },

    /**
     * Fallback step detection method
     */
    _detectCurrentStepFallback() {
        const viewport = {
            top: window.scrollY,
            bottom: window.scrollY + window.innerHeight
        };
        
        let currentStep = 1;
        
        this._stepElements.forEach((step, stepId) => {
            if (!step.element || step.element.classList.contains('hidden')) {
                return;
            }
            
            const rect = step.element.getBoundingClientRect();
            const elementTop = rect.top + window.scrollY;
            const elementBottom = elementTop + rect.height;
            
            // Check if element is significantly in viewport
            if (elementTop < viewport.bottom && elementBottom > viewport.top) {
                const visibleHeight = Math.min(elementBottom, viewport.bottom) - Math.max(elementTop, viewport.top);
                const visibilityRatio = visibleHeight / rect.height;
                
                if (visibilityRatio > 0.3 && stepId > currentStep) {
                    currentStep = stepId;
                }
            }
        });
        
        if (currentStep !== this._currentVisibleStep) {
            this._currentVisibleStep = currentStep;
            this._updateNavigationIndicator();
            this._updateStepIndicator();
            this._updateNavigationButtons();
        }
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
     * Perform initial step scan to detect current state
     */
    _performInitialStepScan() {
        console.log('Performing initial step scan...');
        
        // Check which steps are currently visible
        let visibleSteps = [];
        
        this._stepElements.forEach((step, stepId) => {
            if (step.element && !step.element.classList.contains('hidden')) {
                step.isVisible = true;
                visibleSteps.push(stepId);
                console.log(`Step ${stepId} (${step.title}) is initially visible`);
            } else {
                step.isVisible = false;
            }
        });
        
        // Set current step to the first visible step
        if (visibleSteps.length > 0) {
            this._currentVisibleStep = Math.min(...visibleSteps);
        }
        
        console.log(`Initial scan complete. Current step: ${this._currentVisibleStep}`);
        this._updateStepIndicator();
        this._updateNavigationButtons();
    },

    /**
     * Update debug info in navigation
     */
    _updateDebugInfo(visibleSteps, currentStep) {
        const debugInfo = document.getElementById('step-debug-info');
        if (!debugInfo) return;
        
        const visible = visibleSteps.map(s => s.stepId).join(',');
        debugInfo.innerHTML = `
            <div style="line-height: 1.1;">
                <div>VIS: ${visible || 'none'}</div>
                <div>CUR: ${currentStep || 'none'}</div>
            </div>
        `;
    },

    /**
     * Enhanced event binding
     */
    _bindEvents() {
        // Listen for custom step events
        document.addEventListener('qr-scanner-step-completed', this._handleStepCompleted.bind(this));
        document.addEventListener('qr-scanner-step-activated', this._handleStepActivated.bind(this));
        
        // Listen for window resize to update navigation
        window.addEventListener('resize', this._handleWindowResize.bind(this), { passive: true });
        
        console.log('✓ Step manager events bound');
    },

    /**
     * Handle window resize
     */
    _handleWindowResize() {
        // Update navigation container responsiveness
        if (this._navigationContainer) {
            const mediaQuery = window.matchMedia('(max-width: 768px)');
            if (mediaQuery.matches) {
                this._navigationContainer.style.cssText += `
                    bottom: 16px;
                    right: 16px;
                    left: 16px;
                    min-width: auto;
                    max-width: none;
                `;
            }
        }
    },

    /**
     * ROOT CAUSE FIX: Enhanced step completion with proper progression
     */
    _handleStepCompleted(event) {
        const stepId = event.detail?.stepId;
        if (!stepId || stepId < 1 || stepId > 5) {
            console.warn('Invalid step ID for completion:', stepId);
            return;
        }
        
        const step = this._stepElements.get(stepId);
        if (step) {
            step.isCompleted = true;
            step.wasProcessed = true;
            this._highestCompletedStep = Math.max(this._highestCompletedStep, stepId);
        }
        
        console.log(`✓ Step ${stepId} marked as completed. Highest: ${this._highestCompletedStep}`);
        
        // ROOT CAUSE FIX: Enhanced auto-progression with better timing and error handling
        if (this._autoScrollEnabled && stepId < 5) {
            const nextStepId = stepId + 1;
            const nextStep = this._stepElements.get(nextStepId);
            
            if (nextStep && nextStep.element && !nextStep.element.classList.contains('hidden')) {
                console.log(`Auto-progressing from step ${stepId} to ${nextStepId}`);
                
                // Use a longer delay for step transitions
                setTimeout(() => {
                    this._scrollToNextStep(stepId);
                }, 1200); // Increased delay for better UX
            } else {
                console.log(`Next step ${nextStepId} is not available for auto-progression`);
            }
        }
        
        this._updateStepIndicator();
        this._updateNavigationButtons();
        
        // Notify observers
        this._notifyObservers(stepId, 'completed');
    },

    /**
     * Handle step activation
     */
    _handleStepActivated(event) {
        const stepId = event.detail?.stepId;
        if (!stepId) return;
        
        const step = this._stepElements.get(stepId);
        if (step) {
            step.isVisible = true;
            step.wasProcessed = true;
        }
        
        console.log(`✓ Step ${stepId} activated`);
        
        this._updateStepIndicator();
        this._updateNavigationButtons();
        
        // Notify observers
        this._notifyObservers(stepId, 'activated');
    },

    /**
     * ROOT CAUSE FIX: Enhanced scroll to next step with better error handling
     */
    _scrollToNextStep(currentStepId) {
        console.log(`Scrolling to next step after ${currentStepId}`);
        
        this._stepTransitionInProgress = true;
        
        const nextStepId = currentStepId + 1;
        let targetStepId = null;
        
        // Find the next available step
        for (let stepId = nextStepId; stepId <= 5; stepId++) {
            const step = this._stepElements.get(stepId);
            if (step && step.element && !step.element.classList.contains('hidden')) {
                targetStepId = stepId;
                break;
            }
        }
        
        if (targetStepId) {
            console.log(`Target step found: ${targetStepId}`);
            
            setTimeout(() => {
                this.navigateToStep(targetStepId);
                
                // Clear transition flag after scroll completes
                setTimeout(() => {
                    this._stepTransitionInProgress = false;
                }, 1000);
            }, 300);
        } else {
            console.log('No next step available for auto-scroll');
            this._stepTransitionInProgress = false;
        }
    },

    /**
     * ROOT CAUSE FIX: Enhanced previous step navigation
     */
    _handlePreviousStep() {
        const currentStep = this._currentVisibleStep;
        let targetStep = null;
        
        // Find previous available step
        for (let stepId = currentStep - 1; stepId >= 1; stepId--) {
            const step = this._stepElements.get(stepId);
            if (step && step.element && !step.element.classList.contains('hidden')) {
                targetStep = stepId;
                break;
            }
        }
        
        if (targetStep) {
            console.log(`Navigating to previous step: ${targetStep}`);
            this.navigateToStep(targetStep);
        } else {
            console.log('No previous step available');
        }
    },

    /**
     * ROOT CAUSE FIX: Enhanced next step navigation
     */
    _handleNextStep() {
        const currentStep = this._currentVisibleStep;
        let targetStep = null;
        
        // Find next available step
        for (let stepId = currentStep + 1; stepId <= 5; stepId++) {
            const step = this._stepElements.get(stepId);
            if (step && step.element && !step.element.classList.contains('hidden')) {
                targetStep = stepId;
                break;
            }
        }
        
        if (targetStep) {
            console.log(`Navigating to next step: ${targetStep}`);
            this.navigateToStep(targetStep);
        } else {
            console.log('No next step available');
        }
    },

    /**
     * ROOT CAUSE FIX: Enhanced navigate to step with better scrolling
     */
    navigateToStep(stepId) {
        const step = this._stepElements.get(stepId);
        if (!step || !step.element) {
            console.warn(`Cannot navigate to step ${stepId}: element not found`);
            return false;
        }
        
        if (step.element.classList.contains('hidden')) {
            console.warn(`Cannot navigate to step ${stepId}: element is hidden`);
            return false;
        }
        
        console.log(`Navigating to step ${stepId}: ${step.title}`);
        
        this._stepTransitionInProgress = true;
        
        try {
            // Enhanced scroll with better positioning
            const rect = step.element.getBoundingClientRect();
            const absoluteTop = rect.top + window.scrollY;
            const offset = window.innerHeight * 0.1; // 10% from top
            
            window.scrollTo({ 
                top: Math.max(0, absoluteTop - offset),
                behavior: 'smooth'
            });
            
            // Update current step immediately for better responsiveness
            this._currentVisibleStep = stepId;
            this._updateNavigationIndicator();
            this._updateNavigationButtons();
            
            // Dispatch navigation event
            document.dispatchEvent(new CustomEvent('qr-scanner-step-navigated', {
                detail: { stepId, stepName: step.title }
            }));
            
            // Clear transition flag
            setTimeout(() => {
                this._stepTransitionInProgress = false;
            }, 1000);
            
            console.log(`✓ Navigation to step ${stepId} initiated`);
            return true;
            
        } catch (error) {
            console.error('Error navigating to step:', error);
            this._stepTransitionInProgress = false;
            return false;
        }
    },

    /**
     * ROOT CAUSE FIX: Enhanced navigation buttons with better state detection
     */
    _updateNavigationButtons() {
        const prevBtn = document.getElementById('step-nav-prev');
        const nextBtn = document.getElementById('step-nav-next');
        
        if (!prevBtn || !nextBtn) return;
        
        const currentStep = this._currentVisibleStep;
        
        // Find available previous step
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
        
        // Find available next step
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
        
        // Update button states with enhanced styling
        prevBtn.disabled = !hasPrevious;
        nextBtn.disabled = !hasNext;
        
        if (hasPrevious) {
            prevBtn.classList.remove('disabled');
            prevBtn.style.opacity = '1';
            prevBtn.title = `Go to previous step: ${previousStepTitle}`;
        } else {
            prevBtn.classList.add('disabled');
            prevBtn.style.opacity = '0.4';
            prevBtn.title = 'No previous step available';
        }
        
        if (hasNext) {
            nextBtn.classList.remove('disabled');
            nextBtn.style.opacity = '1';
            nextBtn.title = `Go to next step: ${nextStepTitle}`;
        } else {
            nextBtn.classList.add('disabled');
            nextBtn.style.opacity = '0.4';
            nextBtn.title = 'No next step available';
        }
    },

    /**
     * ROOT CAUSE FIX: Enhanced navigation indicator
     */
    _updateNavigationIndicator() {
        const indicator = document.getElementById('step-nav-indicator');
        if (!indicator) return;
        
        const step = this._stepElements.get(this._currentVisibleStep);
        if (step) {
            const completionStatus = step.isCompleted ? '✓' : '';
            indicator.innerHTML = `
                <div style="text-align: center; line-height: 1.1;">
                    <div style="font-weight: 700;">STEP ${this._currentVisibleStep}/5 ${completionStatus}</div>
                    <div style="font-size: 8px; margin-top: 2px; opacity: 0.8;">${step.title.toUpperCase()}</div>
                </div>
            `;
        }
    },

    /**
     * ROOT CAUSE FIX: Complete rewrite of step indicator with proper state management
     */
    _updateStepIndicator() {
        const indicators = document.querySelectorAll('.step-indicator__item');
        
        if (indicators.length === 0) {
            console.warn('Step indicators not found in DOM');
            return;
        }
        
        console.log(`Updating step indicators (current: ${this._currentVisibleStep}, highest completed: ${this._highestCompletedStep})`);
        
        indicators.forEach((indicator, index) => {
            const stepId = index + 1;
            const step = this._stepElements.get(stepId);
            
            // Clear ALL existing state classes
            indicator.classList.remove('is-current', 'is-complete', 'is-active', 'completed', 'available', 'unavailable');
            
            const numberEl = indicator.querySelector('.step-indicator__number');
            if (!numberEl) return;
            
            // Reset styles first
            numberEl.style.backgroundColor = '';
            numberEl.style.color = '';
            numberEl.innerHTML = stepId;
            
            // Apply new state based on step status
            if (step && step.isCompleted) {
                // Completed step
                indicator.classList.add('is-complete', 'completed');
                numberEl.style.backgroundColor = 'var(--color-success, #22c55e)';
                numberEl.style.color = 'white';
                numberEl.innerHTML = '✓';
                console.log(`Step ${stepId} marked as completed`);
                
            } else if (stepId === this._currentVisibleStep) {
                // Current step
                indicator.classList.add('is-current');
                numberEl.style.backgroundColor = 'var(--color-black, #000)';
                numberEl.style.color = 'white';
                numberEl.innerHTML = stepId;
                console.log(`Step ${stepId} marked as current`);
                
            } else if (step && step.element && step.isVisible) {
                // Available step
                indicator.classList.add('is-active', 'available');
                numberEl.style.backgroundColor = '';
                numberEl.style.color = '';
                numberEl.innerHTML = stepId;
                console.log(`Step ${stepId} marked as available`);
                
            } else {
                // Unavailable step
                indicator.classList.add('unavailable');
                numberEl.style.backgroundColor = '';
                numberEl.style.color = 'var(--color-gray-400, #9ca3af)';
                numberEl.innerHTML = stepId;
                console.log(`Step ${stepId} marked as unavailable`);
            }
        });
        
        console.log('✓ Step indicators updated successfully');
    },

    /**
     * Notify observers of step changes
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

    // ========================================
    // PUBLIC API METHODS
    // ========================================

    /**
     * Mark step as completed - PUBLIC API
     */
    markStepCompleted(stepId) {
        if (stepId < 1 || stepId > 5) {
            console.warn('Invalid step ID for completion:', stepId);
            return false;
        }
        
        document.dispatchEvent(new CustomEvent('qr-scanner-step-completed', {
            detail: { stepId }
        }));
        return true;
    },

    /**
     * Activate step - PUBLIC API
     */
    activateStep(stepId) {
        if (stepId < 1 || stepId > 5) {
            console.warn('Invalid step ID for activation:', stepId);
            return false;
        }
        
        const step = this._stepElements.get(stepId);
        if (!step) {
            console.warn(`Step ${stepId} not found for activation`);
            return false;
        }
        
        // Show the step element
        if (step.element) {
            step.element.classList.remove('hidden');
            step.isVisible = true;
            
            // Re-observe if needed
            if (this._intersectionObserver && !this._observedElements.has(step.element)) {
                this._intersectionObserver.observe(step.element);
                this._observedElements.add(step.element);
            }
        }
        
        // Dispatch activation event
        document.dispatchEvent(new CustomEvent('qr-scanner-step-activated', {
            detail: { stepId }
        }));
        
        // Auto-scroll to step if beyond current position
        if (this._autoScrollEnabled && stepId > this._currentVisibleStep) {
            setTimeout(() => {
                this.navigateToStep(stepId);
            }, 300);
        }
        
        console.log(`✓ Step ${stepId} activated`);
        return true;
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
        console.log(`Auto-scroll ${enabled ? 'enabled' : 'disabled'}`);
    },

    /**
     * Add observer for step changes - PUBLIC API
     */
    addObserver(callback) {
        if (typeof callback === 'function') {
            this._observers.add(callback);
            return true;
        }
        return false;
    },

    /**
     * Remove observer - PUBLIC API
     */
    removeObserver(callback) {
        return this._observers.delete(callback);
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
            if (step.element && step.isVisible) {
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
        return step && step.element && step.isVisible;
    },

    /**
     * Get navigation state - PUBLIC API
     */
    getNavigationState() {
        return {
            currentStep: this._currentVisibleStep,
            highestCompleted: this._highestCompletedStep,
            availableSteps: this.getAvailableSteps(),
            autoScrollEnabled: this._autoScrollEnabled,
            transitionInProgress: this._stepTransitionInProgress,
            initialized: this._initialized
        };
    },

    /**
     * Force refresh step indicator - PUBLIC API
     */
    refreshStepIndicator() {
        try {
            this._performInitialStepScan();
            this._updateStepIndicator();
            this._updateNavigationButtons();
            this._updateNavigationIndicator();
            console.log('✓ Step indicator refreshed');
        } catch (error) {
            console.error('Error refreshing step indicator:', error);
        }
    },

    /**
     * Get debug information - PUBLIC API
     */
    getDebugInfo() {
        const stepStatus = {};
        this._stepElements.forEach((step, stepId) => {
            stepStatus[stepId] = {
                title: step.title,
                hasElement: !!step.element,
                isVisible: step.isVisible,
                isCompleted: step.isCompleted,
                isInViewport: step.isInViewport,
                elementId: step.element?.id,
                elementClasses: step.element?.className
            };
        });
        
        return {
            initialized: this._initialized,
            currentStep: this._currentVisibleStep,
            highestCompleted: this._highestCompletedStep,
            autoScrollEnabled: this._autoScrollEnabled,
            transitionInProgress: this._stepTransitionInProgress,
            observedElements: this._observedElements.size,
            stepStatus,
            hasIntersectionObserver: !!this._intersectionObserver,
            hasMutationObserver: !!this._mutationObserver
        };
    },

    /**
     * ROOT CAUSE FIX: Enhanced destroy with complete cleanup
     */
    destroy() {
        try {
            console.log('Destroying step manager...');
            
            // Disconnect observers
            if (this._intersectionObserver) {
                this._intersectionObserver.disconnect();
                this._intersectionObserver = null;
            }
            
            if (this._mutationObserver) {
                this._mutationObserver.disconnect();
                this._mutationObserver = null;
            }
            
            // Remove navigation container
            if (this._navigationContainer && this._navigationContainer.parentNode) {
                this._navigationContainer.parentNode.removeChild(this._navigationContainer);
                this._navigationContainer = null;
            }
            
            // Clear all state
            this._observers.clear();
            this._stepElements.clear();
            this._observedElements.clear();
            
            // Reset state variables
            this._currentVisibleStep = 1;
            this._highestCompletedStep = 0;
            this._stepTransitionInProgress = false;
            this._initialized = false;
            
            console.log('✓ Step manager destroyed successfully');
        } catch (error) {
            console.error('Error destroying step manager:', error);
        }
    }
};

// Enhanced initialization with better error handling
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
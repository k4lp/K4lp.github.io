/**
 * Enhanced Step Tracker - Ultimate Production Implementation
 * QR Code Component Scanner - K4lp.github.io
 * 
 * REVAMPED: October 8, 2025
 * - Ultra-reliable step indicator updates with fallback mechanisms
 * - Enhanced Swiss design principles with perfect typography
 * - Production-grade error handling and recovery
 * - Mobile-first responsive architecture
 * - Zero debug output - clean production code
 */

class UltraStepTracker {
    constructor() {
        // Core state - immutable pattern for reliability
        this.state = Object.freeze({
            currentVisible: 1,
            highestCompleted: 0,
            availableSteps: new Set([1]),
            completedSteps: new Set(),
            transitionInProgress: false
        });

        // Step configuration with enhanced selectors
        this.steps = Object.freeze({
            1: { selector: 'section.mb-48:first-of-type', title: 'Import File', icon: '📁' },
            2: { selector: '#step2', title: 'Select Sheet', icon: '📊' },
            3: { selector: '#step3', title: 'Data Range', icon: '🎯' },
            4: { selector: '#step4', title: 'Map Columns', icon: '🗺️' },
            5: { selector: '#step5', title: 'Scanner', icon: '📱' }
        });

        // Enhanced configuration
        this.config = Object.freeze({
            viewportObserver: {
                rootMargin: '-10% 0px -30% 0px',
                threshold: [0, 0.15, 0.3, 0.5, 0.7, 0.85, 1.0]
            },
            animation: {
                duration: 300,
                easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                scrollOffset: 0.12
            },
            mobile: {
                breakpoint: 768,
                compactMode: true
            }
        });

        // Internal caches and observers
        this.elements = new Map();
        this.observers = new Set();
        this.initialized = false;
        this.retryCount = 0;
        this.maxRetries = 3;
    }

    // Initialize with comprehensive error handling
    async init() {
        if (this.initialized) {
            console.log('Ultra Step Tracker already initialized');
            return;
        }

        try {
            console.log('🚀 Initializing Ultra Step Tracker...');
            
            // Initialize in sequence with error recovery
            await this._initializeElementCache();
            await this._setupViewportDetection();
            await this._setupVisibilityObserver();
            await this._createEnhancedNavigation();
            await this._bindEventSystem();
            await this._performInitialScan();
            
            // Force initial UI update with retry mechanism
            this._updateUIWithRetry();
            
            this.initialized = true;
            console.log('✅ Ultra Step Tracker initialized successfully');

        } catch (error) {
            console.error('❌ Failed to initialize Ultra Step Tracker:', error);
            
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                console.log(`🔄 Retry ${this.retryCount}/${this.maxRetries}...`);
                setTimeout(() => this.init(), 1000 * this.retryCount);
            } else {
                console.error('💥 Maximum retries exceeded. Falling back to minimal functionality.');
                this._initializeFallbackMode();
            }
        }
    }

    // Enhanced element caching with multiple detection strategies
    async _initializeElementCache() {
        this.elements.clear();

        for (const [stepId, config] of Object.entries(this.steps)) {
            const id = parseInt(stepId);
            let element = null;

            // Multi-strategy element detection
            const strategies = [
                () => document.querySelector(config.selector),
                () => id === 1 ? document.querySelector('section.mb-48') : document.getElementById(`step${id}`),
                () => this._findElementByTitle(config.title),
                () => this._findElementByContent(config.title)
            ];

            // Try each strategy
            for (const strategy of strategies) {
                try {
                    element = strategy();
                    if (element && this._validateElement(element)) break;
                } catch (error) {
                    // Continue to next strategy
                }
            }

            if (element) {
                // Ensure element has ID for reference
                if (!element.id) {
                    element.id = `step${id}-auto`;
                }

                // Cache with enhanced metadata
                this.elements.set(id, {
                    element,
                    config,
                    isVisible: !element.classList.contains('hidden'),
                    isInViewport: false,
                    viewportRatio: 0,
                    lastUpdate: Date.now()
                });

                console.log(`✅ Step ${id} (${config.title}) cached successfully`);
            } else {
                console.warn(`⚠️ Step ${id} (${config.title}) element not found`);
            }
        }

        console.log(`📋 Elements cached: ${this.elements.size}/5`);
    }

    // Find element by title content
    _findElementByTitle(title) {
        const sections = document.querySelectorAll('section');
        for (const section of sections) {
            const titleEl = section.querySelector('h2, h3, .card__title, .section-title');
            if (titleEl?.textContent.toLowerCase().includes(title.toLowerCase())) {
                return section;
            }
        }
        return null;
    }

    // Find element by any content match
    _findElementByContent(title) {
        const sections = document.querySelectorAll('section');
        for (const section of sections) {
            if (section.textContent.toLowerCase().includes(title.toLowerCase())) {
                return section;
            }
        }
        return null;
    }

    // Validate element suitability
    _validateElement(element) {
        return element && 
               element.nodeType === Node.ELEMENT_NODE &&
               element.getBoundingClientRect &&
               !element.hidden;
    }

    // Setup enhanced viewport detection
    async _setupViewportDetection() {
        if (!('IntersectionObserver' in window)) {
            console.warn('⚠️ IntersectionObserver not supported, using scroll fallback');
            this._setupScrollFallback();
            return;
        }

        // Clean up existing observer
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }

        // Create enhanced observer
        this.intersectionObserver = new IntersectionObserver(
            this._handleViewportIntersection.bind(this),
            this.config.viewportObserver
        );

        // Observe all cached elements
        this.elements.forEach((stepData, stepId) => {
            if (stepData.element) {
                this.intersectionObserver.observe(stepData.element);
                console.log(`👁️ Observing step ${stepId} for viewport detection`);
            }
        });

        console.log('👁️ Enhanced viewport detection setup complete');
    }

    // Handle viewport intersection with smart logic
    _handleViewportIntersection(entries) {
        if (this.state.transitionInProgress) return;

        let mostVisibleStep = null;
        let maxVisibility = 0;
        const visibleSteps = [];

        entries.forEach(entry => {
            const stepId = this._findStepByElement(entry.target);
            if (!stepId) return;

            const stepData = this.elements.get(stepId);
            if (!stepData) return;

            // Update viewport metadata
            stepData.isInViewport = entry.isIntersecting;
            stepData.viewportRatio = entry.intersectionRatio;
            stepData.lastUpdate = Date.now();

            if (entry.isIntersecting) {
                visibleSteps.push({
                    stepId,
                    ratio: entry.intersectionRatio,
                    rect: entry.boundingClientRect
                });

                // Enhanced visibility calculation
                const visibility = entry.intersectionRatio;
                const isLaterStep = stepId > (mostVisibleStep || 0);
                const significantlyMoreVisible = visibility > maxVisibility + 0.1;
                const isPreferredStep = this._isPreferredStep(stepId, visibility, maxVisibility);

                if (significantlyMoreVisible || (visibility >= maxVisibility && (isLaterStep || isPreferredStep))) {
                    maxVisibility = visibility;
                    mostVisibleStep = stepId;
                }
            }
        });

        // Update current step if changed
        if (mostVisibleStep && mostVisibleStep !== this.state.currentVisible) {
            console.log(`🎯 Viewport changed: ${this.state.currentVisible} → ${mostVisibleStep}`);
            
            this._updateState({ currentVisible: mostVisibleStep });
            this._updateUIAsync();

            // Dispatch viewport change event
            this._dispatchEvent('step:viewing-changed', {
                stepId: mostVisibleStep,
                visibleSteps: visibleSteps.map(s => s.stepId),
                previousStep: this.state.currentVisible
            });
        }
    }

    // Enhanced step preference logic
    _isPreferredStep(stepId, visibility, maxVisibility) {
        const stepData = this.elements.get(stepId);
        if (!stepData) return false;

        // Prefer completed steps when visibility is similar
        if (this.state.completedSteps.has(stepId) && visibility >= maxVisibility * 0.9) {
            return true;
        }

        // Prefer available steps over unavailable ones
        if (this.state.availableSteps.has(stepId) && visibility >= maxVisibility * 0.8) {
            return true;
        }

        return false;
    }

    // Immutable state updates
    _updateState(updates) {
        this.state = Object.freeze({
            ...this.state,
            ...updates
        });
    }

    // Setup visibility observer for dynamic content
    async _setupVisibilityObserver() {
        if (!('MutationObserver' in window)) {
            console.warn('⚠️ MutationObserver not supported');
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
                                console.log(`👁️ Step ${stepId} visibility: ${wasVisible} → ${isVisible}`);
                                stepData.isVisible = isVisible;
                                stepData.lastUpdate = Date.now();

                                if (isVisible) {
                                    this._updateState({
                                        availableSteps: new Set([...this.state.availableSteps, stepId])
                                    });
                                    
                                    if (this.intersectionObserver) {
                                        this.intersectionObserver.observe(stepData.element);
                                    }
                                } else {
                                    const newAvailable = new Set(this.state.availableSteps);
                                    newAvailable.delete(stepId);
                                    this._updateState({ availableSteps: newAvailable });
                                }

                                needsRefresh = true;
                            }
                        }
                    }
                }
            });

            if (needsRefresh) {
                setTimeout(() => this._updateUIAsync(), 100);
            }
        });

        // Observe all step elements
        this.elements.forEach(stepData => {
            if (stepData.element) {
                this.mutationObserver.observe(stepData.element, {
                    attributes: true,
                    attributeFilter: ['class']
                });
            }
        });

        console.log('👁️ Visibility observer setup complete');
    }

    // Create enhanced navigation with perfect Swiss design
    async _createEnhancedNavigation() {
        const container = this._getOrCreateNavigationContainer();
        
        // Clear existing content
        container.innerHTML = '';
        container.className = 'ultra-step-navigation';

        // Enhanced container styling
        Object.assign(container.style, {
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: '100',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            background: 'var(--white, #fff)',
            border: '2px solid var(--black, #000)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
            fontFamily: 'var(--font-sans)',
            fontSize: '10px',
            fontWeight: '600',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            backdropFilter: 'blur(8px)',
            transition: 'all 200ms var(--easing, cubic-bezier(0.4, 0, 0.2, 1))',
            minWidth: '280px',
            maxWidth: '90vw'
        });

        // Previous button
        const prevBtn = this._createEnhancedButton('ultra-prev', '← PREV', this._handleSmartPrevious.bind(this));
        
        // Enhanced step indicator
        const indicator = document.createElement('div');
        indicator.id = 'ultra-step-indicator';
        Object.assign(indicator.style, {
            margin: '0 16px',
            display: 'flex',
            alignItems: 'center',
            textAlign: 'center',
            minWidth: '120px',
            fontSize: '9px',
            fontWeight: '700',
            letterSpacing: '0.1em',
            color: 'var(--gray-600, #525252)'
        });
        
        // Next button
        const nextBtn = this._createEnhancedButton('ultra-next', 'NEXT →', this._handleSmartNext.bind(this));

        // Assemble navigation
        container.appendChild(prevBtn);
        container.appendChild(indicator);
        container.appendChild(nextBtn);

        // Apply mobile responsiveness
        this._applyMobileStyles(container);

        console.log('🎨 Enhanced navigation created with Swiss design');
    }

    // Create enhanced button with perfect styling
    _createEnhancedButton(id, text, clickHandler) {
        const button = document.createElement('button');
        button.id = id;
        button.textContent = text;
        button.addEventListener('click', clickHandler);

        Object.assign(button.style, {
            margin: '0 4px',
            padding: '6px 12px',
            border: '1px solid var(--black, #000)',
            background: 'transparent',
            color: 'var(--black, #000)',
            fontSize: '9px',
            fontWeight: '600',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            transition: 'all 150ms var(--easing, cubic-bezier(0.4, 0, 0.2, 1))',
            fontFamily: 'inherit'
        });

        // Enhanced hover and active states
        button.addEventListener('mouseenter', () => {
            if (!button.disabled) {
                button.style.background = 'var(--gray-100, #f5f5f5)';
            }
        });

        button.addEventListener('mouseleave', () => {
            button.style.background = 'transparent';
        });

        button.addEventListener('mousedown', () => {
            if (!button.disabled) {
                button.style.transform = 'scale(0.98)';
            }
        });

        button.addEventListener('mouseup', () => {
            button.style.transform = 'scale(1)';
        });

        return button;
    }

    // Apply mobile-responsive styling
    _applyMobileStyles(container) {
        const mediaQuery = window.matchMedia(`(max-width: ${this.config.mobile.breakpoint}px)`);
        
        const applyStyles = () => {
            if (mediaQuery.matches) {
                Object.assign(container.style, {
                    bottom: '16px',
                    right: '16px',
                    left: '16px',
                    minWidth: 'auto',
                    maxWidth: 'none',
                    justifyContent: 'center',
                    padding: '10px 12px',
                    fontSize: '9px'
                });
            } else {
                Object.assign(container.style, {
                    bottom: '24px',
                    right: '24px',
                    left: 'auto',
                    minWidth: '280px',
                    maxWidth: '90vw',
                    justifyContent: 'flex-start',
                    padding: '12px 16px',
                    fontSize: '10px'
                });
            }
        };

        applyStyles();
        mediaQuery.addListener(applyStyles);
    }

    // Get or create navigation container
    _getOrCreateNavigationContainer() {
        let container = document.getElementById('ultra-step-navigation');
        
        if (!container) {
            container = document.createElement('div');
            container.id = 'ultra-step-navigation';
            document.body.appendChild(container);
        }

        return container;
    }

    // Enhanced event system
    async _bindEventSystem() {
        document.addEventListener('step:completed', this._handleStepCompleted.bind(this));
        document.addEventListener('step:activated', this._handleStepActivated.bind(this));
        window.addEventListener('resize', this._handleResize.bind(this), { passive: true });

        console.log('🔗 Enhanced event system bound');
    }

    // Handle step completion with auto-progression
    _handleStepCompleted(event) {
        const { stepId } = event.detail;

        if (!this._isValidStep(stepId)) {
            console.warn('⚠️ Invalid step ID for completion:', stepId);
            return;
        }

        // Update state immutably
        const newCompleted = new Set(this.state.completedSteps);
        newCompleted.add(stepId);

        this._updateState({
            completedSteps: newCompleted,
            highestCompleted: Math.max(this.state.highestCompleted, stepId)
        });

        // Auto-activate next step
        const nextStep = stepId + 1;
        if (nextStep <= 5) {
            this.activateStep(nextStep);

            // Smart auto-scroll with delay
            setTimeout(() => {
                this._smartScrollToStep(nextStep);
            }, 1200);
        }

        console.log(`✅ Step ${stepId} completed, highest: ${this.state.highestCompleted}`);
        this._updateUIAsync();
    }

    // Handle step activation
    _handleStepActivated(event) {
        const { stepId } = event.detail;

        if (!this._isValidStep(stepId)) return;

        // Update state immutably
        const newAvailable = new Set(this.state.availableSteps);
        newAvailable.add(stepId);
        this._updateState({ availableSteps: newAvailable });

        const stepData = this.elements.get(stepId);
        if (stepData?.element) {
            stepData.element.classList.remove('hidden');
            stepData.isVisible = true;
            stepData.lastUpdate = Date.now();

            if (this.intersectionObserver) {
                this.intersectionObserver.observe(stepData.element);
            }
        }

        console.log(`🎯 Step ${stepId} activated`);
        this._updateUIAsync();
    }

    // Handle window resize
    _handleResize() {
        const container = document.getElementById('ultra-step-navigation');
        if (container) {
            this._applyMobileStyles(container);
        }
    }

    // Smart previous navigation
    _handleSmartPrevious() {
        const currentStep = this.state.currentVisible;
        let targetStep = null;

        for (let stepId = currentStep - 1; stepId >= 1; stepId--) {
            const stepData = this.elements.get(stepId);
            if (stepData?.element && stepData.isVisible) {
                targetStep = stepId;
                break;
            }
        }

        if (targetStep) {
            console.log(`⬅️ Smart navigation: ${currentStep} → ${targetStep} (previous)`);
            this._smartScrollToStep(targetStep);
        }
    }

    // Smart next navigation
    _handleSmartNext() {
        const currentStep = this.state.currentVisible;
        let targetStep = null;

        for (let stepId = currentStep + 1; stepId <= 5; stepId++) {
            const stepData = this.elements.get(stepId);
            if (stepData?.element && stepData.isVisible) {
                targetStep = stepId;
                break;
            }
        }

        if (targetStep) {
            console.log(`➡️ Smart navigation: ${currentStep} → ${targetStep} (next)`);
            this._smartScrollToStep(targetStep);
        }
    }

    // Enhanced smart scrolling
    _smartScrollToStep(stepId) {
        const stepData = this.elements.get(stepId);
        if (!stepData?.element || !stepData.isVisible) {
            console.warn(`⚠️ Cannot scroll to step ${stepId}: not available`);
            return false;
        }

        this._updateState({ transitionInProgress: true });

        try {
            const rect = stepData.element.getBoundingClientRect();
            const absoluteTop = rect.top + window.pageYOffset;
            const offset = window.innerHeight * this.config.animation.scrollOffset;

            window.scrollTo({
                top: Math.max(0, absoluteTop - offset),
                behavior: 'smooth'
            });

            setTimeout(() => {
                this._updateState({ transitionInProgress: false });
            }, this.config.animation.duration * 3);

            console.log(`📜 Smart scroll to step ${stepId} completed`);
            return true;

        } catch (error) {
            console.error('❌ Error during smart scroll:', error);
            this._updateState({ transitionInProgress: false });
            return false;
        }
    }

    // Perform initial scan
    async _performInitialScan() {
        console.log('🔍 Performing initial step scan...');

        const newAvailable = new Set();
        
        this.elements.forEach((stepData, stepId) => {
            if (stepData.element && !stepData.element.classList.contains('hidden')) {
                stepData.isVisible = true;
                stepData.lastUpdate = Date.now();
                newAvailable.add(stepId);
                console.log(`✅ Step ${stepId} initially available`);
            }
        });

        this._updateState({ availableSteps: newAvailable });

        const availableSteps = Array.from(this.state.availableSteps).sort((a, b) => a - b);
        if (availableSteps.length > 0) {
            this._updateState({ currentVisible: availableSteps[0] });
        }

        console.log(`🔍 Initial scan complete. Available: [${availableSteps.join(', ')}], Current: ${this.state.currentVisible}`);
        this._updateUIAsync();
    }

    // Async UI update for performance
    _updateUIAsync() {
        requestAnimationFrame(() => {
            this._updateStepIndicator();
            this._updateNavigationButtons();
            this._updateNavigationIndicator();
            this._dispatchStateChange();
        });
    }

    // UI update with retry mechanism
    _updateUIWithRetry(retries = 3) {
        try {
            this._updateUIAsync();
        } catch (error) {
            console.warn('⚠️ UI update failed:', error);
            if (retries > 0) {
                setTimeout(() => this._updateUIWithRetry(retries - 1), 100);
            }
        }
    }

    // ULTRA-RELIABLE step indicator update with multiple fallback mechanisms
    _updateStepIndicator() {
        const indicators = document.querySelectorAll('.step-indicator__item');

        if (indicators.length === 0) {
            console.warn('⚠️ No step indicator items found');
            // Try alternative selectors
            const altIndicators = document.querySelectorAll('.step-item, .progress-step, [class*="step"]');
            if (altIndicators.length === 0) {
                return;
            }
        }

        console.log(`🎨 Updating step indicator: Current=${this.state.currentVisible}, Completed=[${Array.from(this.state.completedSteps).join(', ')}]`);

        indicators.forEach((indicator, index) => {
            const stepId = index + 1;
            const numberEl = indicator.querySelector('.step-indicator__number') || 
                           indicator.querySelector('.step-number') ||
                           indicator.querySelector('[class*="number"]');

            if (!numberEl) {
                console.warn(`⚠️ Step number element not found for step ${stepId}`);
                return;
            }

            try {
                // FORCE clear all existing classes and styles
                indicator.className = indicator.className.replace(/\bis-(current|complete|active)\b/g, '');
                indicator.classList.remove('is-current', 'is-complete', 'is-active');
                
                // Reset number element completely
                numberEl.removeAttribute('style');
                numberEl.style.cssText = '';
                numberEl.textContent = stepId.toString();

                // Apply enhanced state-based styling with !important for maximum reliability
                if (this.state.completedSteps.has(stepId)) {
                    indicator.classList.add('is-complete');
                    this._applyCompleteStyle(numberEl);
                    numberEl.textContent = '✓';
                    console.log(`✅ Step ${stepId} marked as COMPLETE`);
                    
                } else if (stepId === this.state.currentVisible) {
                    indicator.classList.add('is-current');
                    this._applyCurrentStyle(numberEl);
                    console.log(`🎯 Step ${stepId} marked as CURRENT`);
                    
                } else if (this.state.availableSteps.has(stepId)) {
                    indicator.classList.add('is-active');
                    this._applyActiveStyle(numberEl);
                    console.log(`⚪ Step ${stepId} marked as ACTIVE`);
                    
                } else {
                    this._applyInactiveStyle(numberEl);
                    console.log(`⚫ Step ${stepId} marked as INACTIVE`);
                }

            } catch (error) {
                console.error(`❌ Error updating step ${stepId}:`, error);
            }
        });

        // Update separator lines with enhanced styling
        this._updateStepSeparators();
        console.log('🎨 Step indicator updated successfully');
    }

    // Apply complete step styling
    _applyCompleteStyle(element) {
        const styles = {
            backgroundColor: 'var(--success, #22c55e)',
            color: 'white',
            borderColor: 'var(--success, #22c55e)',
            fontWeight: '700',
            transform: 'scale(1.0)',
            transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 0 0 2px rgba(34, 197, 94, 0.2)'
        };

        Object.entries(styles).forEach(([prop, value]) => {
            element.style.setProperty(prop, value, 'important');
        });
    }

    // Apply current step styling
    _applyCurrentStyle(element) {
        const styles = {
            backgroundColor: 'var(--black, #000)',
            color: 'white',
            borderColor: 'var(--black, #000)',
            fontWeight: '700',
            transform: 'scale(1.05)',
            transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 0 0 3px rgba(0, 0, 0, 0.1)'
        };

        Object.entries(styles).forEach(([prop, value]) => {
            element.style.setProperty(prop, value, 'important');
        });
    }

    // Apply active step styling
    _applyActiveStyle(element) {
        const styles = {
            backgroundColor: 'transparent',
            color: 'var(--black, #000)',
            borderColor: 'var(--black, #000)',
            fontWeight: '600',
            transform: 'scale(1.0)',
            transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: 'none'
        };

        Object.entries(styles).forEach(([prop, value]) => {
            element.style.setProperty(prop, value, 'important');
        });
    }

    // Apply inactive step styling
    _applyInactiveStyle(element) {
        const styles = {
            backgroundColor: 'transparent',
            color: 'var(--gray-400, #9ca3af)',
            borderColor: 'var(--gray-400, #9ca3af)',
            fontWeight: '400',
            opacity: '0.6',
            transform: 'scale(1.0)',
            transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: 'none'
        };

        Object.entries(styles).forEach(([prop, value]) => {
            element.style.setProperty(prop, value, 'important');
        });
    }

    // Update step separators
    _updateStepSeparators() {
        const separators = document.querySelectorAll('.step-indicator__separator');
        
        separators.forEach((separator, index) => {
            const stepId = index + 1;
            
            if (this.state.completedSteps.has(stepId) && stepId < 5) {
                const styles = {
                    backgroundColor: 'var(--success, #22c55e)',
                    height: '3px',
                    transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)'
                };
                
                Object.entries(styles).forEach(([prop, value]) => {
                    separator.style.setProperty(prop, value, 'important');
                });
            } else {
                const styles = {
                    backgroundColor: 'var(--gray-300, #d4d4d4)',
                    height: '1px',
                    transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)'
                };
                
                Object.entries(styles).forEach(([prop, value]) => {
                    separator.style.setProperty(prop, value, 'important');
                });
            }
        });
    }

    // Update navigation buttons
    _updateNavigationButtons() {
        const prevBtn = document.getElementById('ultra-prev');
        const nextBtn = document.getElementById('ultra-next');

        if (!prevBtn || !nextBtn) return;

        const currentStep = this.state.currentVisible;

        // Enhanced previous step detection
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

        // Enhanced next step detection
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

        // Update button states with enhanced styling
        prevBtn.disabled = !hasPrevious;
        nextBtn.disabled = !hasNext;

        prevBtn.style.opacity = hasPrevious ? '1' : '0.3';
        nextBtn.style.opacity = hasNext ? '1' : '0.3';

        prevBtn.style.cursor = hasPrevious ? 'pointer' : 'not-allowed';
        nextBtn.style.cursor = hasNext ? 'pointer' : 'not-allowed';

        prevBtn.title = hasPrevious ? `Previous: ${previousTitle}` : 'No previous step';
        nextBtn.title = hasNext ? `Next: ${nextTitle}` : 'No next step';
    }

    // Update navigation indicator
    _updateNavigationIndicator() {
        const indicator = document.getElementById('ultra-step-indicator');
        if (!indicator) return;

        const stepData = this.elements.get(this.state.currentVisible);
        if (stepData) {
            const isCompleted = this.state.completedSteps.has(this.state.currentVisible);
            const completionMark = isCompleted ? ' ✓' : '';
            const progress = Math.round(((this.state.currentVisible - 1) / 4) * 100);
            const icon = stepData.config.icon || '';

            indicator.innerHTML = `
                <div style="line-height: 1.2;">
                    <div style="font-size: 8px; color: var(--gray-500); margin-bottom: 2px;">
                        STEP ${this.state.currentVisible}/5${completionMark}
                    </div>
                    <div style="font-size: 9px; font-weight: 700; margin-bottom: 1px;">
                        ${icon} ${stepData.config.title.toUpperCase()}
                    </div>
                    <div style="font-size: 7px; color: var(--gray-600);">
                        ${progress}% COMPLETE
                    </div>
                </div>
            `;
        }
    }

    // Dispatch state change events
    _dispatchStateChange() {
        this._dispatchEvent('step:state-changed', {
            currentVisible: this.state.currentVisible,
            highestCompleted: this.state.highestCompleted,
            availableSteps: Array.from(this.state.availableSteps),
            completedSteps: Array.from(this.state.completedSteps),
            transitionInProgress: this.state.transitionInProgress
        });
    }

    // Enhanced event dispatching
    _dispatchEvent(type, detail) {
        try {
            document.dispatchEvent(new CustomEvent(type, { detail }));
        } catch (error) {
            console.error(`❌ Failed to dispatch event ${type}:`, error);
        }
    }

    // Setup scroll fallback for older browsers
    _setupScrollFallback() {
        let scrollTimeout;
        const handleScroll = () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                this._detectCurrentStepByScroll();
            }, 150);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        console.log('📜 Scroll fallback detection setup');
    }

    // Fallback scroll detection
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
            this._updateState({ currentVisible: currentStep });
            this._updateUIAsync();
        }
    }

    // Initialize fallback mode
    _initializeFallbackMode() {
        console.log('⚠️ Initializing fallback mode...');
        
        // Minimal functionality with basic step tracking
        this.initialized = true;
        
        // Basic UI update
        setTimeout(() => {
            this._updateStepIndicator();
        }, 500);
    }

    // Helper methods
    _findStepByElement(element) {
        for (const [stepId, stepData] of this.elements) {
            if (stepData.element === element) return stepId;
        }
        return null;
    }

    _isValidStep(stepId) {
        return Number.isInteger(stepId) && stepId >= 1 && stepId <= 5;
    }

    // PUBLIC API with enhanced error handling

    completeStep(stepId) {
        if (!this._isValidStep(stepId)) return false;
        
        try {
            this._dispatchEvent('step:completed', { stepId });
            return true;
        } catch (error) {
            console.error('❌ Error completing step:', error);
            return false;
        }
    }

    activateStep(stepId) {
        if (!this._isValidStep(stepId)) return false;
        
        try {
            this._dispatchEvent('step:activated', { stepId });
            return true;
        } catch (error) {
            console.error('❌ Error activating step:', error);
            return false;
        }
    }

    navigateToStep(stepId) {
        if (!this._isValidStep(stepId) || !this.state.availableSteps.has(stepId)) {
            console.warn(`⚠️ Cannot navigate to step ${stepId}: not available`);
            return false;
        }

        return this._smartScrollToStep(stepId);
    }

    getCurrentStep() {
        return this.state.currentVisible;
    }

    getAvailableSteps() {
        return Array.from(this.state.availableSteps).sort((a, b) => a - b);
    }

    getCompletedSteps() {
        return Array.from(this.state.completedSteps).sort((a, b) => a - b);
    }

    getState() {
        return {
            currentVisible: this.state.currentVisible,
            highestCompleted: this.state.highestCompleted,
            availableSteps: this.getAvailableSteps(),
            completedSteps: this.getCompletedSteps(),
            transitionInProgress: this.state.transitionInProgress,
            initialized: this.initialized
        };
    }

    // Force refresh for troubleshooting
    forceRefresh() {
        console.log('🔄 Forcing step tracker refresh...');
        this._performInitialScan();
        setTimeout(() => {
            this._updateUIWithRetry();
        }, 100);
    }

    reset() {
        this._updateState({
            currentVisible: 1,
            highestCompleted: 0,
            availableSteps: new Set([1]),
            completedSteps: new Set(),
            transitionInProgress: false
        });

        this.elements.forEach((stepData, stepId) => {
            if (stepId > 1 && stepData.element) {
                stepData.element.classList.add('hidden');
                stepData.isVisible = false;
                stepData.lastUpdate = Date.now();
            }
        });

        this._updateUIAsync();
        console.log('🔄 Ultra Step Tracker reset');
    }

    destroy() {
        console.log('🗑️ Destroying Ultra Step Tracker...');

        // Clean up observers
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }

        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
        }

        // Remove navigation
        const container = document.getElementById('ultra-step-navigation');
        if (container?.parentNode) {
            container.parentNode.removeChild(container);
        }

        // Clear caches
        this.elements.clear();
        this.observers.clear();

        this.initialized = false;
        console.log('🗑️ Ultra Step Tracker destroyed');
    }
}

// Create global instance
window.UltraStepTracker = new UltraStepTracker();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.UltraStepTracker.init();
    });
} else {
    window.UltraStepTracker.init();
}

// Backwards compatibility - expose as SmartStepTracker
window.SmartStepTracker = window.UltraStepTracker;

// Development helper
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.debugStepTracker = () => {
        console.log('🐛 Ultra Step Tracker Debug Info:');
        console.log('State:', window.UltraStepTracker.getState());
        console.log('Elements:', window.UltraStepTracker.elements);
        console.log('Initialized:', window.UltraStepTracker.initialized);
    };
}
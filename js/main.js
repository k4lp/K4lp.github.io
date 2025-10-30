/**
 * GDRS Main Bootstrap - Streamlined Modular Architecture
 * Clean entry point with event-driven initialization
 */

// Core modules
import { boot } from './core/boot.js';
import { VERSION } from './core/constants.js';
import { AsyncDetector } from './core/async-detector.js';
import { eventBus, Events } from './core/event-bus.js';
import { ExtensionPoints, Registry } from './core/extension-points.js';
import { Interfaces } from './core/interfaces.js';

// Storage layer
import { Storage } from './storage/storage.js';
import { VaultManager } from './storage/vault-manager.js';

// API layer  
import { KeyManager } from './api/key-manager.js';
import { GeminiAPI } from './api/gemini-client.js';

// Reasoning layer
import { ReasoningParser } from './reasoning/reasoning-parser.js';
import { ReasoningEngine } from './reasoning/reasoning-engine.js';

// Execution layer
import { JSExecutor } from './execution/js-executor.js';
import { CodeExecutor } from './execution/code-executor.js';

// Control layer
import { LoopController } from './control/loop-controller.js';

// UI layer
import { Renderer } from './ui/renderer.js';
import { bindEvents } from './ui/events.js';

/**
 * Self-executing bootstrap with clean module organization
 */
(function() {
  'use strict';

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGDRS);
  } else {
    initializeGDRS();
  }

  /**
   * Main initialization function
   */
  function initializeGDRS() {
    console.log('%cGDRS v' + VERSION + ' - Streamlined Modular Architecture', 'color: #00ff00; font-weight: bold;');
    
    // Create global GDRS namespace
    window.GDRS = {
      // Version info
      VERSION,

      // Core modules
      AsyncDetector,
      eventBus,
      Events,
      ExtensionPoints,
      Registry,
      Interfaces,
      
      // Storage layer (2 modules)
      Storage,
      VaultManager,
      
      // API layer (2 modules)
      KeyManager,
      GeminiAPI,
      
      // Reasoning layer (2 modules)
      ReasoningParser,
      ReasoningEngine,
      
      // Execution layer (2 modules)
      JSExecutor,
      CodeExecutor,
      
      // Control layer (1 module)
      LoopController,
      
      // UI layer (2 modules + events)
      Renderer,
      bindEvents,
      
      // Initialization
      boot,
      
      // Runtime state
      currentIteration: 0
    };
    
    // Initialize renderer with event bus
    Renderer.init();
    
    // Run boot sequence
    boot();
    
    console.log('%c\u2705 GDRS Initialized - Modular Architecture Ready', 'color: #00aa00; font-weight: bold;');
    console.log('%c\ud83d\udce6 Core Modules: 14 loaded | Parser: 4 sub-modules', 'color: #0066ff;');
    console.log('%c\ud83d\udd0c Extension Points: Ready for custom implementations', 'color: #ff6600;');
    console.log('%c\ud83d\udce1 Event-driven updates enabled for maximum modularity', 'color: #9966ff;');
  }
  
  /**
   * Development helpers
   */
  if (typeof window !== 'undefined') {
    window.GDRS_DEBUG = {
      enableEventDebug: () => eventBus.setDebugMode(true),
      disableEventDebug: () => eventBus.setDebugMode(false),
      listEvents: () => eventBus.getRegisteredEvents(),
      clearAllData: () => {
        if (confirm('Clear all GDRS data? This cannot be undone.')) {
          Object.values(LS_KEYS).forEach(key => localStorage.removeItem(key));
          location.reload();
        }
      }
    };
  }
  
})();

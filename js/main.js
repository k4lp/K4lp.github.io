/**
 * GDRS Main Bootstrap
 * Modular main entry point - coordinates all modules
 * Version 1.1.4 - Now fully modular and maintainable!
 */

// Import core modules
import { boot } from './core/boot.js';
import { VERSION } from './core/constants.js';

// Import all modules for global access
import { Storage } from './storage/storage.js';
import { VaultManager } from './storage/vault-manager.js';
import { KeyManager } from './api/key-manager.js';
import { GeminiAPI } from './api/gemini-client.js';
import { ReasoningParser } from './reasoning/reasoning-parser.js';
import { ReasoningEngine } from './reasoning/reasoning-engine.js';
import { JSExecutor } from './execution/js-executor.js';
import { CodeExecutor } from './execution/code-executor.js';
import { LoopController } from './control/loop-controller.js';
import { Renderer } from './ui/renderer.js';
import { bindEvents } from './ui/events.js';

// Self-executing anonymous function to avoid global pollution
(function() {
  'use strict';

  // Boot when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // Export to global scope for debugging (maintains backward compatibility)
  if (typeof window !== 'undefined') {
    window.GDRS = window.GDRS || {};
    Object.assign(window.GDRS, {
      VERSION,
      Storage,
      VaultManager,
      KeyManager,
      GeminiAPI,
      ReasoningParser,
      ReasoningEngine,
      JSExecutor,
      CodeExecutor,
      LoopController,
      Renderer,
      bindEvents,
      boot
    });
  }

  console.log('%cGDRS v' + VERSION + ' - Modular Architecture Loaded', 'color: #00ff00; font-weight: bold;');
  console.log('%c✅ All 14 modules loaded successfully!', 'color: #00aa00;');
  console.log('%c📁 Module structure: core(3) + storage(2) + api(2) + reasoning(2) + execution(2) + ui(3) + control(1)', 'color: #0066ff;');
})();

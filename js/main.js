/**
 * GDRS Main Bootstrap - Streamlined Modular Architecture
 * Clean entry point with event-driven initialization and centralized provider loading
 */

// ==========================================
// CORE MODULES
// ==========================================
import { boot } from './core/boot.js';
import { VERSION } from './core/constants.js';
import { eventBus, Events } from './core/event-bus.js';
import { ExtensionPoints, Registry } from './core/extension-points.js';
import { Interfaces } from './core/interfaces.js';

// Provider system
import { ProviderRegistry } from './core/provider-registry.js';
import { ProviderLoader } from './core/provider-loader.js';
import { PROVIDER_MANIFEST } from './core/provider-manifest.js';

// ==========================================
// STORAGE LAYER
// ==========================================
import { Storage } from './storage/storage.js';
import { VaultManager } from './storage/vault-manager.js';
import { storageProviderManager } from './storage/providers/storage-provider-manager.js';

// ==========================================
// API LAYER
// ==========================================
import { KeyManager } from './api/key-manager.js';
import { GeminiAPI } from './api/gemini-client.js';

// ==========================================
// REASONING LAYER
// ==========================================
import { ReasoningParser } from './reasoning/reasoning-parser.js';
import { ReasoningEngine } from './reasoning/reasoning-engine.js';

// ==========================================
// EXECUTION LAYER
// ==========================================
import { JSExecutor } from './execution/js-executor.js';
import { CodeExecutor } from './execution/code-executor.js';

// ==========================================
// CONTROL LAYER
// ==========================================
import { LoopController } from './control/loop-controller.js';

// ==========================================
// UI LAYER
// ==========================================
import { Renderer } from './ui/renderer.js';
import { bindEvents } from './ui/events.js';
import { getModularInitialization } from './core/modular-system-init.js';
import { ExcelRuntimeStore } from './excel/core/excel-store.js';
import { SubAgentUI } from './ui/subagent-ui.js';

// ==========================================
// SUB-AGENT SYSTEM
// ==========================================
import { SubAgentOrchestrator } from './subagent/sub-agent-orchestrator.js';
import WebTools from './subagent/tools/web-tools.js';

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
  async function initializeGDRS() {
    console.log('%cGDRS v' + VERSION + ' - Streamlined Modular Architecture', 'color: #00ff00; font-weight: bold;');

    await getModularInitialization();

    // ==========================================
    // PHASE 1: Load Providers from Manifest
    // ==========================================
    console.log('%cLoading providers from manifest...', 'color: #00aaff;');

    const loadResults = await ProviderLoader.loadFromManifest(PROVIDER_MANIFEST);

    console.log(
      `%cProviders loaded: ${loadResults.loaded.length} successful, ` +
      `${loadResults.skipped.length} skipped, ${loadResults.failed.length} failed`,
      'color: #00aa00;'
    );

    if (loadResults.failed.length > 0) {
      console.warn('Failed to load providers:', loadResults.failed);
    }

    // ==========================================
    // PHASE 2: Initialize Storage Manager
    // ==========================================
    const defaultStorageProvider = PROVIDER_MANIFEST.defaults[ExtensionPoints.STORAGE_PROVIDERS];
    storageProviderManager.initialize(defaultStorageProvider);

    // ==========================================
    // PHASE 3: Create Global GDRS Namespace
    // ==========================================
    window.GDRS = {
      // Version info
      VERSION,

      // Core modules
      eventBus,
      Events,
      ExtensionPoints,
      Registry,
      Interfaces,

      // Provider system (new!)
      ProviderRegistry,
      ProviderLoader,
      PROVIDER_MANIFEST,

      // Storage layer
      Storage,
      VaultManager,
      storageProviderManager,

      // API layer
      KeyManager,
      GeminiAPI,

      // Reasoning layer
      ReasoningParser,
      ReasoningEngine,

      // Execution layer
      JSExecutor,
      CodeExecutor,

      // Control layer
      LoopController,

      // UI layer
      Renderer,
      bindEvents,
      attachments: ExcelRuntimeStore,

      // Sub-agent system
      SubAgentOrchestrator,
      WebTools,

      // Initialization
      boot,

      // Runtime state
      currentIteration: 0
    };

    // ==========================================
    // PHASE 4: Initialize UI and Boot
    // ==========================================
    // Initialize renderer with event bus
    Renderer.init();
    bindEvents();

    // Initialize Sub-Agent UI
    console.log('%cInitializing Sub-Agent System...', 'color: #00aaff;');
    const subAgentUI = new SubAgentUI();
    window.GDRS.SubAgentUI = subAgentUI;
    console.log('%cSub-Agent UI initialized', 'color: #00aa00;');

    // Run boot sequence
    boot();

    // ==========================================
    // PHASE 5: Report Success
    // ==========================================
    const stats = ProviderRegistry.getStats();
    const totalProviders = stats.totals.registered;

    console.log('%cGDRS Initialized - Modular Architecture Ready', 'color: #00aa00; font-weight: bold;');
    console.log(`%cCore Modules: 15 loaded | Providers: ${totalProviders} registered`, 'color: #0066ff;');
    console.log('%cExtension Points: 8 defined, ready for custom implementations', 'color: #ff6600;');
    console.log('%cEvent-driven updates enabled for maximum modularity', 'color: #9966ff;');
    console.log('%cProvider system: Centralized, declarative, extensible', 'color: #ff9900;');
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
          Storage.clearAll();
          location.reload();
        }
      },
      // New provider debugging tools
      providerStats: () => ProviderRegistry.getStats(),
      loadingStats: () => ProviderLoader.getStats(),
      listProviders: (extensionPoint) => ProviderRegistry.listProviders(extensionPoint),
      enableProviderDebug: () => {
        ProviderRegistry.enableDebug();
        ProviderLoader.enableDebug();
      },
      disableProviderDebug: () => {
        ProviderRegistry.disableDebug();
        ProviderLoader.disableDebug();
      },
      // Sub-agent debugging tools
      runSubAgent: async (agentId, query, options) => {
        console.log(`Running sub-agent: ${agentId}`);
        const result = await SubAgentOrchestrator.runSubAgent(agentId, query, options);
        console.log('Sub-agent result:', result);
        return result;
      },
      listSubAgents: () => {
        return SubAgentOrchestrator.getAvailableAgents();
      },
      toggleSubAgentUI: () => {
        if (window.GDRS.SubAgentUI) {
          window.GDRS.SubAgentUI.toggle();
        }
      },
      enableSubAgents: () => {
        Storage.saveSubAgentEnabled(true);
        console.log('Sub-agents enabled');
      },
      disableSubAgents: () => {
        Storage.saveSubAgentEnabled(false);
        console.log('Sub-agents disabled');
      }
    };
  }

})();

/**
 * Gemini Multi-Talk — application bootstrap.
 * Wires key manager, catalogue, conversation engine, and UI.
 * @module app
 */

import { EVENTS, STORAGE_KEYS, APP_NAME, APP_VERSION } from './config/constants.js';
import { createDefaultSettings } from './config/defaults.js';
import { bus } from './core/event-bus.js';
import { storage } from './core/storage.js';
import { KeyManager } from './core/key-manager.js';
import { GeminiClient } from './core/gemini-client.js';
import { ModelCatalogue } from './core/model-catalogue.js';
import { ConversationEngine } from './core/conversation-engine.js';
import {
  exportSessionJSON,
  exportSessionMarkdown,
  exportChatOnly,
  exportReasoning,
  exportEventLog,
} from './core/export.js';
import { mountChatView } from './ui/chat-view.js';
import { mountEventLog } from './ui/event-log-view.js';
import { initSettingsPanel } from './ui/settings-panel.js';
import { initToast } from './ui/toast.js';
import { $ } from './utils/dom.js';

function loadSettings() {
  const saved = storage.get(STORAGE_KEYS.SETTINGS, null);
  const base = createDefaultSettings();
  if (!saved) return base;
  return {
    ...base,
    ...saved,
    candidates: Array.isArray(saved.candidates) && saved.candidates.length >= 3
      ? saved.candidates
      : base.candidates,
  };
}

function saveSettings(settings) {
  // never put raw keys in settings blob
  const { ...rest } = settings;
  storage.set(STORAGE_KEYS.SETTINGS, rest);
}

async function main() {
  document.title = `${APP_NAME} v${APP_VERSION}`;
  const versionEl = $('#app-version');
  if (versionEl) versionEl.textContent = `v${APP_VERSION}`;

  initToast();

  let settings = loadSettings();
  const getSettings = () => settings;
  const setSettings = (s) => {
    settings = s;
    saveSettings(settings);
  };

  const keyManager = new KeyManager({
    strategy: settings.rotationStrategy,
    rateLimitCooldownMs: settings.rateLimitCooldownMs,
    maxKeyFailures: settings.maxKeyFailures,
  });
  if (settings.persistKeys) keyManager.restore();

  const client = new GeminiClient(keyManager, { maxRetries: settings.maxRetriesPerTurn ?? 4 });
  const catalogue = new ModelCatalogue(client);
  const engine = new ConversationEngine({ client, getSettings });

  const chatView = mountChatView('#chat-stream', {
    autoScroll: () => !!getSettings().autoScroll,
  });
  const eventLog = mountEventLog('#event-log');

  const settingsUi = initSettingsPanel({
    keyManager,
    catalogue,
    getSettings,
    setSettings,
    onSave: () => {
      keyManager.configure({
        strategy: settings.rotationStrategy,
        rateLimitCooldownMs: settings.rateLimitCooldownMs,
      });
      updateHud();
    },
  });

  // Controls
  const btnStart = $('#btn-start');
  const btnPause = $('#btn-pause');
  const btnStop = $('#btn-stop');
  const statusPill = $('#session-status');

  function setRunningUi(running) {
    if (btnStart) btnStart.disabled = running;
    if (btnPause) btnPause.disabled = !running && engine.state !== 'paused';
    if (btnStop) btnStop.disabled = engine.state === 'idle' || engine.state === 'complete';
  }

  function updateHud() {
    const sum = keyManager.summary();
    const keysHud = $('#hud-keys');
    if (keysHud) keysHud.textContent = `${sum.healthy}/${sum.total} keys`;
    const turnsHud = $('#hud-turns');
    if (turnsHud) {
      turnsHud.textContent = `${engine.completedTurns}/${settings.maxTurns} turns`;
    }
    if (statusPill) {
      statusPill.textContent = engine.state;
      statusPill.dataset.state = engine.state;
    }
  }

  bus.on('*', () => updateHud());

  btnStart?.addEventListener('click', async () => {
    if (!keyManager.list().length) {
      bus.emit(EVENTS.TOAST, {
        message: 'Add Gemini API keys in Settings first',
        level: 'warn',
      });
      settingsUi.open();
      return;
    }
    try {
      setRunningUi(true);
      // Try catalogue refresh if empty (non-blocking fail)
      if (!catalogue.models.length) {
        catalogue.refresh().then(() => settingsUi.renderCandidates()).catch(() => {});
      }
      await engine.start();
    } catch (err) {
      bus.emit(EVENTS.TOAST, { message: err.message, level: 'error' });
      bus.log(err.message, 'error');
    } finally {
      setRunningUi(false);
      updateHud();
    }
  });

  btnPause?.addEventListener('click', () => {
    if (engine.state === 'running') {
      engine.pause();
      btnPause.textContent = 'Resume';
    } else if (engine.state === 'paused') {
      engine.resume();
      btnPause.textContent = 'Pause';
    }
    updateHud();
  });

  btnStop?.addEventListener('click', () => {
    engine.stop();
    btnPause.textContent = 'Pause';
    setRunningUi(false);
    updateHud();
  });

  // Export menu
  $('#btn-export-json')?.addEventListener('click', () => {
    exportSessionJSON(engine.transcript, {
      settings: {
        candidates: settings.candidates,
        maxTurns: settings.maxTurns,
        seedTopic: settings.seedTopic,
      },
      events: bus.getLog(),
    });
  });
  $('#btn-export-md')?.addEventListener('click', () => exportSessionMarkdown(engine.transcript));
  $('#btn-export-chat')?.addEventListener('click', () => exportChatOnly(engine.transcript));
  $('#btn-export-reasoning')?.addEventListener('click', () => exportReasoning(engine.transcript));
  $('#btn-export-events')?.addEventListener('click', () => exportEventLog(bus.getLog()));

  $('#btn-clear-log')?.addEventListener('click', () => eventLog.clear());

  // Tabs: chat / observer
  $$tabs();

  updateHud();
  bus.log(`${APP_NAME} ready`, 'info');

  // Expose for console debugging / observation
  window.GMT = {
    bus,
    keyManager,
    client,
    catalogue,
    engine,
    getSettings,
    version: APP_VERSION,
  };
}

function $$tabs() {
  const tabs = document.querySelectorAll('[data-tab]');
  const panes = document.querySelectorAll('[data-pane]');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const id = tab.getAttribute('data-tab');
      tabs.forEach((t) => t.classList.toggle('active', t === tab));
      panes.forEach((p) => p.classList.toggle('active', p.getAttribute('data-pane') === id));
    });
  });
}

main().catch((err) => {
  console.error(err);
  bus.emit(EVENTS.TOAST, { message: err.message, level: 'error' });
});

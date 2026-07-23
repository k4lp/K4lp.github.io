/**
 * OpenAI Chat Lab — bootstrap.
 * Modular: keys · client · stream · network · chat session · UI.
 * @module app
 */

import { APP_NAME, APP_VERSION, EVENTS, STORAGE_KEYS } from './config/constants.js';
import { createDefaultSettings } from './config/defaults.js';
import { bus } from './core/event-bus.js';
import { storage } from './core/storage.js';
import { KeyManager } from './core/key-manager.js';
import { OpenAIClient } from './core/openai-client.js';
import { ModelCatalogue } from './core/model-catalogue.js';
import { NetworkMonitor } from './core/network-monitor.js';
import { ChatSession } from './core/chat-session.js';
import { exportChatJSON, exportChatMarkdown, exportEventLog } from './core/export.js';
import { mountChatView } from './ui/chat-view.js';
import { initSettingsPanel } from './ui/settings-panel.js';
import { initNetworkStatus } from './ui/network-status.js';
import { initToast } from './ui/toast.js';
import { $, el, clear } from './utils/dom.js';
import { formatDuration } from './utils/time.js';

function loadSettings() {
  const saved = storage.get(STORAGE_KEYS.SETTINGS, null);
  const base = createDefaultSettings();
  if (!saved) return base;
  return { ...base, ...saved };
}

function saveSettings(settings) {
  storage.set(STORAGE_KEYS.SETTINGS, settings);
}

async function main() {
  document.title = `${APP_NAME} v${APP_VERSION}`;
  const ver = $('#app-version');
  if (ver) ver.textContent = `v${APP_VERSION}`;

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

  const network = new NetworkMonitor({
    getApiBase: () => getSettings().apiBase,
    getKeyManager: () => keyManager,
    getIntervalMs: () => getSettings().netProbeIntervalMs,
  });

  const client = new OpenAIClient(keyManager, {
    getSettings,
    network,
    maxRetries: settings.maxRetries ?? 4,
  });

  const catalogue = new ModelCatalogue(client);
  const session = new ChatSession({ client, getSettings });

  const chatView = mountChatView('#chat-stream', {
    autoScroll: () => !!getSettings().autoScroll,
  });

  // Event log pane
  const eventLog = $('#event-log');
  bus.on('*', (evt) => {
    if (!eventLog || evt.type === 'toast') return;
    const row = el('div', { className: `elog-row level-${evt.level || 'info'}` }, [
      el('span', { className: 'elog-type mono', text: evt.type }),
      el('span', {
        className: 'elog-payload',
        text: summarize(evt.payload),
      }),
    ]);
    eventLog.appendChild(row);
    while (eventLog.children.length > 400) eventLog.removeChild(eventLog.firstChild);
    eventLog.scrollTop = eventLog.scrollHeight;
  });

  const settingsUi = initSettingsPanel({
    keyManager,
    catalogue,
    getSettings,
    setSettings,
    onSave: (s) => {
      network.schedule();
      updateHud();
      // sync composer model label
      const m = $('#composer-model');
      if (m) m.textContent = s.model;
    },
    onKeysApplied: () => {
      network.probe({ reason: 'keys-applied' });
      catalogue.refresh().then(() => settingsUi.fillModelSelect()).catch(() => {});
    },
  });

  initNetworkStatus('#net-status', {
    onProbe: () => network.probe({ reason: 'manual' }),
  });
  network.start();

  // Tabs
  document.querySelectorAll('[data-tab]').forEach((tab) => {
    tab.addEventListener('click', () => {
      const id = tab.getAttribute('data-tab');
      document.querySelectorAll('[data-tab]').forEach((t) => t.classList.toggle('active', t === tab));
      document.querySelectorAll('[data-pane]').forEach((p) => {
        p.classList.toggle('active', p.getAttribute('data-pane') === id);
      });
    });
  });

  // Composer
  const input = $('#composer-input');
  const btnSend = $('#btn-send');
  const btnStop = $('#btn-stop');

  async function doSend() {
    const text = input?.value || '';
    if (!text.trim()) return;
    if (!keyManager.list().length) {
      bus.emit(EVENTS.TOAST, { message: 'Add OpenAI API keys in Settings', level: 'warn' });
      settingsUi.open();
      return;
    }
    input.value = '';
    autoGrow(input);
    setBusy(true);
    try {
      await session.send(text);
    } catch (err) {
      bus.emit(EVENTS.TOAST, { message: err.message, level: 'error' });
    } finally {
      setBusy(false);
      updateHud();
      input?.focus();
    }
  }

  function setBusy(busy) {
    if (btnSend) btnSend.disabled = busy;
    if (btnStop) btnStop.disabled = !busy;
    if (input) input.disabled = busy;
  }

  btnSend?.addEventListener('click', doSend);
  btnStop?.addEventListener('click', () => {
    session.abort();
    setBusy(false);
  });

  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      doSend();
    }
  });
  input?.addEventListener('input', () => autoGrow(input));

  $('#btn-new-chat')?.addEventListener('click', () => {
    if (session.messages.length && !confirm('Clear this chat?')) return;
    session.reset();
    updateHud();
  });

  $('#btn-export-json')?.addEventListener('click', () =>
    exportChatJSON(session, { settings: pickExportSettings(settings) })
  );
  $('#btn-export-md')?.addEventListener('click', () => exportChatMarkdown(session));
  $('#btn-export-events')?.addEventListener('click', () => exportEventLog());
  $('#btn-clear-log')?.addEventListener('click', () => {
    if (eventLog) clear(eventLog);
    bus.clearLog();
  });

  // Quick model + stream toggles on composer bar
  const streamToggle = $('#opt-stream-quick');
  if (streamToggle) {
    streamToggle.checked = settings.stream !== false;
    streamToggle.addEventListener('change', () => {
      settings.stream = streamToggle.checked;
      saveSettings(settings);
      updateHud();
    });
  }

  function updateHud() {
    const sum = keyManager.summary();
    const keysHud = $('#hud-keys');
    if (keysHud) keysHud.textContent = `${sum.healthy}/${sum.total} keys`;
    const modelHud = $('#hud-model');
    if (modelHud) modelHud.textContent = settings.model;
    const streamHud = $('#hud-stream');
    if (streamHud) streamHud.textContent = settings.stream !== false ? 'stream on' : 'stream off';
    const msgHud = $('#hud-msgs');
    if (msgHud) msgHud.textContent = `${session.messages.length} msgs`;
    const m = $('#composer-model');
    if (m) m.textContent = settings.model;
  }

  bus.on(EVENTS.NET_STATUS, () => updateHud());
  bus.on(EVENTS.STREAM_END, (e) => {
    const lat = e.payload?.totalMs;
    if (lat != null) {
      const el = $('#hud-latency');
      if (el) el.textContent = formatDuration(lat);
    }
  });

  updateHud();
  bus.log(`${APP_NAME} ready`, 'info');

  // Warm catalogue if keys present
  if (keyManager.list().length) {
    catalogue.refresh().then(() => settingsUi.fillModelSelect()).catch(() => {});
  }

  window.OAI = {
    bus,
    keyManager,
    client,
    catalogue,
    network,
    session,
    getSettings,
    version: APP_VERSION,
  };
}

function autoGrow(textarea) {
  if (!textarea) return;
  textarea.style.height = 'auto';
  textarea.style.height = Math.min(200, textarea.scrollHeight) + 'px';
}

function summarize(payload) {
  if (payload == null) return '';
  if (typeof payload === 'string') return payload;
  try {
    const s = JSON.stringify(payload);
    return s.length > 160 ? s.slice(0, 160) + '…' : s;
  } catch {
    return String(payload);
  }
}

function pickExportSettings(s) {
  return {
    model: s.model,
    temperature: s.temperature,
    topP: s.topP,
    maxCompletionTokens: s.maxCompletionTokens,
    stream: s.stream,
    systemPrompt: s.systemPrompt,
    responseFormat: s.responseFormat,
    reasoningEffort: s.reasoningEffort,
  };
}

main().catch((err) => {
  console.error(err);
  bus.emit(EVENTS.TOAST, { message: err.message, level: 'error' });
});

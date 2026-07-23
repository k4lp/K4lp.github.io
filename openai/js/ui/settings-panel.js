/**
 * Settings: keys, endpoint, full Chat Completions controls, system prompt.
 * @module ui/settings-panel
 */

import { $, $$, el, clear } from '../utils/dom.js';
import { bus } from '../core/event-bus.js';
import { EVENTS, ROTATION_STRATEGY, FALLBACK_MODEL } from '../config/constants.js';
import {
  createDefaultSettings,
  getDefaultSystemPrompt,
  resetSettingsToDefaults,
} from '../config/defaults.js';

/**
 * @param {object} deps
 */
export function initSettingsPanel(deps) {
  const panel = $('#settings-panel');
  const backdrop = $('#settings-backdrop');

  function open() {
    syncFromState();
    panel?.classList.add('open');
    backdrop?.classList.add('open');
  }
  function close() {
    panel?.classList.remove('open');
    backdrop?.classList.remove('open');
  }

  $('#btn-settings')?.addEventListener('click', open);
  $('#btn-settings-close')?.addEventListener('click', close);
  backdrop?.addEventListener('click', close);

  const keysTextarea = $('#keys-textarea');
  const keysStatus = $('#keys-status-list');

  $('#btn-apply-keys')?.addEventListener('click', () => {
    const n = deps.keyManager.importFromText(keysTextarea.value);
    deps.keyManager.persist(deps.getSettings().persistKeys);
    bus.emit(EVENTS.TOAST, { message: `Loaded ${n} API key(s)`, level: 'info' });
    renderKeyStatus();
    deps.onKeysApplied?.();
  });

  $('#btn-reset-key-status')?.addEventListener('click', () => {
    deps.keyManager.resetAllStatuses();
    deps.keyManager.persist(deps.getSettings().persistKeys);
    renderKeyStatus();
  });

  $('#btn-refresh-models')?.addEventListener('click', async () => {
    const btn = $('#btn-refresh-models');
    try {
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Loading…';
      }
      await deps.catalogue.refresh({ force: true });
      fillModelSelect();
      bus.emit(EVENTS.TOAST, {
        message: `Models: ${deps.catalogue.models.length} from API`,
        level: 'info',
      });
    } catch (err) {
      bus.emit(EVENTS.TOAST, { message: err.message, level: 'error' });
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Refresh models';
      }
    }
  });

  bus.on(EVENTS.KEYS_UPDATED, () => renderKeyStatus());
  bus.on(EVENTS.KEY_STATUS, () => renderKeyStatus());

  function renderKeyStatus() {
    if (!keysStatus) return;
    clear(keysStatus);
    const rows = deps.keyManager.listPublic();
    if (!rows.length) {
      keysStatus.appendChild(el('p', { className: 'muted', text: 'No keys loaded.' }));
      return;
    }
    for (const k of rows) {
      const row = el('div', { className: `key-row status-${k.status}` }, [
        el('span', { className: 'mono', text: k.label }),
        el('span', { className: 'key-pill', text: k.status }),
        el('span', {
          className: 'muted',
          text: `✓${k.successCount} ✗${k.failureCount} n=${k.requestCount}`,
        }),
        el('button', {
          type: 'button',
          className: 'btn btn-xs',
          text: k.enabled ? 'Disable' : 'Enable',
          onClick: () => {
            deps.keyManager.setEnabled(k.id, !k.enabled);
            deps.keyManager.persist(deps.getSettings().persistKeys);
            renderKeyStatus();
          },
        }),
        el('button', {
          type: 'button',
          className: 'btn btn-xs',
          text: 'Reset',
          onClick: () => {
            deps.keyManager.resetStatus(k.id);
            deps.keyManager.persist(deps.getSettings().persistKeys);
            renderKeyStatus();
          },
        }),
      ]);
      if (k.lastError) {
        row.appendChild(el('div', { className: 'key-error', text: k.lastError }));
      }
      keysStatus.appendChild(row);
    }
    const sum = deps.keyManager.summary();
    const elSum = $('#keys-summary');
    if (elSum) elSum.textContent = `${sum.healthy}/${sum.total} healthy · ${sum.strategy}`;
  }

  function fillModelSelect() {
    const sel = $('#opt-model');
    if (!sel) return;
    const current = sel.value || deps.getSettings().model;
    const names = deps.catalogue.getNames();
    clear(sel);
    for (const name of names) {
      sel.appendChild(el('option', { value: name, text: name }));
    }
    if (current && !names.includes(current)) {
      sel.appendChild(el('option', { value: current, text: current }));
    }
    sel.value = current || FALLBACK_MODEL;
  }

  function readForm() {
    const s = deps.getSettings();
    s.apiBase = $('#opt-api-base')?.value?.trim() || s.apiBase;
    s.organization = $('#opt-org')?.value?.trim() || '';
    s.project = $('#opt-project')?.value?.trim() || '';
    s.model = $('#opt-model')?.value || s.model;
    s.rotationStrategy = $('#opt-rotation')?.value || ROTATION_STRATEGY.ROUND_ROBIN;
    s.rateLimitCooldownMs = (Number($('#opt-cooldown')?.value) || 60) * 1000;
    s.persistKeys = $('#opt-persist-keys')?.checked !== false;

    s.temperature = Number($('#opt-temperature')?.value);
    s.topP = Number($('#opt-top-p')?.value);
    s.presencePenalty = Number($('#opt-presence')?.value);
    s.frequencyPenalty = Number($('#opt-frequency')?.value);
    s.n = Number($('#opt-n')?.value) || 1;
    const seedRaw = $('#opt-seed')?.value;
    s.seed = seedRaw === '' || seedRaw == null ? null : Number(seedRaw);
    s.stop = $('#opt-stop')?.value || '';
    s.user = $('#opt-user')?.value || '';

    s.useMaxCompletionTokens = $('#opt-use-max-completion')?.checked !== false;
    s.maxCompletionTokens = Number($('#opt-max-completion')?.value) || 2048;
    s.maxTokens = Number($('#opt-max-tokens')?.value) || 2048;

    s.responseFormat = $('#opt-response-format')?.value || 'text';
    s.stream = $('#opt-stream')?.checked !== false;
    s.streamIncludeUsage = $('#opt-stream-usage')?.checked !== false;
    s.reasoningEffort = $('#opt-reasoning')?.value || '';
    s.logprobs = $('#opt-logprobs')?.checked === true;
    s.topLogprobs = Number($('#opt-top-logprobs')?.value) || 0;
    s.logitBiasJson = $('#opt-logit-bias')?.value || '';

    s.systemPrompt = $('#opt-system')?.value ?? s.systemPrompt;
    s.autoScroll = $('#opt-auto-scroll')?.checked !== false;
    s.netProbeIntervalMs = (Number($('#opt-probe-interval')?.value) || 30) * 1000;
    s.requestTimeoutMs = (Number($('#opt-timeout')?.value) || 120) * 1000;

    return s;
  }

  function applyLocal(s, toast) {
    deps.setSettings(s);
    deps.keyManager.configure({
      strategy: s.rotationStrategy,
      rateLimitCooldownMs: s.rateLimitCooldownMs,
    });
    deps.keyManager.persist(s.persistKeys);
    deps.onSave?.(s);
    bus.emit(EVENTS.SETTINGS_CHANGED, { settings: s });
    syncFromState();
    if (toast) bus.emit(EVENTS.TOAST, { message: toast, level: 'info' });
  }

  $('#btn-save-settings')?.addEventListener('click', () => {
    applyLocal(readForm(), 'Settings saved');
    close();
  });

  $('#btn-reset-system')?.addEventListener('click', () => {
    if ($('#opt-system')) $('#opt-system').value = getDefaultSystemPrompt();
    const s = readForm();
    s.systemPrompt = getDefaultSystemPrompt();
    applyLocal(s, 'System prompt reset');
  });

  $('#btn-reset-sampling')?.addEventListener('click', () => {
    const s = resetSettingsToDefaults(readForm(), { sampling: true });
    applyLocal(s, 'Sampling controls reset');
  });

  $('#btn-reset-all-defaults')?.addEventListener('click', () => {
    if (!confirm('Reset all controls to defaults? API keys are kept.')) return;
    const cur = readForm();
    const next = {
      ...createDefaultSettings(),
      ...resetSettingsToDefaults(cur, { all: true, preservePersistKeys: true }),
      persistKeys: cur.persistKeys,
    };
    applyLocal(next, 'Factory defaults restored (keys kept)');
  });

  function syncFromState() {
    const s = deps.getSettings();
    if (keysTextarea) keysTextarea.value = deps.keyManager.getTextBlob();
    if ($('#opt-api-base')) $('#opt-api-base').value = s.apiBase || '';
    if ($('#opt-org')) $('#opt-org').value = s.organization || '';
    if ($('#opt-project')) $('#opt-project').value = s.project || '';
    fillModelSelect();
    if ($('#opt-model') && s.model) $('#opt-model').value = s.model;
    if ($('#opt-rotation')) $('#opt-rotation').value = s.rotationStrategy;
    if ($('#opt-cooldown')) $('#opt-cooldown').value = String((s.rateLimitCooldownMs || 60000) / 1000);
    if ($('#opt-persist-keys')) $('#opt-persist-keys').checked = s.persistKeys !== false;

    if ($('#opt-temperature')) $('#opt-temperature').value = String(s.temperature ?? 0.7);
    if ($('#opt-top-p')) $('#opt-top-p').value = String(s.topP ?? 1);
    if ($('#opt-presence')) $('#opt-presence').value = String(s.presencePenalty ?? 0);
    if ($('#opt-frequency')) $('#opt-frequency').value = String(s.frequencyPenalty ?? 0);
    if ($('#opt-n')) $('#opt-n').value = String(s.n ?? 1);
    if ($('#opt-seed')) $('#opt-seed').value = s.seed == null ? '' : String(s.seed);
    if ($('#opt-stop')) $('#opt-stop').value = s.stop || '';
    if ($('#opt-user')) $('#opt-user').value = s.user || '';

    if ($('#opt-use-max-completion')) {
      $('#opt-use-max-completion').checked = s.useMaxCompletionTokens !== false;
    }
    if ($('#opt-max-completion')) {
      $('#opt-max-completion').value = String(s.maxCompletionTokens ?? 2048);
    }
    if ($('#opt-max-tokens')) $('#opt-max-tokens').value = String(s.maxTokens ?? 2048);

    if ($('#opt-response-format')) $('#opt-response-format').value = s.responseFormat || 'text';
    if ($('#opt-stream')) $('#opt-stream').checked = s.stream !== false;
    if ($('#opt-stream-usage')) $('#opt-stream-usage').checked = s.streamIncludeUsage !== false;
    if ($('#opt-reasoning')) $('#opt-reasoning').value = s.reasoningEffort || '';
    if ($('#opt-logprobs')) $('#opt-logprobs').checked = !!s.logprobs;
    if ($('#opt-top-logprobs')) $('#opt-top-logprobs').value = String(s.topLogprobs || 0);
    if ($('#opt-logit-bias')) $('#opt-logit-bias').value = s.logitBiasJson || '';

    if ($('#opt-system')) $('#opt-system').value = s.systemPrompt || '';
    if ($('#opt-auto-scroll')) $('#opt-auto-scroll').checked = s.autoScroll !== false;
    if ($('#opt-probe-interval')) {
      $('#opt-probe-interval').value = String((s.netProbeIntervalMs || 30000) / 1000);
    }
    if ($('#opt-timeout')) {
      $('#opt-timeout').value = String((s.requestTimeoutMs || 120000) / 1000);
    }

    renderKeyStatus();
  }

  renderKeyStatus();
  fillModelSelect();

  return { open, close, syncFromState, fillModelSelect, renderKeyStatus };
}

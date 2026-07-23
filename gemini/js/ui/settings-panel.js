/**
 * Settings drawer: API keys, rotation, candidates, generation, thinking.
 * @module ui/settings-panel
 */

import { $, $$, el, clear } from '../utils/dom.js';
import { ROTATION_STRATEGY, KEY_STATUS } from '../config/constants.js';
import { bus } from '../core/event-bus.js';
import { EVENTS } from '../config/constants.js';
import { uid } from '../utils/id.js';
import { FALLBACK_MODEL, CANDIDATE_COLORS } from '../config/constants.js';
import {
  createDefaultSettings,
  getDefaultCandidates,
  getDefaultHumanFrame,
  getDefaultSeedTopic,
  resetSettingsToDefaults,
} from '../config/defaults.js';

/**
 * @param {object} deps
 * @param {import('../core/key-manager.js').KeyManager} deps.keyManager
 * @param {import('../core/model-catalogue.js').ModelCatalogue} deps.catalogue
 * @param {() => object} deps.getSettings
 * @param {(s: object) => void} deps.setSettings
 * @param {() => void} deps.onSave
 */
export function initSettingsPanel(deps) {
  const panel = $('#settings-panel');
  const backdrop = $('#settings-backdrop');
  const openBtn = $('#btn-settings');
  const closeBtn = $('#btn-settings-close');

  function open() {
    syncFromState();
    panel?.classList.add('open');
    backdrop?.classList.add('open');
    panel?.setAttribute('aria-hidden', 'false');
  }
  function close() {
    panel?.classList.remove('open');
    backdrop?.classList.remove('open');
    panel?.setAttribute('aria-hidden', 'true');
  }

  openBtn?.addEventListener('click', open);
  closeBtn?.addEventListener('click', close);
  backdrop?.addEventListener('click', close);

  // Keys
  const keysTextarea = $('#keys-textarea');
  const keysStatus = $('#keys-status-list');
  const btnApplyKeys = $('#btn-apply-keys');
  const btnResetKeys = $('#btn-reset-key-status');
  const btnRefreshModels = $('#btn-refresh-models');

  btnApplyKeys?.addEventListener('click', () => {
    const n = deps.keyManager.importFromText(keysTextarea.value);
    const s = deps.getSettings();
    deps.keyManager.persist(s.persistKeys);
    bus.emit(EVENTS.TOAST, { message: `Loaded ${n} API key(s)`, level: 'info' });
    renderKeyStatus();
  });

  btnResetKeys?.addEventListener('click', () => {
    deps.keyManager.resetAllStatuses();
    deps.keyManager.persist(deps.getSettings().persistKeys);
    renderKeyStatus();
    bus.emit(EVENTS.TOAST, { message: 'Key statuses reset', level: 'info' });
  });

  btnRefreshModels?.addEventListener('click', async () => {
    try {
      btnRefreshModels.disabled = true;
      btnRefreshModels.textContent = 'Loading…';
      await deps.catalogue.refresh({ force: true });
      fillModelSelects();
      bus.emit(EVENTS.TOAST, {
        message: `Catalogue: ${deps.catalogue.models.length} models`,
        level: 'info',
      });
    } catch (err) {
      bus.emit(EVENTS.TOAST, { message: err.message, level: 'error' });
    } finally {
      btnRefreshModels.disabled = false;
      btnRefreshModels.textContent = 'Refresh model catalogue';
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
        el('span', { className: 'key-label mono', text: k.label }),
        el('span', { className: `key-pill`, text: k.status }),
        el('span', {
          className: 'key-stats muted',
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
    const summaryEl = $('#keys-summary');
    if (summaryEl) {
      summaryEl.textContent = `${sum.healthy}/${sum.total} healthy · strategy ${sum.strategy}`;
    }
  }

  // Candidates editor
  const candList = $('#candidates-list');
  const btnAddCand = $('#btn-add-candidate');

  btnAddCand?.addEventListener('click', () => {
    const s = deps.getSettings();
    const n = s.candidates.length + 1;
    s.candidates.push({
      id: uid('c'),
      name: `Speaker ${n}`,
      persona: 'A natural conversational human.',
      model: FALLBACK_MODEL,
      temperature: 0.9,
      enabled: true,
    });
    deps.setSettings(s);
    renderCandidates();
  });

  function fillModelSelects() {
    const names = deps.catalogue.getNames();
    $$('select.cand-model', candList).forEach((sel) => {
      const current = sel.value;
      clear(sel);
      const opts = names.length ? names : [FALLBACK_MODEL];
      for (const name of opts) {
        sel.appendChild(el('option', { value: name, text: name }));
      }
      if (current && opts.includes(current)) sel.value = current;
      else if (current) {
        sel.appendChild(el('option', { value: current, text: current }));
        sel.value = current;
      }
    });
  }

  function renderCandidates() {
    if (!candList) return;
    clear(candList);
    const s = deps.getSettings();
    s.candidates.forEach((c, i) => {
      const color = CANDIDATE_COLORS[i % CANDIDATE_COLORS.length];
      const card = el('div', { className: 'cand-card', style: `--speaker-color: ${color}` });

      const modelSelect = el('select', { className: 'cand-model input' });
      const names = deps.catalogue.getNames();
      const opts = names.length ? names : [c.model || FALLBACK_MODEL];
      for (const name of opts) {
        modelSelect.appendChild(el('option', { value: name, text: name }));
      }
      if (c.model && !opts.includes(c.model)) {
        modelSelect.appendChild(el('option', { value: c.model, text: c.model }));
      }
      modelSelect.value = c.model || FALLBACK_MODEL;

      card.append(
        el('div', { className: 'cand-row' }, [
          el('label', { className: 'check' }, [
            el('input', {
              type: 'checkbox',
              checked: c.enabled !== false,
              onChange: (e) => {
                c.enabled = e.target.checked;
              },
            }),
            el('span', { text: 'On' }),
          ]),
          el('input', {
            className: 'input cand-name',
            type: 'text',
            value: c.name,
            placeholder: 'Name',
            onInput: (e) => {
              c.name = e.target.value;
            },
          }),
          el('button', {
            type: 'button',
            className: 'btn btn-xs danger',
            text: 'Remove',
            onClick: () => {
              if (s.candidates.length <= 3) {
                bus.emit(EVENTS.TOAST, {
                  message: 'Keep at least 3 candidates',
                  level: 'warn',
                });
                return;
              }
              s.candidates = s.candidates.filter((x) => x.id !== c.id);
              deps.setSettings(s);
              renderCandidates();
            },
          }),
        ]),
        el('label', { className: 'field' }, [
          el('span', { text: 'Model' }),
          modelSelect,
        ]),
        el('label', { className: 'field' }, [
          el('span', { text: 'Temperature' }),
          el('input', {
            className: 'input',
            type: 'number',
            min: '0',
            max: '2',
            step: '0.05',
            value: String(c.temperature ?? 0.9),
            onInput: (e) => {
              c.temperature = Number(e.target.value);
            },
          }),
        ]),
        el('label', { className: 'field' }, [
          el('span', { text: 'Persona (human backstory)' }),
          el('textarea', {
            className: 'input cand-persona',
            rows: '3',
            text: c.persona || '',
            onInput: (e) => {
              c.persona = e.target.value;
            },
          }),
        ])
      );

      modelSelect.addEventListener('change', () => {
        c.model = modelSelect.value;
      });

      candList.appendChild(card);
    });
  }

  /**
   * Pull form fields into a settings object (does not persist).
   * Candidates are already mutated live on the settings object.
   */
  function readFormIntoSettings() {
    const s = deps.getSettings();
    s.rotationStrategy = $('#opt-rotation')?.value || ROTATION_STRATEGY.HEALTHY_FIRST;
    s.rateLimitCooldownMs = Number($('#opt-cooldown')?.value) * 1000 || 60_000;
    s.maxTurns = Number($('#opt-max-turns')?.value) || 12;
    s.interTurnDelayMs = Number($('#opt-turn-delay')?.value) || 400;
    s.maxOutputTokens = Number($('#opt-max-tokens')?.value) || 2048;
    s.topP = Number($('#opt-top-p')?.value) || 0.95;
    s.includeThoughts = $('#opt-include-thoughts')?.checked !== false;
    s.thinkingLevel = $('#opt-thinking-level')?.value || '';
    s.thinkingBudget = Number($('#opt-thinking-budget')?.value) || 0;
    s.seedTopic = $('#opt-seed')?.value || '';
    s.globalSystemAddendum = $('#opt-addendum')?.value || '';
    s.humanFrameTemplate = $('#opt-human-frame')?.value || s.humanFrameTemplate;
    s.persistKeys = $('#opt-persist-keys')?.checked !== false;
    s.autoScroll = $('#opt-auto-scroll')?.checked !== false;
    return s;
  }

  function applySettingsLocally(s, { toast, persist = true } = {}) {
    deps.setSettings(s);
    deps.keyManager.configure({
      strategy: s.rotationStrategy,
      rateLimitCooldownMs: s.rateLimitCooldownMs,
    });
    if (persist) deps.keyManager.persist(s.persistKeys);
    deps.onSave?.();
    bus.emit(EVENTS.SETTINGS_CHANGED, { settings: s });
    syncFromState();
    if (toast) bus.emit(EVENTS.TOAST, { message: toast, level: 'info' });
  }

  // --- Reset to defaults (prompts & settings stay fully editable) ---
  $('#btn-reset-seed')?.addEventListener('click', () => {
    if ($('#opt-seed')) $('#opt-seed').value = getDefaultSeedTopic();
    const s = readFormIntoSettings();
    s.seedTopic = getDefaultSeedTopic();
    applySettingsLocally(s, { toast: 'Seed topic reset to default' });
  });

  $('#btn-reset-addendum')?.addEventListener('click', () => {
    if ($('#opt-addendum')) $('#opt-addendum').value = '';
    const s = readFormIntoSettings();
    s.globalSystemAddendum = '';
    applySettingsLocally(s, { toast: 'Addendum cleared' });
  });

  $('#btn-reset-human-frame')?.addEventListener('click', () => {
    const frame = getDefaultHumanFrame();
    if ($('#opt-human-frame')) $('#opt-human-frame').value = frame;
    const s = readFormIntoSettings();
    s.humanFrameTemplate = frame;
    applySettingsLocally(s, { toast: 'Human frame reset to default' });
  });

  $('#btn-reset-candidates')?.addEventListener('click', () => {
    if (!confirm('Reset all candidates to the default Alex / Jordan / Sam personas?')) return;
    const s = readFormIntoSettings();
    s.candidates = getDefaultCandidates();
    applySettingsLocally(s, { toast: 'Candidates reset to defaults' });
  });

  $('#btn-reset-all-defaults')?.addEventListener('click', () => {
    if (
      !confirm(
        'Reset prompts, candidates, generation, and rotation to factory defaults?\n\nAPI keys will be kept.'
      )
    ) {
      return;
    }
    const current = readFormIntoSettings();
    const next = resetSettingsToDefaults(current, {
      all: true,
      preservePersistKeys: true,
    });
    // Ensure we still have a full defaults object shape
    const base = createDefaultSettings();
    applySettingsLocally({ ...base, ...next, persistKeys: current.persistKeys }, {
      toast: 'All prompts & defaults restored (keys kept)',
    });
  });

  // Save all settings from form fields
  $('#btn-save-settings')?.addEventListener('click', () => {
    const s = readFormIntoSettings();
    applySettingsLocally(s, { toast: 'Settings saved' });
    close();
  });

  function syncFromState() {
    const s = deps.getSettings();
    if (keysTextarea) keysTextarea.value = deps.keyManager.getTextBlob();
    if ($('#opt-rotation')) $('#opt-rotation').value = s.rotationStrategy;
    if ($('#opt-cooldown')) $('#opt-cooldown').value = String((s.rateLimitCooldownMs || 60000) / 1000);
    if ($('#opt-max-turns')) $('#opt-max-turns').value = String(s.maxTurns);
    if ($('#opt-turn-delay')) $('#opt-turn-delay').value = String(s.interTurnDelayMs);
    if ($('#opt-max-tokens')) $('#opt-max-tokens').value = String(s.maxOutputTokens);
    if ($('#opt-top-p')) $('#opt-top-p').value = String(s.topP);
    if ($('#opt-include-thoughts')) $('#opt-include-thoughts').checked = !!s.includeThoughts;
    if ($('#opt-thinking-level')) $('#opt-thinking-level').value = s.thinkingLevel || '';
    if ($('#opt-thinking-budget')) $('#opt-thinking-budget').value = String(s.thinkingBudget || 0);
    if ($('#opt-seed')) $('#opt-seed').value = s.seedTopic || '';
    if ($('#opt-addendum')) $('#opt-addendum').value = s.globalSystemAddendum || '';
    if ($('#opt-human-frame')) $('#opt-human-frame').value = s.humanFrameTemplate || '';
    if ($('#opt-persist-keys')) $('#opt-persist-keys').checked = s.persistKeys !== false;
    if ($('#opt-auto-scroll')) $('#opt-auto-scroll').checked = s.autoScroll !== false;
    renderKeyStatus();
    renderCandidates();
  }

  // initial
  renderKeyStatus();
  renderCandidates();

  return { open, close, syncFromState, renderCandidates, renderKeyStatus };
}

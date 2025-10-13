import { createElement, mount, qs } from './dom.js';
import { saveString, loadString } from './storage.js';
import { statusBadge, Status } from './status.js';

const KEY_DK = 'api.digikey.key';
const KEY_DK_STATUS = 'api.digikey.status';
const KEY_MOUSER = 'api.mouser.key';
const KEY_MOUSER_STATUS = 'api.mouser.status';

export function ensureSettingsOverlay(root = document.body) {
  let overlayRoot = document.getElementById('settings-overlay-root');
  if (overlayRoot) return overlayRoot;

  overlayRoot = createElement('div', { attrs: { id: 'settings-overlay-root', role: 'dialog', 'aria-modal': 'true' } });

  const backdrop = createElement('div', { classes: ['backdrop'] });
  const panel = createElement('div', { classes: ['panel'] });

  const title = createElement('h2', { text: 'Settings' });

  const form = createElement('div', { classes: ['form-grid'] });

  // Helper to build a status select control
  function buildStatusSelect(currentValue) {
    const select = createElement('select', { attrs: { class: 'input' } });
    const options = [Status.Active, Status.Inactive, Status.Error, Status.Connecting];
    for (const opt of options) {
      const o = createElement('option', { attrs: { value: opt }, text: opt.toUpperCase() });
      if (String(currentValue).toLowerCase() === opt) o.setAttribute('selected', 'selected');
      select.appendChild(o);
    }
    return select;
  }

  // Digi-Key
  const dkGroup = createElement('section', { classes: ['card'] });
  const dkBody = createElement('div', { classes: ['card-body'] });
  dkBody.append(createElement('h3', { text: 'Digi-Key API' }));
  const dkField = createElement('div', { classes: ['field'] });
  dkField.append(createElement('label', { classes: ['label'], attrs: { for: 'dk-api-key' }, text: 'API Key' }));
  const dkInput = createElement('input', { attrs: { id: 'dk-api-key', class: 'input', placeholder: 'Enter Digi-Key API Key' } });
  dkInput.value = loadString(KEY_DK, '');
  dkField.append(dkInput);
  const dkStatusRow = createElement('div', { classes: ['cluster'] });
  const dkStatusCurrent = loadString(KEY_DK_STATUS, Status.Inactive);
  let dkBadgeEl = statusBadge(dkStatusCurrent);
  const dkStatusSelect = buildStatusSelect(dkStatusCurrent);
  dkStatusSelect.addEventListener('change', () => {
    const val = dkStatusSelect.value;
    saveString(KEY_DK_STATUS, val);
    const newBadge = statusBadge(val);
    dkBadgeEl.replaceWith(newBadge);
    dkBadgeEl = newBadge;
  });
  dkStatusRow.append(
    createElement('span', { classes: ['label'], text: 'Status' }),
    dkBadgeEl,
    dkStatusSelect
  );
  dkBody.append(dkField, dkStatusRow);
  dkGroup.append(dkBody);

  // Mouser
  const moGroup = createElement('section', { classes: ['card'] });
  const moBody = createElement('div', { classes: ['card-body'] });
  moBody.append(createElement('h3', { text: 'Mouser API' }));
  const moField = createElement('div', { classes: ['field'] });
  moField.append(createElement('label', { classes: ['label'], attrs: { for: 'mo-api-key' }, text: 'API Key' }));
  const moInput = createElement('input', { attrs: { id: 'mo-api-key', class: 'input', placeholder: 'Enter Mouser API Key' } });
  moInput.value = loadString(KEY_MOUSER, '');
  moField.append(moInput);
  const moStatusRow = createElement('div', { classes: ['cluster'] });
  const moStatusCurrent = loadString(KEY_MOUSER_STATUS, Status.Inactive);
  let moBadgeEl = statusBadge(moStatusCurrent);
  const moStatusSelect = buildStatusSelect(moStatusCurrent);
  moStatusSelect.addEventListener('change', () => {
    const val = moStatusSelect.value;
    saveString(KEY_MOUSER_STATUS, val);
    const newBadge = statusBadge(val);
    moBadgeEl.replaceWith(newBadge);
    moBadgeEl = newBadge;
  });
  moStatusRow.append(
    createElement('span', { classes: ['label'], text: 'Status' }),
    moBadgeEl,
    moStatusSelect
  );
  moBody.append(moField, moStatusRow);
  moGroup.append(moBody);

  const actions = createElement('div', { classes: ['cluster'] });
  const saveBtn = createElement('button', { classes: ['btn', 'primary'], text: 'Save' });
  const closeBtn = createElement('button', { classes: ['btn', 'ghost'], text: 'Close' });
  actions.append(saveBtn, closeBtn);

  form.append(dkGroup, moGroup, actions);
  panel.append(title, form);

  overlayRoot.append(backdrop, panel);
  mount(root, overlayRoot);

  backdrop.addEventListener('click', () => overlayRoot.classList.remove('open'));
  closeBtn.addEventListener('click', () => overlayRoot.classList.remove('open'));
  saveBtn.addEventListener('click', () => {
    saveString(KEY_DK, dkInput.value.trim());
    saveString(KEY_MOUSER, moInput.value.trim());
    // also persist status selections in case they changed but weren't persisted yet
    const dkSel = panel.querySelector('select');
    const selects = panel.querySelectorAll('select');
    if (selects && selects.length >= 2) {
      const [dkS, moS] = selects;
      if (dkS) saveString(KEY_DK_STATUS, dkS.value);
      if (moS) saveString(KEY_MOUSER_STATUS, moS.value);
    }
    overlayRoot.classList.remove('open');
  });

  return overlayRoot;
}

export function openSettings() {
  const overlay = ensureSettingsOverlay();
  overlay.classList.add('open');
}

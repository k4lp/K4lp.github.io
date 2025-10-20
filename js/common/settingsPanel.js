import { getCredentials, getStatuses, updateVendorCredentials, vendorFieldMap, deriveStatusSummary } from './credentials.js';

const fillSelectOptions = (select, options) => {
  select.innerHTML = '';
  options.forEach((option) => {
    const opt = document.createElement('option');
    opt.value = option;
    opt.textContent = option;
    select.appendChild(opt);
  });
};

const populateFields = (form, credentials) => {
  Object.entries(vendorFieldMap).forEach(([vendor, fields]) => {
    const vendorData = credentials[vendor] ?? {};
    Object.entries(fields).forEach(([fieldKey, elementId]) => {
      const input = form.querySelector(`#${elementId}`);
      if (!input) return;
      input.value = fieldKey === 'status' ? vendorData.status ?? 'Inactive' : vendorData[fieldKey] ?? '';
    });
  });
};

const extractFormPayload = (form) => {
  const formData = new FormData(form);
  const payload = {};

  Object.keys(vendorFieldMap).forEach((vendor) => {
    payload[vendor] = {};
  });

  for (const [key, value] of formData.entries()) {
    const [vendor, field] = key.split('.');
    if (!vendor || !field) continue;
    payload[vendor][field] = value;
  }

  return payload;
};

const setStatusIndicator = (indicator, status) => {
  indicator.dataset.status = status;
  indicator.textContent = status;
};

export const initialiseSettingsPanel = () => {
  const panel = document.querySelector('[data-settings-panel]');
  const toggleButton = document.querySelector('[data-settings-toggle]');
  const closeButton = document.querySelector('[data-settings-close]');
  const saveButton = document.querySelector('[data-settings-save]');
  const form = document.querySelector('[data-credentials-form]');
  const statusIndicator = document.querySelector('[data-settings-status]');

  if (!panel || !toggleButton || !closeButton || !saveButton || !form || !statusIndicator) {
    return;
  }

  const statuses = getStatuses();
  const selects = form.querySelectorAll('select');
  selects.forEach((select) => fillSelectOptions(select, statuses));

  const credentials = getCredentials();
  populateFields(form, credentials);
  setStatusIndicator(statusIndicator, deriveStatusSummary());

  const setPanelState = (shouldOpen) => {
    panel.classList.toggle('settings-panel--open', shouldOpen);
    panel.setAttribute('aria-hidden', shouldOpen ? 'false' : 'true');
    toggleButton.classList.toggle('is-open', shouldOpen);
    toggleButton.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
  };

  toggleButton.addEventListener('click', () => {
    const nextState = !panel.classList.contains('settings-panel--open');
    setPanelState(nextState);
  });

  closeButton.addEventListener('click', () => setPanelState(false));

  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setPanelState(false);
    }
  });

  saveButton.addEventListener('click', () => {
    const payload = extractFormPayload(form);
    Object.entries(payload).forEach(([vendor, values]) => {
      updateVendorCredentials(vendor, values);
    });
    setStatusIndicator(statusIndicator, deriveStatusSummary());
    setPanelState(false);
  });
};

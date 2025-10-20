import { getCredentials, getStatuses, updateVendorCredentials, vendorFieldMap, deriveStatusSummary } from './credentials.js';

const togglePanel = (element, shouldOpen) => {
  element.classList.toggle('settings-panel--open', shouldOpen);
  element.setAttribute('aria-hidden', shouldOpen ? 'false' : 'true');
};

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
      if (fieldKey === 'status') {
        input.value = vendorData.status ?? 'Inactive';
      } else {
        input.value = vendorData[fieldKey] ?? '';
      }
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
    payload[vendor][field] = value.trim();
  }

  return payload;
};

const setStatusIndicator = (indicator, status) => {
  indicator.dataset.status = status;
  indicator.textContent = status;
};

const applyAriaCurrent = () => {
  const links = document.querySelectorAll('.navbar__links a');
  if (!links.length) return;
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  links.forEach((link) => {
    const targetPath = link.getAttribute('href');
    if (!targetPath) return;
    const targetFile = targetPath.split('/').pop();
    if (targetFile === currentPath) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
};

export const initialiseSettingsPanel = () => {
  const panel = document.querySelector('[data-settings-panel]');
  const toggleButton = document.querySelector('[data-settings-toggle]');
  const closeButton = document.querySelector('[data-settings-close]');
  const saveButton = document.querySelector('[data-settings-save]');
  const form = document.querySelector('[data-credentials-form]');
  const statusIndicator = document.querySelector('[data-settings-status]');

  applyAriaCurrent();

  if (!panel || !toggleButton || !closeButton || !saveButton || !form || !statusIndicator) {
    return;
  }

  const statuses = getStatuses();
  const selects = form.querySelectorAll('select');
  selects.forEach((select) => fillSelectOptions(select, statuses));

  const credentials = getCredentials();
  populateFields(form, credentials);
  setStatusIndicator(statusIndicator, deriveStatusSummary());

  toggleButton.addEventListener('click', () => togglePanel(panel, true));
  closeButton.addEventListener('click', () => togglePanel(panel, false));

  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      togglePanel(panel, false);
    }
  });

  saveButton.addEventListener('click', () => {
    const payload = extractFormPayload(form);
    Object.entries(payload).forEach(([vendor, values]) => {
      updateVendorCredentials(vendor, values);
    });
    setStatusIndicator(statusIndicator, deriveStatusSummary());
    togglePanel(panel, false);
  });
};

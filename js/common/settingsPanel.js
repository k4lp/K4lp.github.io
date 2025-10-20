import {
  getCredentials,
  updateVendorCredentials,
  vendorFieldMap,
  deriveStatusSummary,
  getVendors,
} from './credentials.js';
import { evaluateAllVendorStatuses, evaluateSelectedStatuses } from './statusChecks.js';

const STATUS_CLASS_MAP = {
  Active: 'status-chip--active',
  Inactive: 'status-chip--inactive',
  Error: 'status-chip--error',
  Connecting: 'status-chip--connecting',
};

const populateFields = (form, credentials) => {
  Object.entries(vendorFieldMap).forEach(([vendor, fields]) => {
    const vendorData = credentials[vendor] ?? {};
    Object.entries(fields).forEach(([fieldKey, elementId]) => {
      const input = form.querySelector(`#${elementId}`);
      if (!input) return;
      input.value = vendorData[fieldKey] ?? '';
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

const collectVendorNodes = (form) => {
  const nodes = {};
  getVendors().forEach((vendor) => {
    nodes[vendor] = {
      chip: form.querySelector(`[data-vendor-status="${vendor}"]`),
      detail: form.querySelector(`[data-vendor-status-detail="${vendor}"]`),
      refresh: form.querySelector(`[data-status-refresh="${vendor}"]`),
    };
  });
  return nodes;
};

const applyStatusToChip = (chip, status) => {
  if (!chip) return;
  const resolvedStatus = STATUS_CLASS_MAP[status] ? status : 'Inactive';
  chip.dataset.state = resolvedStatus;
  chip.textContent = resolvedStatus;

  Object.values(STATUS_CLASS_MAP).forEach((className) => chip.classList.remove(className));
  const mappedClass = STATUS_CLASS_MAP[resolvedStatus];
  if (mappedClass) {
    chip.classList.add(mappedClass);
  }
};

const applyStatusDetail = (node, detail) => {
  if (!node) return;
  node.textContent = detail ?? '';
  node.hidden = !detail;
};

const renderStoredStatuses = (nodes) => {
  const credentials = getCredentials();
  getVendors().forEach((vendor) => {
    const stored = credentials[vendor] ?? {};
    applyStatusToChip(nodes[vendor]?.chip, stored.status ?? 'Inactive');
    applyStatusDetail(nodes[vendor]?.detail, stored.statusDetail ?? '');
  });
};

const setRefreshButtonsState = (nodes, isDisabled) => {
  getVendors().forEach((vendor) => {
    const button = nodes[vendor]?.refresh;
    if (!button) return;
    button.disabled = isDisabled;
    button.classList.toggle('is-disabled', isDisabled);
  });
};

const evaluateAndRenderStatuses = async (nodes, indicator, vendors) => {
  const targetVendors = vendors ?? getVendors();

  targetVendors.forEach((vendor) => {
    applyStatusToChip(nodes[vendor]?.chip, 'Connecting');
    applyStatusDetail(nodes[vendor]?.detail, 'Validating credentials…');
  });
  setStatusIndicator(indicator, 'Connecting');
  setRefreshButtonsState(nodes, true);

  const results = vendors
    ? await evaluateSelectedStatuses(targetVendors)
    : await evaluateAllVendorStatuses();

  results.forEach(({ vendor, status, detail }) => {
    applyStatusToChip(nodes[vendor]?.chip, status);
    applyStatusDetail(nodes[vendor]?.detail, detail);
  });

  setRefreshButtonsState(nodes, false);
  setStatusIndicator(indicator, deriveStatusSummary());
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

  const credentialSnapshot = getCredentials();
  populateFields(form, credentialSnapshot);
  const vendorNodes = collectVendorNodes(form);
  renderStoredStatuses(vendorNodes);
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
    if (nextState) {
      renderStoredStatuses(vendorNodes);
      setStatusIndicator(statusIndicator, deriveStatusSummary());
    }
  });

  closeButton.addEventListener('click', () => setPanelState(false));

  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setPanelState(false);
    }
  });

  getVendors().forEach((vendor) => {
    const button = vendorNodes[vendor]?.refresh;
    if (!button) return;
    button.addEventListener('click', async () => {
      await evaluateAndRenderStatuses(vendorNodes, statusIndicator, [vendor]);
    });
  });

  saveButton.addEventListener('click', async () => {
    const payload = extractFormPayload(form);
    Object.entries(payload).forEach(([vendor, values]) => {
      updateVendorCredentials(vendor, values);
    });

    await evaluateAndRenderStatuses(vendorNodes, statusIndicator);
    setPanelState(false);
  });

  // Run an initial evaluation on load to keep statuses current.
  evaluateAndRenderStatuses(vendorNodes, statusIndicator).catch(() => {
    // Any errors are already captured and shown via evaluateAndRenderStatuses.
  });
};

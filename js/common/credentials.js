import { read, write } from './storage.js';

const CREDENTIALS_KEY = 'vendor.credentials';
const STATUSES = ['Active', 'Inactive', 'Error', 'Connecting'];

const TEMPLATE = {
  digikey: {
    clientId: '',
    clientSecret: '',
    status: 'Inactive',
    updatedAt: null,
  },
  mouser: {
    apiKey: '',
    status: 'Inactive',
    updatedAt: null,
  },
};

const cloneTemplate = () => JSON.parse(JSON.stringify(TEMPLATE));

export const getStatuses = () => [...STATUSES];

export const getCredentials = () => {
  const stored = read(CREDENTIALS_KEY);
  if (!stored) {
    return cloneTemplate();
  }
  return {
    digikey: { ...cloneTemplate().digikey, ...(stored.digikey ?? {}) },
    mouser: { ...cloneTemplate().mouser, ...(stored.mouser ?? {}) },
  };
};

export const updateVendorCredentials = (vendor, updates) => {
  const credentials = getCredentials();
  const next = {
    ...credentials,
    [vendor]: {
      ...credentials[vendor],
      ...updates,
      updatedAt: new Date().toISOString(),
    },
  };

  write(CREDENTIALS_KEY, next);
  return next[vendor];
};

export const deriveStatusSummary = () => {
  const credentials = getCredentials();
  const statuses = Object.values(credentials).map((item) => item.status);
  if (statuses.every((status) => status === 'Active')) {
    return 'Active';
  }
  if (statuses.some((status) => status === 'Error')) {
    return 'Error';
  }
  if (statuses.some((status) => status === 'Connecting')) {
    return 'Connecting';
  }
  if (statuses.some((status) => status === 'Active')) {
    return 'Active';
  }
  return 'Inactive';
};

export const vendorFieldMap = {
  digikey: {
    clientId: 'digikey-client-id',
    clientSecret: 'digikey-client-secret',
    status: 'digikey-status',
  },
  mouser: {
    apiKey: 'mouser-api-key',
    status: 'mouser-status',
  },
};

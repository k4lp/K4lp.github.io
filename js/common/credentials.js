import { read, write } from './storage.js';

const CREDENTIALS_KEY = 'vendor.credentials';
const STATUSES = ['Active', 'Inactive', 'Error', 'Connecting'];

const VENDOR_DEFAULTS = {
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

const cloneDefaults = () => JSON.parse(JSON.stringify(VENDOR_DEFAULTS));

const sanitiseVendor = (vendor, record = {}) => {
  const template = VENDOR_DEFAULTS[vendor];
  return Object.keys(template).reduce((acc, key) => {
    acc[key] = record[key] ?? template[key];
    return acc;
  }, {});
};

export const getStatuses = () => [...STATUSES];

export const getCredentials = () => {
  const stored = read(CREDENTIALS_KEY, {});
  return Object.keys(VENDOR_DEFAULTS).reduce((acc, vendor) => {
    acc[vendor] = sanitiseVendor(vendor, stored[vendor]);
    return acc;
  }, cloneDefaults());
};

export const updateVendorCredentials = (vendor, updates) => {
  const credentials = getCredentials();
  const current = sanitiseVendor(vendor, credentials[vendor]);

  const next = {
    ...credentials,
    [vendor]: {
      ...current,
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

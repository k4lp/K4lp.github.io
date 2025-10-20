import { read, write } from './storage.js';

const CREDENTIALS_KEY = 'vendor.credentials';
const STATUSES = ['Active', 'Inactive', 'Error', 'Connecting'];

const VENDOR_DEFAULTS = {
  digikey: {
    clientId: '',
    clientSecret: '',
    status: 'Inactive',
    statusDetail: '',
    updatedAt: null,
    lastCheckedAt: null,
  },
  mouser: {
    apiKey: '',
    status: 'Inactive',
    statusDetail: '',
    updatedAt: null,
    lastCheckedAt: null,
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

export const getVendors = () => Object.keys(VENDOR_DEFAULTS);

export const getCredentials = () => {
  const stored = read(CREDENTIALS_KEY, {});
  return getVendors().reduce((acc, vendor) => {
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

export const setVendorStatus = (vendor, status, statusDetail = '') => {
  if (!STATUSES.includes(status) && status !== 'Inactive') {
    throw new Error(`Unsupported status "${status}" supplied for ${vendor}`);
  }
  return updateVendorCredentials(vendor, {
    status,
    statusDetail,
    lastCheckedAt: new Date().toISOString(),
  });
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
  },
  mouser: {
    apiKey: 'mouser-api-key',
  },
};

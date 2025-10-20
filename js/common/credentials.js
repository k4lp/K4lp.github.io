import { read, write } from './storage.js';

const CREDENTIALS_KEY = 'vendor.credentials';
const STATUSES = ['Active', 'Inactive', 'Error', 'Connecting'];
const VENDORS = ['digikey', 'mouser'];

const defaultCredentials = () =>
  VENDORS.reduce((acc, vendor) => {
    acc[vendor] = {
      apiKey: '',
      apiSecret: '',
      partnerId: '',
      status: 'Inactive',
      updatedAt: null,
    };
    return acc;
  }, {});

export const getStatuses = () => [...STATUSES];

export const getCredentials = () => {
  const stored = read(CREDENTIALS_KEY);
  return stored ? { ...defaultCredentials(), ...stored } : defaultCredentials();
};

export const updateVendorCredentials = (vendor, updates) => {
  const credentials = getCredentials();
  const vendorRecord = credentials[vendor] ?? {
    apiKey: '',
    apiSecret: '',
    partnerId: '',
    status: 'Inactive',
    updatedAt: null,
  };

  const next = {
    ...credentials,
    [vendor]: {
      ...vendorRecord,
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
    apiKey: 'digikey-api-key',
    apiSecret: 'digikey-api-secret',
    status: 'digikey-status',
  },
  mouser: {
    apiKey: 'mouser-api-key',
    partnerId: 'mouser-partner-id',
    status: 'mouser-status',
  },
};

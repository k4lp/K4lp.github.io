const STORAGE_NAMESPACE = 'kalp.toolkit';

const isJson = (value) => {
  try {
    JSON.parse(value);
    return true;
  } catch (error) {
    return false;
  }
};

const getStorage = () => window.localStorage;

export const read = (key, fallback = null) => {
  const storage = getStorage();
  const raw = storage.getItem(`${STORAGE_NAMESPACE}.${key}`);
  if (raw === null) {
    return fallback;
  }
  if (typeof raw === 'string' && raw.length > 0 && isJson(raw)) {
    return JSON.parse(raw);
  }
  return raw;
};

export const write = (key, value) => {
  const storage = getStorage();
  const serialised = typeof value === 'string' ? value : JSON.stringify(value);
  storage.setItem(`${STORAGE_NAMESPACE}.${key}`, serialised);
  return value;
};

export const merge = (key, partial) => {
  const current = read(key, {});
  const next = { ...current, ...partial };
  write(key, next);
  return next;
};

export const remove = (key) => {
  const storage = getStorage();
  storage.removeItem(`${STORAGE_NAMESPACE}.${key}`);
};

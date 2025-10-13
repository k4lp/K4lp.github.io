// Client-side storage with no-expiry policy
const NAMESPACE = 'k4lp.ee';

function makeKey(key) {
  return `${NAMESPACE}.${key}`;
}

export function saveJSON(key, value) {
  localStorage.setItem(makeKey(key), JSON.stringify(value));
}

export function loadJSON(key, fallback = null) {
  const raw = localStorage.getItem(makeKey(key));
  if (!raw) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

export function saveString(key, value) {
  localStorage.setItem(makeKey(key), String(value));
}

export function loadString(key, fallback = '') {
  const raw = localStorage.getItem(makeKey(key));
  return raw === null ? fallback : raw;
}

export function remove(key) {
  localStorage.removeItem(makeKey(key));
}

export function has(key) {
  return localStorage.getItem(makeKey(key)) !== null;
}

/**
 * localStorage persistence with safe JSON parse.
 * @module core/storage
 */

export class Storage {
  constructor(prefix = 'gmt') {
    this.prefix = prefix;
  }

  _k(key) {
    return key.startsWith(this.prefix) ? key : `${this.prefix}.${key}`;
  }

  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(this._k(key));
      if (raw == null) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  set(key, value) {
    try {
      localStorage.setItem(this._k(key), JSON.stringify(value));
      return true;
    } catch (err) {
      console.warn('[Storage] set failed', key, err);
      return false;
    }
  }

  remove(key) {
    try {
      localStorage.removeItem(this._k(key));
    } catch {
      /* ignore */
    }
  }
}

export const storage = new Storage('gmt');

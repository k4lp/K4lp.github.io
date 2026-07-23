/** @module core/storage */

export class Storage {
  constructor(prefix = 'oai') {
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
    } catch {
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

export const storage = new Storage('oai');

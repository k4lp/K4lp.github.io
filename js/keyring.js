// js/keyring.js
class KeyRing {
  constructor(storageKey = 'gemini_keys') {
    this.storageKey = storageKey;
    this.keys = {};
    this.load();
  }

  load() {
    const raw = localStorage.getItem(this.storageKey);
    if (raw) {
      try {
        this.keys = JSON.parse(raw);
      } catch (e) {
        console.error('Failed to parse keyring from localStorage', e);
        this.keys = {};
      }
    }
  }

  save() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.keys));
  }

  get(key) {
    return this.keys[key] || '';
  }

  set(key, value) {
    this.keys[key] = value || '';
    this.save();
  }

  getActive() {
    return this.get('gemini-api-key');
  }
}

window.KeyRing = KeyRing;
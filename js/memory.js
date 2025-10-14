// js/memory.js
class MemoryStore {
  constructor(storageKey = 'gemini_memory') {
    this.storageKey = storageKey;
    this.data = {
      goals: '',
      items: [],
    };
    this.load();
  }

  load() {
    const raw = localStorage.getItem(this.storageKey);
    if (raw) {
      try {
        this.data = JSON.parse(raw);
      } catch (e) {
        console.error('Failed to parse memory from localStorage', e);
        this.data = { goals: '', items: [] };
      }
    }
  }

  save() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.data));
  }

  list() {
    return this.data.items;
  }

  add(summary, details) {
    this.data.items.push({ summary, details });
    this.save();
    return this.data.items.length - 1;
  }

  get(index) {
    return this.data.items[index] || null;
  }

  del(index) {
    this.data.items.splice(index, 1);
    this.save();
  }

  setGoals(text) {
    this.data.goals = text;
    this.save();
  }

  getGoals() {
    return this.data.goals || '';
  }

  clear() {
    this.data.items = [];
    this.save();
  }

  reset() {
    this.data = { goals: '', items: [] };
    this.save();
  }
}

window.MemoryStore = MemoryStore;
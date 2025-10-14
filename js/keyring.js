// js/keyring.js
class KeyRing {
  constructor(storageKey = 'labs_keys'){
    this.storageKey = storageKey;
    this.keys = {};
    this.load();
  }
  load(){
    const raw = localStorage.getItem(this.storageKey);
    if(raw){
      try{ this.keys = JSON.parse(raw) } catch{}
    }
  }
  save(){ localStorage.setItem(this.storageKey, JSON.stringify(this.keys)) }
  get(key){ return this.keys[key] || "" }
  set(key, val){ this.keys[key] = val || ""; this.save() }
}
window.KeyRing = KeyRing;
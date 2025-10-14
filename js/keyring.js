// js/keyring.js
class KeyRing {
  constructor(storageKey = 'labs_keys'){
    this.storageKey = storageKey;
    this.state = { keys: ["","","","",""], index: 0, coolOff: [0,0,0,0,0] };
    this.load();
  }
  load(){
    const raw = localStorage.getItem(this.storageKey);
    if(raw){
      try{ this.state = JSON.parse(raw) } catch{}
    }
  }
  save(){ localStorage.setItem(this.storageKey, JSON.stringify(this.state)) }
  setKey(i, val){ this.state.keys[i] = val || ""; this.save() }
  getActive(){ return this.state.keys[this.state.index] || "" }
  setIndex(i){ this.state.index = i % this.state.keys.length; this.save() }
  rotate(){
    const n = this.state.keys.length;
    for(let step=1; step<=n; step++){
      const ni = (this.state.index + step) % n;
      if(this.state.keys[ni]){ this.state.index = ni; this.save(); return this.getActive() }
    }
    return this.getActive();
  }
  markRateLimited(){
    // Simple rotation on 429; production could add backoff timestamps.
    return this.rotate();
  }
}
window.KeyRing = KeyRing;

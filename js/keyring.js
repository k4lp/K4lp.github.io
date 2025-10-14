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
    // Set a cool-off period for the current key before rotating.
    this.state.coolOff[this.state.index] = Date.now() + 60000; // 1 minute cool-off
    this.save();
    return this.rotate();
  }

  rotate(){
    const n = this.state.keys.length;
    const now = Date.now();
    for(let step=1; step<=n; step++){
      const ni = (this.state.index + step) % n;
      // Rotate to the next key that is not in a cool-off period.
      if(this.state.keys[ni] && now > (this.state.coolOff[ni] || 0)){
        this.state.index = ni;
        this.save();
        return this.getActive();
      }
    }
    // If all keys are in cool-off, return the one that will be available soonest.
    const soonestKeyIndex = this.state.coolOff.indexOf(Math.min(...this.state.coolOff));
    this.state.index = soonestKeyIndex;
    this.save();
    return this.getActive();
  }
}
window.KeyRing = KeyRing;

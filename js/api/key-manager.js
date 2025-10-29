/**
 * GDRS Key Manager
 * API key management, rotation, validation, failure tracking - NOW SUPPORTS UNLIMITED KEYS!
 */

import { Storage } from '../storage/storage.js';
import { qs } from '../core/utils.js';
import { KEY_ROTATION_DISPLAY_DURATION } from '../core/constants.js';

export const KeyManager = {
  getCooldownRemainingSeconds(k) {
    const now = Date.now();
    if (!k.cooldownUntil || k.cooldownUntil <= now) return 0;
    return Math.ceil((k.cooldownUntil - now) / 1000);
  },

  liftCooldowns() {
    const pool = Storage.loadKeypool();
    let dirty = false;
    const now = Date.now();
    
    for (const k of pool) {
      if (k.cooldownUntil && k.cooldownUntil <= now) {
        if (k.rateLimited) dirty = true;
        k.rateLimited = false;
        k.cooldownUntil = 0;
      }
      // Reset failure count after 10 minutes of no failures
      if (k.lastFailure && (now - k.lastFailure) > 600000) { // 10 minutes
        if (k.failureCount > 0) {
          k.failureCount = 0;
          dirty = true;
        }
      }
    }
    
    if (dirty) Storage.saveKeypool(pool);
  },

  markRateLimit(slot, cooldownSeconds = 30) {
    const pool = Storage.loadKeypool();
    const rec = pool.find(k => k.slot === slot);
    if (!rec) return;
    
    const now = Date.now();
    rec.rateLimited = true;
    rec.cooldownUntil = now + cooldownSeconds * 1000;
    rec.failureCount = (rec.failureCount || 0) + 1;
    rec.lastFailure = now;
    Storage.saveKeypool(pool);
    console.warn(`🔑 Key #${slot} rate limited for ${cooldownSeconds}s (failure count: ${rec.failureCount})`);
  },

  markFailure(slot, reason = 'unknown') {
    const pool = Storage.loadKeypool();
    const rec = pool.find(k => k.slot === slot);
    if (!rec) return;
    
    const now = Date.now();
    rec.failureCount = (rec.failureCount || 0) + 1;
    rec.lastFailure = now;
    
    // If too many consecutive failures, temporarily mark as invalid
    if (rec.failureCount >= 3) {
      rec.rateLimited = true;
      rec.cooldownUntil = now + 60000; // 1 minute cooldown for repeated failures
      console.warn(`🔑 Key #${slot} temporarily disabled due to ${rec.failureCount} consecutive failures (${reason})`);
    }
    
    Storage.saveKeypool(pool);
  },

  chooseActiveKey() {
    const pool = Storage.loadKeypool();
    this.liftCooldowns();
    
    // First, try to find a key with no recent failures
    let usable = pool.find(k => {
      const cd = this.getCooldownRemainingSeconds(k);
      return k.key && k.valid && !k.rateLimited && cd === 0 && k.failureCount === 0;
    });
    
    // If no perfect key found, try keys with minimal failures
    if (!usable) {
      usable = pool.filter(k => {
        const cd = this.getCooldownRemainingSeconds(k);
        return k.key && k.valid && !k.rateLimited && cd === 0;
      }).sort((a, b) => (a.failureCount || 0) - (b.failureCount || 0))[0];
    }
    
    return usable || null;
  },

  getAllAvailableKeys() {
    const pool = Storage.loadKeypool();
    this.liftCooldowns();
    
    return pool.filter(k => {
      const cd = this.getCooldownRemainingSeconds(k);
      return k.key && k.valid && !k.rateLimited && cd === 0;
    }).sort((a, b) => (a.failureCount || 0) - (b.failureCount || 0));
  },

  showKeyRotationIndicator(fromSlot, toSlot, reason = '') {
    const indicator = qs('#keyRotationIndicator');
    const slotSpan = qs('#rotatedKeySlot');
    
    if (indicator && slotSpan) {
      slotSpan.textContent = toSlot;
      indicator.classList.remove('hidden');
      
      console.log(`🔄 Key rotation: #${fromSlot} → #${toSlot} ${reason ? `(${reason})` : ''}`);
      
      setTimeout(() => {
        indicator.classList.add('hidden');
      }, KEY_ROTATION_DISPLAY_DURATION);
    }
  },

  // NEW: Update keys from textarea
  updateKeysFromTextarea() {
    const textarea = qs('#apiKeysTextarea');
    if (!textarea) return;
    
    const keysText = textarea.value;
    Storage.updateKeysFromText(keysText);
  },

  markValid(slot, isValid) {
    const pool = Storage.loadKeypool();
    const rec = pool.find(k => k.slot === slot);
    if (!rec) return;
    
    rec.valid = !!isValid;
    if (isValid) {
      rec.failureCount = 0;
      rec.lastFailure = 0;
    }
    Storage.saveKeypool(pool);
  },

  bumpUsage(slot) {
    const pool = Storage.loadKeypool();
    const rec = pool.find(k => k.slot === slot);
    if (!rec) return;
    
    rec.usage = Number(rec.usage || 0) + 1;
    Storage.saveKeypool(pool);
  },

  clearAll() {
    Storage.saveKeypool([]);
    const textarea = qs('#apiKeysTextarea');
    if (textarea) textarea.value = '';
  },

  async validateAllKeys() {
    const pool = Storage.loadKeypool();
    
    console.log(`🔑 Validating ${pool.length} API keys...`);
    
    for (const k of pool) {
      if (!k.key) {
        k.valid = false;
        continue;
      }
      
      try {
        const resp = await fetch(
          'https://generativelanguage.googleapis.com/v1beta/models?key=' +
          encodeURIComponent(k.key)
        );
        
        if (resp.status === 429) {
          k.valid = true;
          k.rateLimited = true;
          k.cooldownUntil = Date.now() + 30 * 1000;
        } else if (resp.ok) {
          k.valid = true;
          k.failureCount = 0;
          k.lastFailure = 0;
        } else if (resp.status === 401 || resp.status === 403) {
          k.valid = false;
        } else {
          k.valid = false;
        }
      } catch (err) {
        k.valid = false;
        console.error(`Key #${k.slot} validation error:`, err);
      }
    }
    
    Storage.saveKeypool(pool);
    console.log(`✅ Key validation complete`);
  },

  // NEW: Get comprehensive key statistics
  getKeyStats() {
    const pool = Storage.loadKeypool();
    const now = Date.now();
    
    const stats = {
      total: pool.length,
      valid: 0,
      invalid: 0,
      rateLimited: 0,
      cooling: 0,
      ready: 0,
      totalUsage: 0,
      avgFailures: 0,
      oldestKey: null,
      newestKey: null
    };
    
    if (pool.length === 0) return stats;
    
    let totalFailures = 0;
    let oldestTime = Infinity;
    let newestTime = 0;
    
    pool.forEach(k => {
      if (k.valid) stats.valid++; else stats.invalid++;
      if (k.rateLimited) stats.rateLimited++;
      
      const cooldown = this.getCooldownRemainingSeconds(k);
      if (cooldown > 0) stats.cooling++;
      
      if (k.key && k.valid && !k.rateLimited && cooldown === 0) {
        stats.ready++;
      }
      
      stats.totalUsage += k.usage || 0;
      totalFailures += k.failureCount || 0;
      
      const keyTime = k.addedAt || now;
      if (keyTime < oldestTime) {
        oldestTime = keyTime;
        stats.oldestKey = k;
      }
      if (keyTime > newestTime) {
        newestTime = keyTime;
        stats.newestKey = k;
      }
    });
    
    stats.avgFailures = totalFailures / pool.length;
    
    return stats;
  }
};
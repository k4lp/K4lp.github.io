/**
 * GDRS Key Manager
 * API key management, rotation, validation, failure tracking
 */

import { KeySelector } from './keys/key-selector.js';
import { KeyFailureTracker } from './keys/key-failure-tracker.js';
import { KeyValidator } from './keys/key-validator.js';
import { KeyStats } from './keys/key-stats.js';
import { KeyUI } from './keys/key-ui.js';

export const KeyManager = {
  // Key selection
  getCooldownRemainingSeconds: (k) => KeySelector.getCooldownRemainingSeconds(k),
  chooseActiveKey: () => KeySelector.chooseActiveKey(),
  getAllAvailableKeys: () => KeySelector.getAllAvailableKeys(),
  liftCooldowns: () => KeySelector.liftCooldowns(),

  // Failure tracking
  markRateLimit: (slot, cooldownSeconds) => KeyFailureTracker.markRateLimit(slot, cooldownSeconds),
  markFailure: (slot, reason) => KeyFailureTracker.markFailure(slot, reason),
  markValid: (slot, isValid) => KeyFailureTracker.markValid(slot, isValid),
  bumpUsage: (slot) => KeyFailureTracker.bumpUsage(slot),

  // Validation
  validateAllKeys: () => KeyValidator.validateAllKeys(),

  // Stats
  getKeyStats: () => KeyStats.getKeyStats(),

  // UI
  showKeyRotationIndicator: (fromSlot, toSlot, reason) => KeyUI.showKeyRotationIndicator(fromSlot, toSlot, reason),
  updateKeysFromTextarea: () => KeyUI.updateKeysFromTextarea(),
  clearAll: () => KeyUI.clearAll()
};

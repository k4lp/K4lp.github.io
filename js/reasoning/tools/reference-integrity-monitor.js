import { nowISO } from '../../core/utils.js';

const ENTITY_LABELS = {
  vault: 'Vault entry',
  memory: 'Memory entry',
  task: 'Task',
  goal: 'Goal',
  tasks: 'Task',
  goals: 'Goal',
  memories: 'Memory entry'
};

const DEFAULT_MAX_PREVIEW = 10;

function toIdentifierList(snapshot = []) {
  if (!Array.isArray(snapshot)) return [];
  return snapshot
    .map((item) => (item && (item.identifier || item.id)) || null)
    .filter(Boolean);
}

function formatIdentifierPreview(identifiers, maxItems = DEFAULT_MAX_PREVIEW) {
  if (!identifiers || identifiers.length === 0) {
    return 'none';
  }

  const preview = identifiers.slice(0, maxItems);
  const suffix = identifiers.length > maxItems ? `, +${identifiers.length - maxItems} more` : '';
  return `${preview.join(', ')}${suffix}`;
}

export class ReferenceIntegrityMonitor {
  constructor({
    logger = console,
    timeProvider = nowISO,
    maxPreview = DEFAULT_MAX_PREVIEW
  } = {}) {
    this.logger = logger;
    this.timeProvider = typeof timeProvider === 'function' ? timeProvider : nowISO;
    this.maxPreview = maxPreview;
  }

  getTimestamp() {
    try {
      return this.timeProvider();
    } catch {
      return nowISO();
    }
  }

  labelFor(entityType) {
    return ENTITY_LABELS[entityType] || entityType || 'entity';
  }

  logMissingReference({
    entityType,
    identifier,
    operationType,
    availableIdentifiers = [],
    notes
  }) {
    const timestamp = this.getTimestamp();
    const label = this.labelFor(entityType);

    this.logger.warn(`[${timestamp}] [ReferenceIntegrity] Missing ${label} reference detected`);
    this.logger.warn(`   - Operation: ${operationType || 'unknown'}`);
    this.logger.warn(`   - Identifier: ${identifier || '<missing>'}`);
    this.logger.warn(
      `   - Available ${label}${availableIdentifiers.length === 1 ? '' : 's'}: ${formatIdentifierPreview(availableIdentifiers, this.maxPreview)}`
    );
    if (notes) {
      this.logger.warn(`   - Notes: ${notes}`);
    }
  }

  ensureExists({
    entityType,
    identifier,
    snapshot,
    operationType,
    notes
  }) {
    const availableIdentifiers = toIdentifierList(snapshot);
    const exists = availableIdentifiers.includes(identifier);

    if (!exists) {
      this.logMissingReference({
        entityType,
        identifier,
        operationType,
        availableIdentifiers,
        notes
      });
      return false;
    }

    return true;
  }
}

export default ReferenceIntegrityMonitor;


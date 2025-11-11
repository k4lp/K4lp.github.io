/**
 * COMPACTION CONFIGURATION
 *
 * Controls behavior of context compaction system
 */

export const COMPACTION_CONFIG = {
  // Trigger thresholds
  minIterationsForCompaction: 3,
  autoTriggerContextUsage: 0.85, // 85%
  recommendedContextUsage: 0.60, // 60%

  // LLM settings
  model: 'gemini-1.5-flash',
  temperature: 0.1,
  maxOutputTokens: 4000,
  timeout: 30000, // 30 seconds

  // Retry settings
  maxRetries: 1,
  retryDelay: 2000, // 2 seconds

  // Archive settings
  archivePrefix: 'gdrs_compaction_archive_',
  maxArchives: 10, // Keep last 10 archives
  archiveExpiryDays: 30,

  // Performance
  estimatedTokensPerIteration: 5000,
  targetCompressionRatio: 0.3, // 70% reduction

  // UI
  progressUpdateInterval: 500, // ms
  showMetricsInUI: true,
  animateCompaction: true
};

export const COMPACTION_EVENTS = {
  START: 'compaction_start',
  PHASE_CHANGE: 'compaction_phase_change',
  PROGRESS: 'compaction_progress',
  COMPLETE: 'compaction_complete',
  ERROR: 'compaction_error',
  ROLLED_BACK: 'compaction_rolled_back',
  ARCHIVED: 'compaction_archived'
};

export const COMPACTION_PHASES = {
  IDLE: 'idle',
  WAITING: 'waiting',
  FREEZING: 'freezing',
  GATHERING: 'gathering',
  BUILDING_PROMPT: 'building_prompt',
  COMPACTING: 'compacting',
  VALIDATING: 'validating',
  ARCHIVING: 'archiving',
  REPLACING: 'replacing',
  RECORDING_METRICS: 'recording_metrics',
  UNFREEZING: 'unfreezing',
  COMPLETE: 'complete',
  ERROR: 'error',
  RETRYING: 'retrying',
  ROLLING_BACK: 'rolling_back'
};

export default COMPACTION_CONFIG;

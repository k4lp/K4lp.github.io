/**
 * REASONING CONFIGURATION
 *
 * Centralises all constants and settings that govern how the reasoning engine
 * assembles context prompts and evaluates goal completion. The goal is to
 * make every section pluggable so new data sources or formatting rules can be
 * added declaratively without rewriting orchestration code.
 */

/**
 * Controls how many historical records are injected into the prompt.
 */
export const REASONING_CONTEXT_LIMITS = {
  reasoningLogEntries: 3,
  executionLogEntries: 2
};

/**
 * Defines the ordered sections that appear in the reasoning context prompt.
 * Each section references a provider/formatter pair by ID so behaviour can be
 * customised in code without touching the orchestration.
 */
export const REASONING_CONTEXT_SECTIONS = [
  {
    id: 'pendingExecutionError',
    providerId: 'pendingExecutionError',
    heading: '**Execution Error Follow-up:**',
    fallback: '',
    includeWhenEmpty: false
  },
  {
    id: 'userQuery',
    providerId: 'userQuery',
    heading: '**User Query:**',
    fallback: 'No query supplied.',
    includeWhenEmpty: true
  },
  {
    id: 'attachments',
    providerId: 'attachments',
    heading: '**Data Attachment:**',
    fallback: 'No workbook attached.',
    includeWhenEmpty: false
  },
  {
    id: 'tasks',
    providerId: 'tasks',
    heading: '**Current Tasks:**',
    fallback: 'None yet - Begin with thorough query analysis',
    includeWhenEmpty: true
  },
  {
    id: 'goals',
    providerId: 'goals',
    heading: '**Goals:**',
    fallback: 'None yet - Define strategic success criteria after analysis',
    includeWhenEmpty: true
  },
  {
    id: 'memory',
    providerId: 'memory',
    heading: '**Memory:**',
    fallback: 'None yet - Store important findings as you discover them',
    includeWhenEmpty: true
  },
  {
    id: 'vaultSummary',
    providerId: 'vaultSummary',
    heading: '**Vault Index:**',
    fallback: 'Empty - Use for complex data and code storage',
    includeWhenEmpty: true
  },
  {
    id: 'recentExecutions',
    providerId: 'recentExecutions',
    heading: '**Recent JavaScript Executions:**',
    fallback: 'None yet - Leverage computational power for accuracy',
    includeWhenEmpty: true
  },
  {
    id: 'recentReasoning',
    providerId: 'recentReasoning',
    heading: '**Recent Reasoning Log:**',
    fallback: 'Starting fresh - Apply strategic intelligence framework',
    includeWhenEmpty: true
  }
];

/**
 * Prompt framing blocks that wrap the contextual sections.
 */
export const REASONING_PROMPT_FRAGMENTS = {
  heading: '## CURRENT SESSION CONTEXT',
  sectionJoiner: '\n\n',
  separator: '\n\n---\n\n',
  iterationTemplate: '**Iteration:** {iteration}/{maxIterations}'
};

/**
 * Strategic instruction block appended after the context sections.
 * Keep declarative so downstream code can swap instructions easily.
 */
export const REASONING_STRATEGIC_INSTRUCTION = [
  '**STRATEGIC INSTRUCTION:** Apply the STRATEGIC INTELLIGENCE FRAMEWORK:',
  '',
  '1. **DEEP ANALYSIS**: If no tasks/goals exist, perform thorough query analysis first',
  '2. **SMART DECOMPOSITION**: Create meaningful tasks based on conceptual understanding',
  '3. **STRATEGIC GOALS**: Define success criteria that represent real objectives',
  '4. **PROGRESSIVE EXECUTION**: Advance toward completion with computational backing',
  '5. **QUALITY VALIDATION**: Ensure outputs meet high standards of accuracy and completeness',
  '',
  'Focus on demonstrating sophisticated reasoning and analytical depth. Each iteration should show clear intellectual progress toward comprehensive goal achievement.'
].join('\n');

/**
 * Rules for determining when goals can be considered complete.
 */
export const GOAL_COMPLETION_RULES = {
  treatMissingGoalsAsIncomplete: true,
  requireNoActiveTasks: true,
  activeTaskStatuses: ['pending', 'ongoing']
};

/**
 * Toggle reasoning session health monitoring. Disabled to unblock testing.
 */
export const REASONING_HEALTH_MONITORING_ENABLED = false;

export default {
  REASONING_CONTEXT_LIMITS,
  REASONING_CONTEXT_SECTIONS,
  REASONING_PROMPT_FRAGMENTS,
  REASONING_STRATEGIC_INSTRUCTION,
  GOAL_COMPLETION_RULES,
  REASONING_HEALTH_MONITORING_ENABLED
};

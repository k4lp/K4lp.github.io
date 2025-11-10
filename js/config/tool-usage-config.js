/**
 * TOOL USAGE CONFIGURATION
 *
 * Declarative description of the tool application pipeline so execution order
 * and behaviour can be tuned without rewriting orchestration logic.
 */

/**
 * Ordered pipeline of tool operation stages.
 */
export const TOOL_OPERATION_PIPELINE = [
  {
    id: 'vault',
    summaryKey: 'vault',
    processorId: 'vault',
    operationsKey: 'vault',
    persistEntities: true
  },
  {
    id: 'memory',
    summaryKey: 'memory',
    processorId: 'memory',
    operationsKey: 'memories',
    persistEntities: true
  },
  {
    id: 'tasks',
    summaryKey: 'tasks',
    processorId: 'tasks',
    operationsKey: 'tasks',
    persistEntities: true
  },
  {
    id: 'goals',
    summaryKey: 'goals',
    processorId: 'goals',
    operationsKey: 'goals',
    persistEntities: true
  },
  {
    id: 'subagent',
    summaryKey: 'subagent',
    processorId: 'subagent',
    operationsKey: 'subagent',
    persistEntities: false
  },
  {
    id: 'executions',
    summaryKey: 'executions',
    processorId: 'jsExecute',
    operationsKey: 'jsExecute',
    persistEntities: false
  },
  {
    id: 'finalOutput',
    summaryKey: 'finalOutput',
    processorId: 'finalOutput',
    operationsKey: 'finalOutput',
    persistEntities: false
  }
];

/**
 * Default summary envelope used by the tool application pipeline.
 */
export const TOOL_SUMMARY_BLUEPRINT = {
  vault: [],
  memory: [],
  tasks: [],
  goals: [],
  subagent: [],
  executions: [],
  finalOutput: [],
  errors: [],
  duration: 0
};

export default {
  TOOL_OPERATION_PIPELINE,
  TOOL_SUMMARY_BLUEPRINT
};

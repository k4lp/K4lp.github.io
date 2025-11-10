import { invokeSubAgent } from '../../../subagent/sub-agent-api.js';
import { Storage } from '../../../storage/storage.js';

const MAX_QUERY_LENGTH = 600;
const DEFAULT_SCOPE = 'micro';

function parseInteger(value) {
  const num = parseInt(value, 10);
  return Number.isFinite(num) && num > 0 ? num : undefined;
}

function clampList(list = [], limit = 3) {
  if (!Array.isArray(list)) {
    return [];
  }
  return list.filter(Boolean).slice(0, limit);
}

function buildSessionContext() {
  return {
    currentQuery: Storage.loadCurrentQuery?.() || '',
    iteration: window.GDRS?.currentIteration || 0,
    tasks: clampList(Storage.loadTasks?.() || []),
    goals: clampList(Storage.loadGoals?.() || []),
    memory: clampList(Storage.loadMemory?.() || [])
  };
}

export const subagentProcessor = {
  id: 'subagent',
  async process(context, operations = []) {
    if (!Array.isArray(operations) || operations.length === 0) {
      return;
    }

    const summary = context.getSummary();
    summary.subagent = summary.subagent || [];
    const sessionContext = buildSessionContext();

    for (const op of operations) {
      const normalizedQuery = (op.query || op.content || '').trim();
      let scope = (op.scope || DEFAULT_SCOPE).toLowerCase();
      const entry = {
        query: normalizedQuery,
        agentId: op.agent || null,
        status: 'success',
        scope,
        intent: op.intent || null
      };

      if (!normalizedQuery) {
        entry.status = 'error';
        entry.error = 'Sub-agent operation requires a query or body content';
        summary.subagent.push(entry);
        context.recordError({
          type: 'subagent',
          id: op.agent || 'subagent',
          message: entry.error
        });
        continue;
      }

      if (normalizedQuery.length > MAX_QUERY_LENGTH) {
        entry.status = 'error';
        entry.error = `Sub-agent queries must stay under ${MAX_QUERY_LENGTH} characters to keep work scoped.`;
        summary.subagent.push(entry);
        context.recordError({
          type: 'subagent',
          id: op.agent || 'subagent',
          message: entry.error
        });
        continue;
      }

      if (scope !== DEFAULT_SCOPE) {
        entry.warning = `Scope "${scope}" not supported. Falling back to "${DEFAULT_SCOPE}".`;
        scope = DEFAULT_SCOPE;
      }

      try {
        const response = await invokeSubAgent(normalizedQuery, {
          agentId: op.agent,
          timeoutMs: parseInteger(op.timeout),
          cacheTtlMs: parseInteger(op.cacheTtl),
          origin: 'reasoning-loop',
          intent: op.intent,
          scope,
          iteration: sessionContext.iteration,
          sessionContext,
          maxToolResults: parseInteger(op.maxResults)
        });

        entry.responseId = response?.id || null;
        entry.summary = response?.content || '';
        entry.agentName = response?.agentName || op.agent || null;

        context.logActivity({
          type: 'subagent',
          action: 'invoke',
          id: response?.id || entry.agentId || 'subagent',
          status: 'success',
          query: normalizedQuery.slice(0, 160),
          scope,
          intent: op.intent || undefined
        });
      } catch (error) {
        entry.status = 'error';
        entry.error = error.message || String(error);

        context.recordError({
          type: 'subagent',
          id: op.agent || 'subagent',
          message: entry.error
        });

        context.logActivity({
          type: 'subagent',
          action: 'invoke',
          status: 'error',
          query: normalizedQuery.slice(0, 160),
          error: entry.error
        });
      }

      summary.subagent.push(entry);
    }
  }
};

export default subagentProcessor;

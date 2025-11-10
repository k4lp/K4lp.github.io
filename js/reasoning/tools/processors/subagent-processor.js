import { invokeSubAgent } from '../../../subagent/sub-agent-api.js';

function parseInteger(value) {
  const num = parseInt(value, 10);
  return Number.isFinite(num) && num > 0 ? num : undefined;
}

export const subagentProcessor = {
  id: 'subagent',
  async process(context, operations = []) {
    if (!Array.isArray(operations) || operations.length === 0) {
      return;
    }

    const summary = context.getSummary();
    summary.subagent = summary.subagent || [];

    for (const op of operations) {
      const query = op.query || op.content;
      const entry = {
        query: query || '',
        agentId: op.agent || null,
        status: 'success'
      };

      try {
        if (!query || !query.trim()) {
          throw new Error('Sub-agent operation requires a query or body content');
        }

        const response = await invokeSubAgent(query.trim(), {
          agentId: op.agent,
          timeoutMs: parseInteger(op.timeout),
          cacheTtlMs: parseInteger(op.cacheTtl)
        });

        entry.responseId = response?.id || null;
        entry.summary = response?.content || '';
        entry.agentName = response?.agentName || op.agent || null;

        context.logActivity({
          type: 'subagent',
          action: 'invoke',
          id: response?.id || entry.agentId || 'subagent',
          status: 'success',
          query: query.slice(0, 120)
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
          error: entry.error
        });
      }

      summary.subagent.push(entry);
    }
  }
};

export default subagentProcessor;

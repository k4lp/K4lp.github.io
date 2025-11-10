import { Storage } from '../../../storage/storage.js';

export const subAgentTraceProvider = {
  id: 'subAgentTrace',
  description: 'Summarises latest external knowledge sub-agent run.',
  collect() {
    return Storage.loadSubAgentTrace?.();
  },
  format(trace) {
    if (!trace) {
      return null;
    }

    const parts = [
      `**Status:** ${trace.status || 'unknown'} · **Agent:** ${trace.agentName || trace.agentId || 'N/A'}`,
      `**Query:** ${trace.query || 'N/A'}`,
      trace.summary ? `**Summary:** ${trace.summary}` : null,
      trace.error ? `**Error:** ${trace.error}` : null
    ].filter(Boolean);

    if (Array.isArray(trace.toolResults) && trace.toolResults.length > 0) {
      const toolLines = trace.toolResults
        .map((tool = {}) => {
          const label = tool.name || tool.id || 'tool';
          if (tool.error) {
            return `- ${label}: ERROR - ${tool.error}`;
          }
          const first = Array.isArray(tool.items) ? tool.items[0] : tool.items;
          const snippet = summarizeToolItem(first);
          return `- ${label}: ${snippet}`;
        })
        .join('\n');
      parts.push('**Tool Highlights:**', toolLines);
    }

    return parts.join('\n');
  }
};

function summarizeToolItem(item) {
  if (!item) {
    return 'No data returned.';
  }

  if (typeof item === 'string') {
    return item.length > 200 ? `${item.slice(0, 197)}...` : item;
  }

  if (typeof item === 'object') {
    const candidate = item.summary || item.snippet || item.title || JSON.stringify(item);
    if (typeof candidate === 'string') {
      return candidate.length > 200 ? `${candidate.slice(0, 197)}...` : candidate;
    }
  }

  const fallback = String(item);
  return fallback.length > 200 ? `${fallback.slice(0, 197)}...` : fallback;
}

export default subAgentTraceProvider;

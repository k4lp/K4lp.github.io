import { Storage } from '../../../storage/storage.js';

export const externalKnowledgeProvider = {
  id: 'externalKnowledge',
  description: 'Injects cached output from the external knowledge sub-agent.',

  collect() {
    return Storage.loadSubAgentLastResult();
  },

  format(result) {
    if (!result || !result.content) {
      return null;
    }

    const lines = [
      `**Source:** ${result.agentName || result.agentId || 'External Knowledge Agent'}`,
      `**Query:** ${result.query || 'n/a'}`,
      result.toolResults?.length
        ? `**Tools Used:** ${result.toolResults.map((tool) => tool.name || tool.id).join(', ')}`
        : null,
      '',
      result.content.trim()
    ].filter(Boolean);

    if (result.toolResults?.length) {
      lines.push(
        '',
        '**Supporting Evidence:**',
        ...result.toolResults.map((tool) => {
          const label = tool.name || tool.id;
          if (Array.isArray(tool.items)) {
            return `- ${label}: ${tool.items.map((item) => item.title || item.answer || item.url).filter(Boolean)[0] || 'see raw data'}`;
          }
          return `- ${label}: ${tool.summary || 'see raw data'}`;
        })
      );
    }

    return lines.join('\n');
  }
};

export default externalKnowledgeProvider;

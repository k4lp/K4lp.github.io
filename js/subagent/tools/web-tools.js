import { wikipediaSearch, wikipediaSummary } from './apis/wikipedia.js';
import { duckDuckGoInstant } from './apis/duckduckgo.js';
import { groqCompoundSearch } from './groq-tool.js';

export const ToolRegistry = {
  wikipediaSearch,
  wikipediaSummary,
  duckDuckGoInstant,
  groqCompoundSearch
};

export async function runTool(toolName, query, options = {}) {
  const tool = ToolRegistry[toolName];
  if (!tool) {
    throw new Error(`Unknown sub-agent tool: ${toolName}`);
  }
  return tool(query, options);
}

export default ToolRegistry;

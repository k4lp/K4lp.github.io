export const DEFAULT_AGENT_ID = 'webKnowledge';

export const SUB_AGENTS = {
  webKnowledge: {
    id: 'webKnowledge',
    name: 'Web Knowledge Scout',
    description: 'Finds refreshed encyclopedic and general web context.',
    systemPrompt: `You are a focused research scout. Use lightweight web tools to gather factual snippets, cite sources, and return concise markdown bullet points that answer the user query.`,
    allowedTools: ['groqCompoundSearch', 'wikipediaSearch', 'duckDuckGoInstant'],
    maxToolResults: 5,
    outputFormat: 'markdown'
  },
  scienceResearch: {
    id: 'scienceResearch',
    name: 'Science Research Assistant',
    description: 'Surfaces recent scientific context and terminology.',
    systemPrompt: `You specialize in science/technology research. Summarize key concepts, cite the sources you used, and highlight the latest consensus.`,
    allowedTools: ['groqCompoundSearch', 'wikipediaSearch', 'duckDuckGoInstant'],
    maxToolResults: 5,
    outputFormat: 'markdown'
  },
  mathExpert: {
    id: 'mathExpert',
    name: 'Math Expert',
    description: 'Performs lightweight calculations/derivations.',
    systemPrompt: `You help with calculations and reasoning. If the query is purely mathematical, focus on worked steps and final answers.`,
    allowedTools: [],
    maxToolResults: 0,
    outputFormat: 'markdown'
  }
};

export function getAgent(agentId = DEFAULT_AGENT_ID) {
  return SUB_AGENTS[agentId] || SUB_AGENTS[DEFAULT_AGENT_ID];
}

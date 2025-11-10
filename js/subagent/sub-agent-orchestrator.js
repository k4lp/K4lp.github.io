import { SUB_AGENTS, DEFAULT_AGENT_ID, getAgent } from './agents-config.js';
import { GeminiAPI } from '../api/gemini-client.js';
import { Storage } from '../storage/storage.js';
import ToolRegistry, { runTool } from './tools/web-tools.js';
import { eventBus, Events } from '../core/event-bus.js';
import { nowISO } from '../core/utils.js';

const FALLBACK_MODEL = 'models/gemini-1.5-flash';
const DEFAULT_SCOPE = 'micro';
const DEFAULT_TOOL_RESULT_LIMIT = 5;
const TOOL_LABELS = {
  groqCompoundSearch: 'Groq Web Synthesis',
  wikipediaSearch: 'Wikipedia Search',
  duckDuckGoInstant: 'DuckDuckGo Instant Answer',
  wikipediaSummary: 'Wikipedia Summary'
};

function saveTrace(trace) {
  if (!Storage.saveSubAgentTrace) {
    return trace;
  }
  const history = Storage.saveSubAgentTrace(trace);
  eventBus.emit(Events.SUBAGENT_STATE_CHANGED, history);
  return trace;
}

function updateTrace(update, traceId) {
  if (!Storage.updateSubAgentTrace) {
    return null;
  }
  const updated = Storage.updateSubAgentTrace(update, traceId);
  eventBus.emit(Events.SUBAGENT_STATE_CHANGED, Storage.loadSubAgentTraceHistory?.());
  return updated;
}

export class SubAgentOrchestrator {
  /**
   * Run the configured sub-agent.
   * @param {string} agentId
   * @param {string} query
   * @param {object} options
   */
  static async runSubAgent(agentId = DEFAULT_AGENT_ID, query, options = {}) {
    if (!query || !query.trim()) {
      throw new Error('Sub-agent requires a non-empty query');
    }

    const settings = Storage.loadSubAgentSettings?.() || {};
    const effectiveAgentId = agentId || settings.defaultAgent || DEFAULT_AGENT_ID;
    const agent = getAgent(effectiveAgentId);
    if (!agent) {
      throw new Error(`Unknown sub-agent: ${effectiveAgentId}`);
    }

    const cacheTtl = options.cacheTtlMs ?? settings.cacheTtlMs ?? 0;
    const cached = Storage.loadSubAgentLastResult?.();
    if (
      cacheTtl > 0 &&
      cached &&
      cached.query === query &&
      cached.agentId === agent.id &&
      cached.timestamp &&
      Date.now() - cached.timestamp < cacheTtl
    ) {
      saveTrace({
        id: cached.id || `subagent_${nowISO()}`,
        status: 'cached',
        agentId: cached.agentId,
        agentName: cached.agentName,
        query: cached.query,
        startedAt: cached.createdAt || nowISO(),
        finishedAt: nowISO(),
        toolResults: cached.toolResults || [],
        prompt: '',
        summary: cached.content,
        error: null
      });
      return cached;
    }

    const traceId = `subagent_${nowISO()}`;
    const normalizedScope = typeof options.scope === 'string' && options.scope.toLowerCase() === 'micro'
      ? 'micro'
      : DEFAULT_SCOPE;
    const executionContext = {
      intent: options.intent || `Resolve: ${query.slice(0, 140)}`,
      scope: normalizedScope,
      iteration: options.iteration ?? null,
      sessionContext: options.sessionContext || null,
      maxToolResults: options.maxToolResults
    };

    saveTrace({
      id: traceId,
      status: 'running',
      agentId: agent.id,
      agentName: agent.name,
      query,
      scope: executionContext.scope,
      intent: executionContext.intent,
      startedAt: nowISO(),
      toolResults: [],
      prompt: '',
      summary: '',
      error: null
    });

    const toolResults = await this._executeTools(agent, query, executionContext, (entry) => {
      updateTrace((current) => ({
        ...current,
        toolResults: [...(current.toolResults || []), entry]
      }), traceId);
    });
    const prompt = this._buildPrompt(agent, query, toolResults, executionContext);
    updateTrace({ prompt }, traceId);
    const modelId = Storage.loadSelectedModel?.() || FALLBACK_MODEL;

    let response;
    try {
      response = await GeminiAPI.generateContent(modelId, prompt);
    } catch (error) {
      console.error('[SubAgentOrchestrator] Gemini request failed', error);
      updateTrace({
        status: 'error',
        finishedAt: nowISO(),
        error: error.message || 'Gemini request failed'
      }, traceId);
      throw error;
    }

    const content = (GeminiAPI.extractResponseText(response) || '').trim();
    const result = {
      id: traceId,
      agentId: agent.id,
      agentName: agent.name,
      query,
      scope: executionContext.scope,
      intent: executionContext.intent,
      content: content || 'Sub-agent could not produce an answer.',
      toolResults,
      createdAt: nowISO(),
      iterations: 1
    };

    updateTrace({
      status: 'completed',
      finishedAt: nowISO(),
      summary: result.content,
      scope: executionContext.scope,
      intent: executionContext.intent,
      toolResults,
      responseId: traceId
    }, traceId);

    Storage.saveSubAgentLastResult?.(result);
    return result;
  }

  static async _executeTools(agent, query, executionContext = {}, onToolResult) {
    const tools = agent.allowedTools || [];
    if (tools.length === 0) return [];

    const limit = executionContext.maxToolResults || agent.maxToolResults || DEFAULT_TOOL_RESULT_LIMIT;
    const outputs = [];

    for (const toolName of tools) {
      if (!ToolRegistry[toolName]) {
        console.warn(`[SubAgentOrchestrator] Tool "${toolName}" not registered`);
        continue;
      }
      try {
        const data = await runTool(toolName, query, {
          limit,
          intent: executionContext.intent,
          scope: executionContext.scope
        });
        const entry = {
          id: toolName,
          name: TOOL_LABELS[toolName] || toolName,
          retrievedAt: nowISO(),
          items: normalizeToolItems(toolName, data, limit)
        };
        outputs.push(entry);
        onToolResult?.(entry);
      } catch (error) {
        console.warn(`[SubAgentOrchestrator] Tool ${toolName} failed`, error);
        const failureEntry = {
          id: toolName,
          name: TOOL_LABELS[toolName] || toolName,
          error: error.message || 'Tool execution failed',
          retrievedAt: nowISO()
        };
        outputs.push(failureEntry);
        onToolResult?.(failureEntry);
      }
    }
    return outputs;
  }

  static _buildPrompt(agent, query, toolResults, executionContext = {}) {
    const {
      intent,
      scope = DEFAULT_SCOPE,
      sessionContext = {},
      iteration
    } = executionContext;

    const contextLines = [
      sessionContext.currentQuery && sessionContext.currentQuery !== query
        ? `- Primary query: ${sessionContext.currentQuery}`
        : `- Primary query: ${query}`,
      intent ? `- Delegated intent: ${intent}` : null,
      `- Scope: ${scope} (keep the work micro and self-contained)`,
      iteration != null ? `- Main loop iteration: ${iteration}` : null
    ].filter(Boolean);

    const sections = [
      agent.systemPrompt.trim(),
      `## Invocation Context\n${contextLines.join('\n')}`,
      formatEntitySection('Active Tasks', sessionContext.tasks, formatTaskLine),
      formatEntitySection('Active Goals', sessionContext.goals, formatGoalLine),
      formatEntitySection('Pinned Memory', sessionContext.memory, formatMemoryLine),
      `## Tool Evidence\n${formatToolSection(toolResults)}`,
      formatResponseRules()
    ].filter(Boolean);

    return sections.join('\n\n');
  }
}

function formatResponseRules() {
  return [
    '## Response Contract',
    '- Answer only the delegated intent; if evidence is missing, state exactly what is missing.',
    '- Cite every fact inline using `[source](url)` pulled from the tool evidence.',
    '- Never leave placeholders such as `{{}}`, `TBD`, or `??`; produce concrete statements or request a rerun.',
    '- Present results in tight markdown bullets followed by a short \"Next actions\" note tailored for the main thread.'
  ].join('\n');
}

function formatEntitySection(title, list = [], formatter) {
  if (!Array.isArray(list) || list.length === 0 || typeof formatter !== 'function') {
    return null;
  }
  const rows = list.slice(0, 3).map(formatter).filter(Boolean);
  if (!rows.length) {
    return null;
  }
  return `### ${title}\n${rows.join('\n')}`;
}

function formatTaskLine(task = {}) {
  if (!task.heading && !task.content) return null;
  const status = (task.status || 'pending').toUpperCase();
  return `- [${status}] ${task.heading || 'Untitled task'} — ${trimText(task.content || '', 140)}`;
}

function formatGoalLine(goal = {}) {
  if (!goal.heading && !goal.content) return null;
  return `- ${goal.heading || 'Goal'} — ${trimText(goal.content || '', 140)}`;
}

function formatMemoryLine(memory = {}) {
  if (!memory.heading && !memory.content) return null;
  return `- ${memory.heading || 'Memory'}: ${trimText(memory.content || '', 140)}`;
}

function trimText(text = '', limit = 160) {
  if (!text) return '';
  return text.length > limit ? `${text.slice(0, limit - 3)}...` : text;
}

function formatToolSection(toolResults = []) {
  if (!Array.isArray(toolResults) || toolResults.length === 0) {
    return 'No external tool results were retrieved.';
  }

  return toolResults
    .map((tool) => {
      if (tool.error) {
        return `### ${tool.name}\n- ERROR: ${tool.error}`;
      }
      if (!Array.isArray(tool.items) || tool.items.length === 0) {
        return `### ${tool.name}\n- No items returned.`;
      }

      const items = tool.items.slice(0, 3).map((item) => {
        const parts = [
          item.title || 'Result',
          item.summary ? `— ${trimText(item.summary, 200)}` : null,
          item.url ? `(${item.url})` : null,
          item.source ? `[${item.source}]` : null
        ].filter(Boolean);
        return `- ${parts.join(' ')}`;
      }).join('\n');
      return `### ${tool.name}\n${items}`;
    })
    .join('\n\n');
}

function normalizeToolItems(toolName, data, limit) {
  const rawItems = Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data)
      ? data
      : data
        ? [data]
        : [];

  return rawItems
    .filter(Boolean)
    .slice(0, limit)
    .map((item, index) => ({
      title: item.title || item.heading || `Result ${index + 1}`,
      summary: item.summary || item.snippet || item.extract || item.description || '',
      url: item.url || item.link || item.FirstURL || '',
      source: item.source || (TOOL_LABELS[toolName] || toolName),
      retrievedAt: item.retrievedAt || nowISO()
    }));
}

export default SubAgentOrchestrator;

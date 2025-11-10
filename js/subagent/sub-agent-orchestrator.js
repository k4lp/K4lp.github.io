import { SUB_AGENTS, DEFAULT_AGENT_ID, getAgent } from './agents-config.js';
import { GeminiAPI } from '../api/gemini-client.js';
import { Storage } from '../storage/storage.js';
import ToolRegistry, { runTool } from './tools/web-tools.js';
import { eventBus, Events } from '../core/event-bus.js';
import { nowISO } from '../core/utils.js';

const FALLBACK_MODEL = 'models/gemini-1.5-flash';

function saveTrace(trace) {
  if (!Storage.saveSubAgentTrace) {
    return trace;
  }
  const stored = Storage.saveSubAgentTrace(trace);
  eventBus.emit(Events.SUBAGENT_STATE_CHANGED, stored);
  return stored;
}

function updateTrace(update) {
  if (!Storage.updateSubAgentTrace) {
    return null;
  }
  const stored = Storage.updateSubAgentTrace(update);
  eventBus.emit(Events.SUBAGENT_STATE_CHANGED, stored);
  return stored;
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
    saveTrace({
      id: traceId,
      status: 'running',
      agentId: agent.id,
      agentName: agent.name,
      query,
      startedAt: nowISO(),
      toolResults: [],
      prompt: '',
      summary: '',
      error: null
    });

    const toolResults = await this._executeTools(agent, query, (entry) => {
      updateTrace((current) => ({
        ...current,
        toolResults: [...(current.toolResults || []), entry]
      }));
    });
    const prompt = this._buildPrompt(agent, query, toolResults);
    updateTrace({ prompt });
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
      });
      throw error;
    }

    const content = (GeminiAPI.extractResponseText(response) || '').trim();
    const result = {
      id: traceId,
      agentId: agent.id,
      agentName: agent.name,
      query,
      content: content || 'Sub-agent could not produce an answer.',
      toolResults,
      createdAt: nowISO(),
      iterations: 1
    };

    updateTrace({
      status: 'completed',
      finishedAt: nowISO(),
      summary: result.content,
      toolResults,
      responseId: traceId
    });

    Storage.saveSubAgentLastResult?.(result);
    return result;
  }

  static async _executeTools(agent, query, onToolResult) {
    const tools = agent.allowedTools || [];
    if (tools.length === 0) return [];

    const outputs = [];
    for (const toolName of tools) {
      if (!ToolRegistry[toolName]) {
        console.warn(`[SubAgentOrchestrator] Tool "${toolName}" not registered`);
        continue;
      }
      try {
        const data = await runTool(toolName, query, {
          limit: agent.maxToolResults || 5
        });
        const entry = {
          id: toolName,
          name: toolName,
          items: Array.isArray(data) ? data.slice(0, agent.maxToolResults || 5) : data
        };
        outputs.push(entry);
        onToolResult?.(entry);
      } catch (error) {
        console.warn(`[SubAgentOrchestrator] Tool ${toolName} failed`, error);
        onToolResult?.({
          id: toolName,
          name: toolName,
          error: error.message || 'Tool execution failed'
        });
      }
    }
    return outputs;
  }

  static _buildPrompt(agent, query, toolResults) {
    const toolSection = toolResults.length
      ? toolResults
        .map((tool) => {
          const preview = Array.isArray(tool.items)
            ? tool.items
                .slice(0, 3)
                .map((item) => item.title || item.summary || item.snippet || JSON.stringify(item).slice(0, 140))
                .join('\n- ')
            : JSON.stringify(tool.items).slice(0, 400);
          return `### ${tool.name}\n- ${preview}`;
        })
        .join('\n\n')
      : 'No external tool results were retrieved.';

    return [
      agent.systemPrompt.trim(),
      `## User Query\n${query}`,
      `## Tool Results\n${toolSection}`,
      'Respond in markdown with concise findings, cite sources inline, and highlight the most actionable facts.'
    ].join('\n\n');
  }
}

export default SubAgentOrchestrator;

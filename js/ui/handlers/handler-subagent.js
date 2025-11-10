import { invokeSubAgent } from '../../subagent/sub-agent-api.js';
import { Storage } from '../../storage/storage.js';
import { nowISO } from '../../core/utils.js';

export function bindSubAgentHandlers() {
  const runBtn = document.getElementById('subAgentRunBtn');
  if (!runBtn) return;

  runBtn.addEventListener('click', async () => {
    const queryEl = document.getElementById('userQuery');
    const query = queryEl?.value?.trim();
    if (!query) {
      alert('Enter a research query before running the sub-agent.');
      return;
    }

    const settings = Storage.loadSubAgentSettings?.() || {};
    if (!settings.enableSubAgent) {
      alert('Enable the sub-agent toggle first.');
      return;
    }

    runBtn.disabled = true;
    const originalLabel = runBtn.textContent;
    runBtn.textContent = 'Running...';

    appendReasoningLog([
      '=== SUB-AGENT MANUAL INVOCATION ===',
      `Timestamp: ${nowISO()}`,
      `Query: ${query}`
    ]);

    try {
      await invokeSubAgent(query, {
        agentId: settings.defaultAgent,
        cacheTtlMs: settings.cacheTtlMs,
        timeoutMs: settings.timeoutMs
      });
    } catch (error) {
      console.error('[SubAgent] Manual invocation failed', error);
      alert(`Sub-agent failed: ${error.message || error}`);
    } finally {
      runBtn.disabled = false;
      runBtn.textContent = originalLabel;
    }
  });
}

function appendReasoningLog(lines) {
  const log = Storage.loadReasoningLog?.() || [];
  log.push(lines.join('\n'));
  Storage.saveReasoningLog?.(log);
}

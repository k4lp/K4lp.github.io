import { KeyRing } from './keyring.js';
import { MemoryStore } from './memory.js';
import { HTMLCanvas } from './canvas.js';
import { ExternalTools } from './tools.js';
import { GeminiClient } from './gemini.js';
import { SYSTEM_PROMPT } from './prompts.js';

const keyring = new KeyRing();
const memory = new MemoryStore();

document.addEventListener('DOMContentLoaded', () => {
  const els = {
    settingsBtn: document.getElementById('settings-btn'),
    settingsModal: document.getElementById('settings-modal'),
    saveSettingsBtn: document.getElementById('save-settings-btn'),
    cancelSettingsBtn: document.getElementById('cancel-settings-btn'),
    apiKeyInput: document.getElementById('api-key-input'),
    modelInput: document.getElementById('model-input'),
    activeModel: document.getElementById('active-model'),

    newChatBtn: document.getElementById('new-chat'),
    clearChatBtn: document.getElementById('clear-chat'),

    addMemoryBtn: document.getElementById('add-memory-btn'),
    memoryList: document.getElementById('memory-list'),

    goalsText: document.getElementById('goals-text'),
    saveGoalsBtn: document.getElementById('save-goals-btn'),

    showTrace: document.getElementById('show-trace'),
    traceLog: document.getElementById('trace-log'),

    toolsLog: document.getElementById('tools-log'),

    chatMessages: document.getElementById('chat-messages'),
    userInput: document.getElementById('user-input'),
    sendBtn: document.getElementById('send-btn'),
    composer: document.getElementById('composer'),

    canvasEl: document.getElementById('html-canvas'),
    clearCanvasBtn: document.getElementById('clear-canvas-btn'),

    jsCode: document.getElementById('js-code'),
    runJsBtn: document.getElementById('run-js-btn'),
    jsOutput: document.getElementById('js-output'),

    console: document.getElementById('console'),
    consoleOutput: document.getElementById('console-output'),
    clearConsoleBtn: document.getElementById('clear-console-btn'),
  };

  const htmlCanvas = new HTMLCanvas(els.canvasEl);
  const varsRef = {};

  async function runUserJS(code) {
    console.log(`Executing JS:`, code);
    let output = '';
    let lastValue = undefined;
    try {
      const oldLog = console.log;
      console.log = (...args) => {
        output += args.map(a => JSON.stringify(a)).join(' ') + '\n';
        oldLog.apply(console, args);
      };
      lastValue = await eval(code);
      console.log = oldLog;
    } catch (e) {
      output += `Execution Error: ${e.message}\nStack: ${e.stack}`;
    }
    return { output, lastValue };
  }

  const tools = new ExternalTools({ memory, canvas: htmlCanvas, varsRef, runUserJS });

  function getModel() {
    const model = els.modelInput.value || 'gemini-2.0-flash';
    return model;
  }

  const client = new GeminiClient({ keyring, getModel, systemPromptProvider: () => SYSTEM_PROMPT });

  const chatState = {
    history: [],
    iterative: [],
  };

  function setupInlineConsole() {
    const nativeLog = console.log;
    const nativeError = console.error;
    const nativeWarn = console.warn;

    function logToScreen(message, type = 'log') {
      const el = document.createElement('div');
      el.textContent = message;
      el.classList.add(`log-${type}`);
      els.consoleOutput.appendChild(el);
      els.consoleOutput.scrollTop = els.consoleOutput.scrollHeight;
    }

    console.log = (...args) => {
      nativeLog.apply(console, args);
      const message = args.map(a => JSON.stringify(a)).join(' ');
      logToScreen(message, 'log');
    };

    console.error = (...args) => {
      nativeError.apply(console, args);
      const message = args.map(a => a instanceof Error ? a.stack : JSON.stringify(a)).join(' ');
      logToScreen(message, 'error');
    };

    console.warn = (...args) => {
      nativeWarn.apply(console, args);
      const message = args.map(a => JSON.stringify(a)).join(' ');
      logToScreen(message, 'warn');
    };

    els.clearConsoleBtn.addEventListener('click', () => {
      els.consoleOutput.innerHTML = '';
    });

    window.addEventListener('error', (event) => {
      console.error(event.error);
    });
  }
  setupInlineConsole();

  function renderMemory() {
    els.memoryList.innerHTML = '';
    memory.list().forEach((m, i) => {
      const div = document.createElement('div');
      div.className = 'memory-item';
      div.innerHTML = `<div><strong>${escapeHTML(m.summary)}</strong></div><div class="muted">${truncate(m.details, 120)}</div>
        <div class="controls"><button data-i="${i}" class="btn btn-del">Delete</button></div>`;
      els.memoryList.appendChild(div);
    });
    els.memoryList.querySelectorAll('.btn-del').forEach(btn => {
      btn.addEventListener('click', () => {
        memory.del(Number(btn.dataset.i));
        renderMemory();
      });
    });
  }
  renderMemory();

  els.addMemoryBtn.addEventListener('click', () => {
    const summary = prompt('Summary:') || '';
    const details = prompt('Details:') || '';
    if (summary) {
      memory.add(summary, details);
      renderMemory();
    }
  });

  els.saveGoalsBtn.addEventListener('click', () => {
    memory.setGoals(els.goalsText.value || "");
  });

  els.showTrace.addEventListener('change', () => {
    els.traceLog.classList.toggle('hidden', !els.showTrace.checked);
  });

  els.runJsBtn.addEventListener('click', async () => {
    const res = await runUserJS(els.jsCode.value);
    els.jsOutput.textContent = res.output + (res.lastValue ? `\n[return] ${res.lastValue}` : '');
  });

  els.clearCanvasBtn.addEventListener('click', () => {
    htmlCanvas.clear();
  });

  els.settingsBtn.addEventListener('click', () => {
    const savedKey = keyring.get('gemini-api-key');
    const savedModel = localStorage.getItem('gemini-model') || 'gemini-2.0-flash';
    if (savedKey) {
      els.apiKeyInput.value = savedKey;
    }
    els.modelInput.value = savedModel;
    els.settingsModal.classList.add('open');
  });

  els.saveSettingsBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const apiKey = els.apiKeyInput.value.trim();
    const model = els.modelInput.value;
    if (!apiKey) {
      alert('Please enter an API key');
      return;
    }
    keyring.set('gemini-api-key', apiKey);
    localStorage.setItem('gemini-model', model);
    els.activeModel.textContent = getModel();
    els.settingsModal.classList.remove('open');
  });

  els.cancelSettingsBtn.addEventListener('click', (e) => {
    e.preventDefault();
    els.settingsModal.classList.remove('open');
  });

  function addMessage(role, content) {
    const row = document.createElement('div');
    row.className = `msg ${role}`;
    row.innerHTML = `<div class="role">${role}</div><div class="bubble"></div>`;
    row.querySelector('.bubble').textContent = content;
    els.chatMessages.appendChild(row);
    els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
    return row.querySelector('.bubble');
  }

  function appendToBubble(bubble, text) {
    bubble.textContent += text;
    els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
  }

  function logTool(msg) {
    const line = document.createElement('div');
    line.textContent = msg;
    els.toolsLog.appendChild(line);
    els.toolsLog.scrollTop = els.toolsLog.scrollHeight;
  }

  function logTrace(msg) {
    chatState.iterative.push(msg);
    const line = document.createElement('div');
    line.textContent = msg;
    els.traceLog.appendChild(line);
    els.traceLog.scrollTop = els.traceLog.scrollHeight;
  }

  function assembleContextPrefix() {
    const memSummaries = memory.list().map((m, i) => `[${i}] ${m.summary}`).join('\n');
    const goals = memory.getGoals();
    return [
      { role: 'user', content: `Session Memory Index:\n${memSummaries}\n\nGoals:\n${goals}\n\nImmediate Reasoning Chain (for this reply):\n- ` }
    ];
  }

  function applyPlaceholders(text) {
    return text.replace(/\{\{var:([a-zA-Z0-9_\-]+)\}\}/g, (_, name) => varsRef[name] ?? '');
  }

  async function orchestrate(userText) {
    addMessage('user', userText);
    chatState.iterative = [];
    els.traceLog.innerHTML = '';
    const bubble = addMessage('assistant', '');

    const prefix = assembleContextPrefix();
    const messages = [
      ...prefix,
      ...chatState.history,
      { role: 'user', content: userText }
    ];

    let buffer = '';
    let finalized = false;

    await client.streamChat({
      messages,
      onText: (t) => {
        buffer += t;
        const finalBlock = ExternalTools.tryParseFinal(buffer);
        if (finalBlock) {
          finalized = true;
          const rendered = applyPlaceholders(finalBlock.content);
          bubble.textContent = rendered;
          return;
        }
        const tc = ExternalTools.tryParseToolCall(buffer);
        if (tc) {
          executeToolCall(tc).catch(err => logTool(`Tool error: ${err}`));
          buffer = '';
          return;
        }
        appendToBubble(bubble, t);
      },
      onPartialJSON: (t) => {
        if (t.includes('"iterative_reasoning"')) {
          try {
            const reasoning = JSON.parse(t);
            if (reasoning.iterative_reasoning) {
              logTrace(reasoning.iterative_reasoning);
            }
          } catch (e) {
            // Ignore
          }
        }
      }
    });

    if (!finalized) {
      bubble.textContent = applyPlaceholders(bubble.textContent);
    }

    chatState.history.push({ role: 'user', content: userText });
    chatState.history.push({ role: 'model', content: bubble.textContent });
  }

  async function executeToolCall(tc) {
    logTool(`→ ${tc.name}`);
    const res = await tools.dispatch(tc);
    logTool(`← ${tc.name} ${res.ok ? 'ok' : 'error'}`);
    chatState.history.push({ role: 'user', content: `Tool observation for ${tc.name}:\n${JSON.stringify(res).slice(0, 4000)}` });
  }

  async function handleSubmit() {
    const text = els.userInput.value.trim();
    if (!text) {
      return;
    }
    els.userInput.value = '';
    try {
      await orchestrate(text);
    } catch (err) {
      console.error('Error during orchestration:', err);
      const b = addMessage('assistant', '');
      appendToBubble(b, `Error: ${err.message || String(err)}`);
    }
  }

  els.composer.addEventListener('submit', (e) => {
    e.preventDefault();
    handleSubmit();
  });

  els.sendBtn.addEventListener('click', (e) => {
    e.preventDefault();
    handleSubmit();
  });

  function escapeHTML(s) { return s.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])) }
  function truncate(s, n) { return s.length > n ? s.slice(0, n - 1) + '…' : s }

  const initialHeight = els.userInput.scrollHeight;
  els.userInput.addEventListener('input', () => {
    els.userInput.style.height = 'auto';
    els.userInput.style.height = `${Math.max(initialHeight, els.userInput.scrollHeight)}px`;
  });

  els.newChatBtn.addEventListener('click', () => {
    if (confirm('Start a new chat? Current conversation will be cleared.')) {
      els.chatMessages.innerHTML = '';
      els.userInput.value = '';
      chatState.history = [];
    }
  });

  els.clearChatBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear the chat history?')) {
      els.chatMessages.innerHTML = '';
      chatState.history = [];
    }
  });

  console.log('App initialized successfully');
});
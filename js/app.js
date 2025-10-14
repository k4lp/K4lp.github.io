const keyring = new KeyRing();
const memory = new MemoryStore();

document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM fully loaded and parsed');

  const els = {
    settings: document.getElementById('settings'),
    openSettings: document.getElementById('open-settings'),
    cancelSettings: document.getElementById('cancel-settings'),
    saveSettings: document.getElementById('save-settings'),
    apiKeyInput: document.getElementById('api-key'),
    modelSelect: document.getElementById('model'),
    chatMessages: document.getElementById('chat-messages'),
    userInput: document.getElementById('user-input'),
    sendButton: document.getElementById('send-button'),
    clearButton: document.getElementById('clear-chat'),
    newChatButton: document.getElementById('new-chat'),
    addMemory: document.getElementById('add-memory'),
    memoryList: document.getElementById('memory-list'),
    goalsText: document.getElementById('goals-text'),
    saveGoals: document.getElementById('save-goals'),
    jsCode: document.getElementById('js-code'),
    runJS: document.getElementById('run-js'),
    jsOutput: document.getElementById('js-output'),
    canvasEl: document.getElementById('html-canvas'),
    clearCanvas: document.getElementById('clear-canvas'),
    consoleOutput: document.getElementById('console-output'),
    clearConsole: document.getElementById('clear-console'),
    showTrace: document.getElementById('show-trace'),
    traceLog: document.getElementById('trace-log'),
    toolsLog: document.getElementById('tools-log'),
    activeModel: document.getElementById('active-model'),
    messages: document.getElementById('chat-messages'),
    prompt: document.getElementById('user-input'),
    composer: document.getElementById('composer'),
  };

  const htmlCanvas = new HTMLCanvas(els.canvasEl);
  const varsRef = {};

  async function runUserJS(code) {
    // WARNING: This uses eval() and can execute arbitrary code.
    // This is a major security risk in a real application.
    // It is implemented here as per the user's specific request.
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
      console.log = oldLog; // Restore original console.log
    } catch (e) {
      output += `Execution Error: ${e.message}\nStack: ${e.stack}`;
    }
    return { output, lastValue };
  }

  const tools = new ExternalTools({memory, canvas: htmlCanvas, varsRef, runUserJS});

  function getModel() {
    const model = els.modelSelect.value || 'gemini-2.0-flash';
    console.log(`Using model: ${model}`);
    return model;
  }

  function systemPrompt() {
    console.log('Getting system prompt');
    return SYSTEM_PROMPT;
  }

  const client = new GeminiClient({ keyring, getModel, systemPromptProvider: systemPrompt });

  const chatState = {
    history: [], // {role:'user'|'model', content:string}
    iterative: [], // per-turn steps
  };

  // UI wiring
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

  els.addMemory.addEventListener('click', () => {
    console.log('Add memory button clicked');
    const summary = prompt('Summary:') || '';
    const details = prompt('Details:') || '';
    if (summary) {
      console.log('Adding new memory:', { summary, details });
      memory.add(summary, details);
      renderMemory();
    } else {
      console.log('Add memory cancelled');
    }
  });

  els.saveGoals.addEventListener('click', () => {
    console.log('Saving goals');
    memory.setGoals(els.goalsText.value || "");
  });

  els.showTrace.addEventListener('change', () => {
    els.traceLog.classList.toggle('hidden', !els.showTrace.checked);
  });

  els.runJS.addEventListener('click', async () => {
    console.log('Run JS button clicked');
    const res = await runUserJS(els.jsCode.value);
    els.jsOutput.textContent = res.output + (res.lastValue ? `\n[return] ${res.lastValue}` : '');
    console.log('JS execution complete');
  });

  els.clearCanvas.addEventListener('click', () => {
    console.log('Clear canvas button clicked');
    htmlCanvas.clear();
  });

  els.openSettings.addEventListener('click', (e) => {
    console.log('--- OPEN SETTINGS CLICKED ---');
    e.preventDefault();
    const savedKey = keyring.get('gemini-api-key');
    const savedModel = localStorage.getItem('gemini-model') || 'gemini-2.0-flash';
    if (savedKey) {
      els.apiKeyInput.value = savedKey;
    }
    els.modelSelect.value = savedModel;
    els.settings.classList.add('open');
    console.log('Settings modal opened.');
  });

  els.saveSettings.addEventListener('click', (e) => {
    console.log('Saving settings...');
    e.preventDefault();
    const apiKey = els.apiKeyInput.value.trim();
    const model = els.modelSelect.value;
    if (!apiKey) {
      alert('Please enter an API key');
      return;
    }
    keyring.set('gemini-api-key', apiKey);
    localStorage.setItem('gemini-model', model);
    els.activeModel.textContent = getModel();
    els.settings.classList.remove('open');
    console.log('Settings saved and modal closed.');
  });

  els.cancelSettings.addEventListener('click', (e) => {
    console.log('Canceling settings...');
    e.preventDefault();
    els.settings.classList.remove('open');
    console.log('Settings modal closed without saving.');
  });

  els.clearConsole.addEventListener('click', () => {
    els.consoleOutput.innerHTML = '';
  });

  function addMessage(role, content) {
    const row = document.createElement('div');
    row.className = `msg ${role}`;
    row.innerHTML = `<div class="role">${role}</div><div class="bubble"></div>`;
    row.querySelector('.bubble').textContent = content;
    els.messages.appendChild(row);
    els.messages.scrollTop = els.messages.scrollHeight;
    return row.querySelector('.bubble');
  }

  function appendToBubble(bubble, text) {
    bubble.textContent += text;
    els.messages.scrollTop = els.messages.scrollHeight;
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
    // Pack Memory summaries, selected details on demand via tool calls
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
    console.log('Orchestration started for user text:', userText);
    // Show user
    addMessage('user', userText);
    chatState.iterative = [];
    els.traceLog.innerHTML = '';
    const bubble = addMessage('assistant', '');

    // Prepare messages
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
        // Try to avoid showing tool protocol publicly; show only safe prose until final.
        const finalBlock = ExternalTools.tryParseFinal(buffer);
        if (finalBlock) {
          finalized = true;
          const rendered = applyPlaceholders(finalBlock.content);
          // Replace bubble with final content
          bubble.textContent = rendered;
          return;
        }
        const tc = ExternalTools.tryParseToolCall(buffer);
        if (tc) {
          // Hide tool call from the chat, execute and continue (no append)
          executeToolCall(tc).catch(err => logTool(`Tool error: ${err}`));
          // Clear the buffer after processing the tool call
          buffer = '';
          return;
        }
        // Otherwise, append visible prose incrementally (but keep minimal until final)
        appendToBubble(bubble, t);
      },
      onPartialJSON: (t) => {
        // Lightly parse iterative reasoning markers if the model emits them as plain text
        if (t.includes('"iterative_reasoning"')) {
          try {
            const reasoning = JSON.parse(t);
            if (reasoning.iterative_reasoning) {
              logTrace(reasoning.iterative_reasoning);
            }
          } catch (e) {
            // Ignore parsing errors
          }
        }
      }
    });

    // Done streaming
    if (!finalized) {
      // If no final block arrived, accept the streamed text as-is (after placeholders)
      bubble.textContent = applyPlaceholders(bubble.textContent);
    }

    // Update chat history with final visible text
    chatState.history.push({ role: 'user', content: userText });
    chatState.history.push({ role: 'model', content: bubble.textContent });
  }

  async function executeToolCall(tc) {
    console.log('Executing tool call:', tc);
    logTool(`→ ${tc.name}`);
    const res = await tools.dispatch(tc);
    logTool(`← ${tc.name} ${res.ok ? 'ok' : 'error'}`);
    console.log('Tool call result:', res);
    // Feed observation back as a hidden assistant message to inform next iteration
    chatState.history.push({ role: 'user', content: `Tool observation for ${tc.name}:\n${JSON.stringify(res).slice(0, 4000)}` });
  }

  async function handleSubmit() {
    console.log('Handling submit');
    const text = els.prompt.value.trim();
    if (!text) {
      console.log('Empty prompt, not submitting');
      return;
    }
    console.log('Prompt text:', text);
    els.prompt.value = '';
    try {
      await orchestrate(text);
    } catch (err) {
      console.error('Error during orchestration:', err);
      const b = addMessage('assistant', '');
      appendToBubble(b, `Error: ${err.message || String(err)}`);
    }
  }

  els.composer.addEventListener('submit', (e) => {
    console.log('Composer submit event');
    e.preventDefault();
    handleSubmit();
  });

  els.sendButton.addEventListener('click', (e) => {
    console.log('Send button click event');
    e.preventDefault();
    handleSubmit();
  });

  function escapeHTML(s) { return s.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])) }
  function truncate(s, n) { return s.length > n ? s.slice(0, n - 1) + '…' : s }

  // Auto-resize textarea
  const initialHeight = els.prompt.scrollHeight;
  els.prompt.addEventListener('input', () => {
    els.prompt.style.height = 'auto';
    els.prompt.style.height = `${Math.max(initialHeight, els.prompt.scrollHeight)}px`;
  });

  // New Chat Handler
  if (els.newChatButton) {
    els.newChatButton.addEventListener('click', function(e) {
      console.log('--- NEW CHAT CLICKED ---');
      e.preventDefault();

      if (confirm('Start a new chat? Current conversation will be cleared.')) {
        els.chatMessages.innerHTML = '';
        els.userInput.value = '';
        chatState.history = [];
        console.log('New chat started.');
      }
    });
  }

  // Clear Chat Handler
  if (els.clearButton) {
    els.clearButton.addEventListener('click', function(e) {
      console.log('--- CLEAR CHAT CLICKED ---');
      e.preventDefault();

      if (confirm('Are you sure you want to clear the chat history?')) {
        els.chatMessages.innerHTML = '';
        chatState.history = [];
        console.log('Chat cleared.');
      }
    });
  }

  console.log('App initialized successfully');
});
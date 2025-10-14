// js/app.js
(function(){
  const els = {
    messages: document.getElementById('messages'),
    prompt: document.getElementById('prompt'),
    send: document.getElementById('send'),
    composer: document.getElementById('composer'),
    memoryList: document.getElementById('memory-list'),
    addMemory: document.getElementById('add-memory'),
    goalsText: document.getElementById('goals-text'),
    saveGoals: document.getElementById('save-goals'),
    toolsLog: document.getElementById('tools-log'),
    traceLog: document.getElementById('trace-log'),
    showTrace: document.getElementById('show-trace'),
    canvasEl: document.getElementById('html-canvas'),
    clearCanvas: document.getElementById('clear-canvas'),
    jsCode: document.getElementById('js-code'),
    runJS: document.getElementById('run-js'),
    jsOutput: document.getElementById('js-output'),
    settings: document.getElementById('settings'),
    openSettings: document.getElementById('open-settings'),
    saveSettings: document.getElementById('save-settings'),
    cancelSettings: document.getElementById('cancel-settings'),
    model: document.getElementById('model'),
    activeModel: document.getElementById('active-model'),
    keyInputs: [
      document.getElementById('key-1'),
      document.getElementById('key-2'),
      document.getElementById('key-3'),
      document.getElementById('key-4'),
      document.getElementById('key-5'),
    ],
  };

  const keyring = new KeyRing();
  const memory = new MemoryStore();
  els.goalsText.value = memory.getGoals();
  const htmlCanvas = new HTMLCanvas(els.canvasEl);
  const varsRef = {};
  async function runUserJS(code){
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

  function getModel(){ return els.model.value || 'gemini-2.5-flash-latest' }
  function systemPrompt(){ return SYSTEM_PROMPT }

  const client = new GeminiClient({ keyring, getModel, systemPromptProvider: systemPrompt });

  const chatState = {
    history: [], // {role:'user'|'model', content:string}
    iterative: [], // per-turn steps
  };

  // UI wiring
  function renderMemory(){
    els.memoryList.innerHTML = '';
    memory.list().forEach((m, i)=>{
      const div = document.createElement('div');
      div.className = 'memory-item';
      div.innerHTML = `<div><strong>${escapeHTML(m.summary)}</strong></div><div class="muted">${truncate(m.details, 120)}</div>
        <div class="controls"><button data-i="${i}" class="btn btn-del">Delete</button></div>`;
      els.memoryList.appendChild(div);
    });
    els.memoryList.querySelectorAll('.btn-del').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        memory.del(Number(btn.dataset.i));
        renderMemory();
      });
    });
  }
  renderMemory();

  els.addMemory.addEventListener('click', ()=>{
    const summary = prompt('Summary:') || '';
    const details = prompt('Details:') || '';
    if(summary){ memory.add(summary, details); renderMemory() }
  });
  els.saveGoals.addEventListener('click', ()=> memory.setGoals(els.goalsText.value||""));

  els.showTrace.addEventListener('change', ()=>{
    els.traceLog.classList.toggle('hidden', !els.showTrace.checked);
  });

  els.runJS.addEventListener('click', async ()=>{
    const res = await runUserJS(els.jsCode.value);
    els.jsOutput.textContent = res.output + (res.lastValue? `\n[return] ${res.lastValue}` : '');
  });
  els.clearCanvas.addEventListener('click', ()=> htmlCanvas.clear());

  els.openSettings.addEventListener('click', ()=>{
    console.log('--- OPEN SETTINGS CLICKED ---');
    // load keys
    keyring.state.keys.forEach((k, i)=> els.keyInputs[i].value = k);
    els.model.value = getModel();
    els.settings.style.display = 'flex';
    console.log('Settings modal display style set to flex.');
  });
  els.saveSettings.addEventListener('click', ()=>{
    console.log('Saving settings...');
    keyring.setKey(0, els.keyInputs[0].value);
    keyring.setKey(1, els.keyInputs[1].value);
    keyring.setKey(2, els.keyInputs[2].value);
    keyring.setKey(3, els.keyInputs[3].value);
    keyring.setKey(4, els.keyInputs[4].value);
    els.activeModel.textContent = getModel();
    els.settings.style.display = 'none';
    console.log('Settings saved and modal closed.');
  });

  els.cancelSettings.addEventListener('click', (e)=>{
    console.log('Canceling settings...');
    e.preventDefault();
    els.settings.style.display = 'none';
    console.log('Settings modal closed without saving.');
  });

  function addMessage(role, content){
    const row = document.createElement('div');
    row.className = `msg ${role}`;
    row.innerHTML = `<div class="role">${role}</div><div class="bubble"></div>`;
    row.querySelector('.bubble').textContent = content;
    els.messages.appendChild(row);
    els.messages.scrollTop = els.messages.scrollHeight;
    return row.querySelector('.bubble');
  }

  function appendToBubble(bubble, text){
    bubble.textContent += text;
    els.messages.scrollTop = els.messages.scrollHeight;
  }

  function logTool(msg){
    const line = document.createElement('div');
    line.textContent = msg;
    els.toolsLog.appendChild(line);
    els.toolsLog.scrollTop = els.toolsLog.scrollHeight;
  }

  function logTrace(msg){
    chatState.iterative.push(msg);
    const line = document.createElement('div');
    line.textContent = msg;
    els.traceLog.appendChild(line);
    els.traceLog.scrollTop = els.traceLog.scrollHeight;
  }

  function assembleContextPrefix(){
    // Pack Memory summaries, selected details on demand via tool calls
    const memSummaries = memory.list().map((m,i)=> `[${i}] ${m.summary}`).join('\n');
    const goals = memory.getGoals();
    return [
      { role: 'user', content: `Session Memory Index:\n${memSummaries}\n\nGoals:\n${goals}\n\nImmediate Reasoning Chain (for this reply):\n- ` }
    ];
  }

  function applyPlaceholders(text){
    return text.replace(/\{\{var:([a-zA-Z0-9_\-]+)\}\}/g, (_,name)=> varsRef[name] ?? '');
  }

  async function orchestrate(userText){
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
      onText: (t)=>{
        buffer += t;
        // Try to avoid showing tool protocol publicly; show only safe prose until final.
        const finalBlock = ExternalTools.tryParseFinal(buffer);
        if(finalBlock){
          finalized = true;
          const rendered = applyPlaceholders(finalBlock.content);
          // Replace bubble with final content
          bubble.textContent = rendered;
          return;
        }
        const tc = ExternalTools.tryParseToolCall(buffer);
        if(tc){
          // Hide tool call from the chat, execute and continue (no append)
          executeToolCall(tc).catch(err=> logTool(`Tool error: ${err}`));
          // Clear the buffer after processing the tool call
          buffer = '';
          return;
        }
        // Otherwise, append visible prose incrementally (but keep minimal until final)
        appendToBubble(bubble, t);
      },
      onPartialJSON: (t)=>{
        // Lightly parse iterative reasoning markers if the model emits them as plain text
        if(t.includes('"iterative_reasoning"')){
          try {
            const reasoning = JSON.parse(t);
            if(reasoning.iterative_reasoning){
              logTrace(reasoning.iterative_reasoning);
            }
          } catch(e) {
            // Ignore parsing errors
          }
        }
      }
    });

    // Done streaming
    if(!finalized){
      // If no final block arrived, accept the streamed text as-is (after placeholders)
      bubble.textContent = applyPlaceholders(bubble.textContent);
    }

    // Update chat history with final visible text
    chatState.history.push({ role:'user', content:userText });
    chatState.history.push({ role:'model', content:bubble.textContent });
  }

  async function executeToolCall(tc){
    console.log('Executing tool call:', tc);
    logTool(`→ ${tc.name}`);
    const res = await tools.dispatch(tc);
    logTool(`← ${tc.name} ${res.ok ? 'ok' : 'error'}`);
    console.log('Tool call result:', res);
    // Feed observation back as a hidden assistant message to inform next iteration
    chatState.history.push({ role:'user', content: `Tool observation for ${tc.name}:\n${JSON.stringify(res).slice(0,4000)}` });
  }

  async function handleSubmit(){
    const text = els.prompt.value.trim();
    if(!text) return;
    els.prompt.value = '';
    try{
      await orchestrate(text);
    }catch(err){
      const b = addMessage('assistant', '');
      appendToBubble(b, `Error: ${err.message||String(err)}`);
    }
  }

  els.composer.addEventListener('submit', (e)=>{
    e.preventDefault();
    handleSubmit();
  });
  els.send.addEventListener('click', (e)=>{
    e.preventDefault();
    handleSubmit();
  });

  function escapeHTML(s){ return s.replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;' }[m])) }
  function truncate(s, n){ return s.length>n ? s.slice(0,n-1)+'…' : s }

  // Auto-resize textarea
  const initialHeight = els.prompt.scrollHeight;
  els.prompt.addEventListener('input', ()=>{
    els.prompt.style.height = 'auto';
    els.prompt.style.height = `${Math.max(initialHeight, els.prompt.scrollHeight)}px`;
  });

})();

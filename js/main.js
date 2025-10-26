// main.js – orchestrator/UI runtime (see user-provided spec)
import { orchestrateResearch } from './gemini.js';
import { substituteVaultRefs, safeStringify } from './tools.js';

const LS = { CORE: 'gdrs_core_state_v1' };
const MAX_KEYS = 5;
const TICK = 1000;

const D = (id) => document.getElementById(id);
const dom = {
  modelSelect: D('modelSelect'),
  runQueryBtn: D('runQueryBtn'),
  runQueryBtn2: D('runQueryBtn2'),
  userQuery: D('userQuery'),
  finalOutput: D('finalOutput'),
  finalStatus: D('finalStatus'),
  iterationLog: D('iterationLog'),
  iterationCount: D('iterationCount'),
  keysGrid: D('keysGrid'),
  validateKeys: D('validateKeys'),
  clearKeys: D('clearKeys'),
  keyRotationPill: D('keyRotationPill'),
  execBtn: D('execBtn'),
  clearExec: D('clearExec'),
  codeInput: D('codeInput'),
  execOutput: D('execOutput'),
  execStatus: D('execStatus'),
  tasksList: D('tasksList'),
  memoryList: D('memoryList'),
  goalsList: D('goalsList'),
  vaultList: D('vaultList'),
  vaultModal: D('vaultModal'),
  vaultModalId: D('vaultModalId'),
  vaultModalType: D('vaultModalType'),
  vaultModalDesc: D('vaultModalDesc'),
  vaultModalContent: D('vaultModalContent'),
  vaultModalClose: D('vaultModalClose'),
};

let state = load() || bootState();

function bootState(){
  return {
    apiKeys: Array.from({length:MAX_KEYS},()=>({value:'',usage:0,status:'unknown',cooldownUntil:0,valid:false})),
    activeKeyIndex: 0,
    modelId: '',
    tasks: [], memories: [], goals: [],
    vault: {},
    iterationLog: [], iterationCount: 0,
    finalOutput: '', finalStatus: 'idle'
  };
}

function load(){ try{ return JSON.parse(localStorage.getItem(LS.CORE)); }catch{ return null; } }
function save(){ try{ localStorage.setItem(LS.CORE, JSON.stringify(state)); }catch{} }

function persistRender(){ save(); renderAll(); }

function renderAll(){
  renderKeys(); renderKeyMeta(); renderModel(); renderFinal();
  renderTasks(); renderMemories(); renderGoals(); renderLog(); renderVault();
}

function renderKeys(){
  const g = dom.keysGrid; g.innerHTML='';
  state.apiKeys.forEach((k,i)=>{
    const row = document.createElement('div'); row.className='keyrow';
    const field = document.createElement('input'); field.type='password'; field.placeholder=`API Key #${i+1}`; field.value=k.value; field.autocomplete='off'; field.spellcheck=false;
    field.addEventListener('input',e=>{ const v=e.target.value.trim(); Object.assign(k,{value:v,valid:false,status:'unknown',cooldownUntil:0}); persistRender(); });
    field.addEventListener('blur',()=>{ validateKey(i); });
    const meta = document.createElement('div'); meta.className='keymeta';
    meta.innerHTML = `<div><div class="pm">valid</div><div class="mono" id="k_valid_${i}">${k.valid?'yes':'no'}</div></div>
    <div><div class="pm">usage</div><div class="mono" id="k_usage_${i}">${k.usage} calls</div></div>
    <div><div class="pm">rate</div><div class="mono" id="k_rate_${i}">${keyRateText(k)}</div></div>`;
    row.appendChild(field); row.appendChild(meta); g.appendChild(row);
  });
}

function keyRateText(k){
  const rem = Math.max(0, Math.ceil((k.cooldownUntil - Date.now())/1000));
  if(k.status==='cooldown' && rem>0) return `cooldown ${rem}s`;
  if(k.status==='rate_limited') return 'rate limited';
  if(k.status==='ok') return 'ok';
  return 'ok';
}

function renderKeyMeta(){
  const idx = Math.max(0, Math.min(state.activeKeyIndex, MAX_KEYS-1));
  dom.keyRotationPill.textContent = `NEXT: #${idx+1}`;
}

function renderModel(){ dom.modelSelect.value = state.modelId || ''; }

function renderFinal(){
  dom.finalStatus.textContent = state.finalStatus;
  const text = substituteVaultRefs(state.finalOutput, state.vault);
  dom.finalOutput.textContent = text;
}

function renderTasks(){ dom.tasksList.innerHTML = state.tasks.map(t=>`<div class="li"><div><div class="mono">${escapeHtml(t.heading||'')}</div><div class="pm">${escapeHtml(t.content||'')}</div></div><div class="status">${(t.status||'pending').toUpperCase()}</div></div>`).join(''); }
function renderMemories(){ dom.memoryList.innerHTML = state.memories.map(m=>`<div class="li"><div><div class="mono">${escapeHtml(m.heading||'')}</div><div class="pm">${escapeHtml(m.content||'')}</div></div><div class="id" title="${escapeHtml(m.identifier||'')}">${escapeHtml(m.identifier||'')}</div></div>`).join(''); }
function renderGoals(){ dom.goalsList.innerHTML = state.goals.map(g=>`<div class="li"><div><div class="mono">${escapeHtml(g.heading||'')}</div><div class="pm">${escapeHtml(g.content||'')}</div></div><div class="id" title="${escapeHtml(g.identifier||'')}">${escapeHtml(g.identifier||'')}</div></div>`).join(''); }
function renderLog(){ dom.iterationCount.textContent = String(state.iterationCount||0); dom.iterationLog.innerHTML = state.iterationLog.map(e=>`<div class="li"><div><div class="mono">#${e.iter} • ${ts(e.ts)}</div><div>${escapeHtml(e.summary||'')}</div><pre class="mono" style="white-space:pre-wrap">${escapeHtml(e.details||'')}</pre></div></div>`).join(''); dom.iterationLog.scrollTop = dom.iterationLog.scrollHeight; }
function renderVault(){ dom.vaultList.innerHTML = Object.values(state.vault).map(v=>`<div class="li" data-vault-id="${escapeAttr(v.identifier)}"><div><div class="mono">${escapeHtml(v.identifier||'')}</div><div class="pm">${escapeHtml(v.description||'')}</div></div><div class="status">${(v.type||'text').toUpperCase()}</div></div>`).join('');
  Array.from(dom.vaultList.querySelectorAll('[data-vault-id]')).forEach(el=>{
    el.addEventListener('click',()=>openVault(el.getAttribute('data-vault-id')));
  });
}

function ts(ms){ const d=new Date(ms||Date.now()); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`; }
function escapeHtml(s=''){ return s.replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); }
function escapeAttr(s=''){ return escapeHtml(s).replace(/"/g,'&quot;'); }

async function validateKey(i){
  const k = state.apiKeys[i];
  if (!k) return;
  if (k.value && k.value.length>5){ k.valid=true; if(k.status==='unknown') k.status='ok'; } else { k.valid=false; k.status='unknown'; }
  if(!state.apiKeys[state.activeKeyIndex]?.valid && k.valid) state.activeKeyIndex=i;
  persistRender();
}

function startTicker(){ setInterval(()=>{ renderKeys(); renderKeyMeta(); }, TICK); }

async function onRun(){
  const q = (dom.userQuery.value||'').trim(); if(!q) return;
  state.finalStatus='running'; persistRender();
  try{
    const snapshot = await orchestrateResearch(q, structuredClone(state));
    if(snapshot && typeof snapshot==='object'){
      // authoritative fields
      ['tasks','memories','goals','vault','iterationLog','iterationCount','finalOutput','finalStatus','apiKeys','activeKeyIndex','modelId'].forEach(k=>{
        if(k in snapshot) state[k] = snapshot[k];
      });
    }
  }catch(err){
    state.finalStatus='failed';
    const it = (state.iterationCount||0)+1;
    state.iterationLog.push({iter:it,ts:Date.now(),summary:'ENGINE FAILURE',details:String(err?.message||err||'unknown')});
    state.iterationCount=it;
  }
  persistRender();
}

// Public hooks for gemini.js
window.gdrsRuntime = {
  pushIteration({summary='',details=''}){ const it=(state.iterationCount||0)+1; state.iterationLog.push({iter:it,ts:Date.now(),summary,details}); state.iterationCount=it; state.finalStatus='running'; persistRender(); },
  updateTaskNotes({identifier,notes,status}){ const t=state.tasks.find(x=>x.identifier===identifier); if(!t) return; if(typeof notes==='string') t.notes=notes; if(['pending','ongoing','finished','paused'].includes(status)) t.status=status; persistRender(); },
  addOrUpdateTask(o){ if(!o?.identifier) return; const e=state.tasks.find(x=>x.identifier===o.identifier); if(!e){ state.tasks.push({identifier:o.identifier,createdAt:o.createdAt||Date.now(),heading:o.heading||'(no heading)',content:o.content||'',status:['pending','ongoing','finished','paused'].includes(o.status)?o.status:'pending',notes:o.notes||''}); } else { if(typeof o.notes==='string') e.notes=o.notes; if(['pending','ongoing','finished','paused'].includes(o.status)) e.status=o.status; } persistRender(); },
  upsertMemory(o){ if(!o?.identifier) return; const e=state.memories.find(x=>x.identifier===o.identifier); if(!e){ state.memories.push({identifier:o.identifier,createdAt:o.createdAt||Date.now(),heading:o.heading||'(no heading)',content:o.content||'',notes:o.notes||''}); } else { if(typeof o.notes==='string') e.notes=o.notes; } persistRender(); },
  deleteMemory(id){ state.memories = state.memories.filter(x=>x.identifier!==id); persistRender(); },
  upsertGoal(o){ if(!o?.identifier) return; const e=state.goals.find(x=>x.identifier===o.identifier); if(!e){ state.goals.push({identifier:o.identifier,createdAt:o.createdAt||Date.now(),heading:o.heading||'(no heading)',content:o.content||'',notes:o.notes||''}); } else { if(typeof o.notes==='string') e.notes=o.notes; } persistRender(); },
  deleteGoal(id){ state.goals = state.goals.filter(x=>x.identifier!==id); persistRender(); },
  upsertVaultEntry(e){ if(!e?.identifier) return; state.vault[e.identifier] = {identifier:e.identifier,type:e.type||'text',description:e.description||'',content:e.content||''}; persistRender(); },
  deleteVaultEntry(id){ delete state.vault[id]; persistRender(); },
  setFinalResult({finalOutput,finalStatus}){ if(typeof finalOutput==='string') state.finalOutput=finalOutput; if(['idle','running','verified','failed','paused'].includes(finalStatus)) state.finalStatus=finalStatus; persistRender(); },
  bumpApiKeyUsage(){ const i=Math.max(0,Math.min(state.activeKeyIndex,MAX_KEYS-1)); const k=state.apiKeys[i]; if(k) k.usage++; persistRender(); },
  setApiKeyCooldown(i,ms){ const k=state.apiKeys[i]; if(!k) return; k.status='cooldown'; k.cooldownUntil=Date.now()+ms; persistRender(); },
  setActiveKey(i){ state.activeKeyIndex=Math.max(0,Math.min(i,MAX_KEYS-1)); persistRender(); },
  setModel(m){ if(typeof m==='string'){ state.modelId=m; if(dom.modelSelect) dom.modelSelect.value=m; } persistRender(); }
};

function openVault(id){ const v=state.vault[id]; if(!v) return; dom.vaultModalId.textContent=v.identifier; dom.vaultModalType.textContent=(v.type||'').toUpperCase(); dom.vaultModalDesc.textContent=v.description||'— no description —'; dom.vaultModalContent.textContent=v.content||''; dom.vaultModal.style.display='flex'; }
function closeVault(){ dom.vaultModal.style.display='none'; }

dom.vaultModalClose?.addEventListener('click', closeVault);
dom.vaultModal?.addEventListener('click', (e)=>{ if(e.target===dom.vaultModal) closeVault(); });

function bind(){
  dom.runQueryBtn?.addEventListener('click', onRun);
  dom.runQueryBtn2?.addEventListener('click', onRun);
  dom.modelSelect?.addEventListener('change', e=>{ state.modelId=e.target.value||''; persistRender(); });
  dom.validateKeys?.addEventListener('click', ()=>{ state.apiKeys.forEach((_,i)=>validateKey(i)); });
  dom.clearKeys?.addEventListener('click', ()=>{ state.apiKeys.forEach(k=>Object.assign(k,{value:'',usage:0,status:'unknown',cooldownUntil:0,valid:false})); persistRender(); });
  dom.execBtn?.addEventListener('click', executeCode);
  dom.clearExec?.addEventListener('click', ()=>{ dom.codeInput.value=''; dom.execOutput.textContent=''; dom.execStatus.textContent='READY'; });
}

function executeCode(){
  const code = substituteVaultRefs(dom.codeInput.value||'', state.vault);
  let logs = [];
  const orig = console.log;
  console.log = (...args)=>{ logs.push(args.map(a=>safeStringify(a)).join(' ')); orig.apply(console,args); };
  let result, error; dom.execStatus.textContent='RUNNING';
  try{
    // eslint-disable-next-line no-new-func
    const fn = new Function(code);
    result = fn();
    dom.execStatus.textContent='OK';
  }catch(e){ error = e; dom.execStatus.textContent='ERROR'; }
  console.log = orig;
  const out = [];
  if(logs.length) out.push('[console]', ...logs);
  if(typeof result!=='undefined') out.push('[return]', safeStringify(result));
  if(error) out.push('[error]', String(error?.stack||error?.message||error));
  dom.execOutput.textContent = out.join('\n');
}

function hydrateModels(){
  // Placeholder: gemini.js should populate; we keep current.
}

function boot(){ bind(); startTicker(); renderAll(); hydrateModels(); window.__GDRS_STATE__=state; }

boot();

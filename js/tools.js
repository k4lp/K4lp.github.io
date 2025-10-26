// tools.js – helpers
export function substituteVaultRefs(text, vault){
  if(typeof text!=='string') return '';
  return text.replace(/\{\{<vaultref id=\"([^\"]+)\"\s*\/>\}\}/g, (_,id)=>{
    const e = vault?.[id];
    if(!e) return `/* [MISSING_VAULT:${id}] */`;
    return e.content||'';
  });
}

export function safeStringify(v){
  try{ if(typeof v==='string') return v; return JSON.stringify(v); }catch{ return String(v); }
}

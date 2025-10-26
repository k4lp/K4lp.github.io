// tools.js – helpers
function substituteVaultRefs(text, vault){
 if(typeof text!=='string') return '';
 return text.replace(/\{\{<vaultref\s+id="([^"]+)"\s*\/>\}\}/g, (_,id)=>{
 const e = vault?.[id];
 if(!e) return `/* [MISSING_VAULT:${id}] */`;
 return e.content||'';
 });
}

function safeStringify(v){
 try{ if(typeof v==='string') return v; return JSON.stringify(v); }catch{ return String(v); }
}

// Make functions available globally for use by other scripts
window.substituteVaultRefs = substituteVaultRefs;
window.safeStringify = safeStringify;
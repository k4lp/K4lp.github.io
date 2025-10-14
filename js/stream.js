// js/stream.js
async function streamSSE(url, opts, onEvent){
  const res = await fetch(url, opts);
  if(!res.ok){
    const text = await res.text();
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status; err.body = text;
    throw err;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while(true){
    const {value, done} = await reader.read();
    if(done) break;
    buffer += decoder.decode(value, {stream:true});
    let idx;
    while((idx = buffer.indexOf('\n\n')) >= 0){
      const rawEvent = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx+2);
      const lines = rawEvent.split('\n');
      let data = '';
      for(const line of lines){
        if(line.startsWith('data:')){
          data += line.slice(5).trim();
        }
      }
      if(data){
        onEvent(data);
      }
    }
  }
}
window.streamSSE = streamSSE;

// js/tools.js
class ExternalTools {
  constructor({memory, canvas, varsRef}){
    this.memory = memory;
    this.canvas = canvas;
    this.vars = varsRef; // map
  }

  async dispatch(call){
    const { name, args } = call;
    switch(name){
      case 'memory.fetch': {
        const item = this.memory.get(args.index);
        return { ok:true, data:item };
      }
      case 'memory.save': {
        const idx = this.memory.add(args.summary||"", args.details||"");
        return { ok:true, index: idx };
      }
      case 'memory.delete': {
        this.memory.del(args.index);
        return { ok:true };
      }
      case 'goals.get': {
        return { ok:true, text:this.memory.getGoals() };
      }
      case 'goals.set': {
        this.memory.setGoals(args.text||"");
        return { ok:true };
      }
      case 'code.run_js': {
        const result = await runUserJS(args.code||"");
        return { ok:true, output: result.output, lastValue: result.lastValue };
      }
      case 'canvas.render': {
        await this.canvas.renderHTML(args.html||"", args.width, args.height, args.scale);
        return { ok:true };
      }
      case 'canvas.clear': {
        this.canvas.clear();
        return { ok:true };
      }
      case 'net.http_request': {
        const res = await fetch(args.url, {
          method: args.method||'GET',
          headers: args.headers||{},
          body: args.body||undefined
        });
        const text = await res.text();
        return { ok:true, status: res.status, headers: Object.fromEntries(res.headers.entries()), body: text };
      }
      case 'vars.set': {
        this.vars[args.name] = args.value || "";
        return { ok:true };
      }
      case 'vars.get': {
        return { ok:true, value: this.vars[args.name]||"" };
      }
      default:
        return { ok:false, error:`Unknown tool: ${name}` };
    }
  }

  static tryParseToolCall(chunk){
    // Look for fenced json blocks containing {"tool_call":{...}}
    const fenceStart = chunk.indexOf("```
    if(fenceStart === -1) return null;
    const fenceEnd = chunk.indexOf("```", fenceStart+7);
    if(fenceEnd === -1) return null;
    const jsonText = chunk.slice(fenceStart+7, fenceEnd).trim();
    try{
      const obj = JSON.parse(jsonText);
      if(obj && obj.tool_call && obj.tool_call.name){ return obj.tool_call }
    }catch{}
    return null;
  }

  static tryParseFinal(chunk){
    const fenceStart = chunk.indexOf("```
    if(fenceStart === -1) return null;
    const fenceEnd = chunk.indexOf("```", fenceStart+7);
    if(fenceEnd === -1) return null;
    try{
      const obj = JSON.parse(chunk.slice(fenceStart+7, fenceEnd).trim());
      if(obj && obj.final && typeof obj.final.content === 'string'){ return obj.final }
    }catch{}
    return null;
  }
}
window.ExternalTools = ExternalTools;

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

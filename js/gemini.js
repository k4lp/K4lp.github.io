// js/gemini.js
class GeminiClient {
  constructor({keyring, getModel, systemPromptProvider}){
    this.keyring = keyring;
    this.getModel = getModel;
    this.systemPromptProvider = systemPromptProvider;
    this.base = 'https://generativelanguage.googleapis.com/v1beta';
  }

  async streamChat({messages, onText, onPartialJSON}){
    const model = this.getModel();
    const key = this.keyring.getActive();
    const url = `${this.base}/models/${encodeURIComponent(model)}:streamGenerateContent?key=${encodeURIComponent(key)}`;

    const body = {
      systemInstruction: { parts: [{ text: this.systemPromptProvider() }] },
      contents: messages.map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      })),
      generationConfig: {
        temperature: 0.6,
        topP: 0.9
      }
    };

    try{
      await streamSSE(url, {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify(body)
      }, (data) => {
        try{
          const obj = JSON.parse(data);
          const parts = obj?.candidates?.[0]?.content?.parts;
          if(parts){
            for(const p of parts){
              if(typeof p.text === 'string'){
                onText(p.text);
                if(onPartialJSON){
                  onPartialJSON(p.text);
                }
              }
            }
          }
        }catch(e){
          // Non-JSON SSE data chunks can be ignored.
        }
      });
    } catch(e){
      if(e.status === 429 || (e.body||"").toLowerCase().includes('rate')){
        this.keyring.markRateLimited();
      }
      throw e;
    }
  }
}
window.GeminiClient = GeminiClient;

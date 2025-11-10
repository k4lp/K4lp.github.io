import { Storage } from '../storage/storage.js';

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

export class GroqClient {
  static async chat(messages = [], options = {}) {
    const keys = Storage.loadGroqApiKeys?.() || [];
    if (!keys.length) {
      throw new Error('No Groq API keys configured');
    }

    let lastError = null;
    for (let i = 0; i < keys.length; i++) {
      const apiKey = keys[i];
      try {
        const response = await fetch(GROQ_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'groq/compound',
            messages,
            max_completion_tokens: options.maxTokens || 2048,
            tool_choice: 'auto',
            parallel_tool_calls: true,
            stream: false
          })
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Groq API error (${response.status}): ${text.slice(0, 200)}`);
        }

        const data = await response.json();
        return data?.choices?.[0]?.message?.content || '';
      } catch (error) {
        lastError = error;
        console.warn('[GroqClient] Key failed, attempting next key...', error);
      }
    }

    throw lastError || new Error('Groq API request failed');
  }
}

export default GroqClient;

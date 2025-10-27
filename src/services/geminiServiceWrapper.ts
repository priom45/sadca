const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

class GeminiServiceWrapper {
  async generateText(prompt: string): Promise<string> {
    if (!OPENROUTER_API_KEY) {
      throw new Error('OpenRouter API key is not configured');
    }

    const request = async () => {
      const res = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://primoboost.ai',
          'X-Title': 'PrimoBoost AI'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{ role: 'user', content: prompt }]
        })
      });
      return res;
    };

    let attempt = 0;
    let delay = 800;
    while (attempt < 3) {
      const response = await request();
      if (response.ok) {
        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content;
        if (!content) throw new Error('No content in API response');
        return content;
      }
      if (response.status === 429 || response.status >= 500) {
        await new Promise(r => setTimeout(r, delay));
        attempt++;
        delay *= 2;
        continue;
      }
      throw new Error(`API request failed: ${response.status}`);
    }
    throw new Error('API request failed after retries');
  }
}

export const geminiService = new GeminiServiceWrapper();

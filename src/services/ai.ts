import * as SecureStore from 'expo-secure-store';

const GEMINI_API_KEY = 'gemini_api_key';

class AiService {
  async setApiKey(key: string) {
    await SecureStore.setItemAsync(GEMINI_API_KEY, key);
  }

  async getApiKey(): Promise<string> {
    return (await SecureStore.getItemAsync(GEMINI_API_KEY)) || '';
  }

  async chat(message: string): Promise<string> {
    const key = await this.getApiKey();
    if (!key) throw new Error('Gemini API Key not set');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: message }] }],
        }),
      }
    );

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    if (!data.candidates || !data.candidates[0]?.content?.parts[0]?.text) {
        throw new Error('AI returned an unexpected response format');
    }
    return data.candidates[0].content.parts[0].text;
  }
}

export const aiService = new AiService();

import * as SecureStore from 'expo-secure-store';

const GEMINI_API_KEY = 'gemini_api_key';
const AI_PROXY_URL = 'ai_proxy_url';
const DEFAULT_PROXY = 'https://telegram-drive-desktop.onrender.com/chat';

class AiService {
  async setApiKey(key: string) {
    await SecureStore.setItemAsync(GEMINI_API_KEY, key);
  }

  async getApiKey(): Promise<string> {
    return (await SecureStore.getItemAsync(GEMINI_API_KEY)) || '';
  }

  async setProxyUrl(url: string) {
    await SecureStore.setItemAsync(AI_PROXY_URL, url);
  }

  async getProxyUrl(): Promise<string> {
    return (await SecureStore.getItemAsync(AI_PROXY_URL)) || DEFAULT_PROXY;
  }

  async chat(message: string): Promise<string> {
    const proxyUrl = await this.getProxyUrl();
    const key = await this.getApiKey();

    if (proxyUrl) {
      try {
        const response = await fetch(proxyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message }),
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        return data.reply;
      } catch (e) {
        console.error('Proxy call failed, falling back to direct API', e);
      }
    }

    if (!key) throw new Error('Gemini API Key or Proxy URL not set');

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

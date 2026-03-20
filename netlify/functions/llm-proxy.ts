import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { groq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { validateToken } from './lib/auth';

export const handler = async (event: any) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // 1. Validate Auth0 Token
    const authHeader = event.headers.authorization;
    await validateToken(authHeader);

    // 2. Parse Request
    const { provider, model, messages, temperature, maxTokens, apiKey, apiBaseUrl } = JSON.parse(
      event.body,
    );

    if (!provider || !messages) {
      return { statusCode: 400, body: 'Missing required parameters' };
    }

    // 3. Initialize Provider with User's API Key
    let aiProvider: any;

    switch (provider) {
      case 'openai':
        aiProvider = openai(model || 'gpt-4o-mini', {
          apiKey: apiKey,
          baseURL: apiBaseUrl,
        });
        break;
      case 'anthropic':
        aiProvider = anthropic(model || 'claude-3-haiku-20240307', {
          apiKey: apiKey,
        });
        break;
      case 'groq':
        aiProvider = groq(model || 'llama-3.3-70b-versatile', {
          apiKey: apiKey,
        });
        break;
      default:
        return { statusCode: 400, body: `Unsupported provider: ${provider}` };
    }

    // 4. Generate Text using Vercel AI SDK
    const { text } = await generateText({
      model: aiProvider,
      messages,
      temperature: temperature || 0.7,
      maxTokens: maxTokens || 1024,
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    };
  } catch (error: any) {
    console.error('LLM Proxy Error:', error);
    return {
      statusCode: error.status || 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
    };
  }
};

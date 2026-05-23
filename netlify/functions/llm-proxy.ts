import { createGroq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { ZodError } from 'zod';
import { formatZodError, llmRequestSchema } from '../../db/validation';
import { validateToken } from './lib/auth';
import { corsResponse, jsonResponse, secureErrorResponse } from './lib/response';
import { getUserKey, saveUserKey } from './lib/userKeys';

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return corsResponse();
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method Not Allowed' });
  }

  try {
    const user = await validateToken(event.headers.authorization);

    let requestBody;
    try {
      requestBody = llmRequestSchema.parse(event.body ? JSON.parse(event.body) : {});
    } catch (e) {
      if (e instanceof ZodError) {
        return jsonResponse(400, formatZodError(e));
      }
      return jsonResponse(400, { error: 'Invalid JSON' });
    }

    const { provider, model, messages, temperature, maxOutputTokens, saveKey, userApiKey } =
      requestBody;

    if (saveKey && userApiKey) {
      await saveUserKey(user.sub, provider, userApiKey);
      const result = await tryGenerateText(
        provider,
        model,
        messages,
        temperature,
        maxOutputTokens,
        userApiKey,
      );
      if (result.success) {
        return jsonResponse(200, { text: result.text, keySaved: true });
      }
      return jsonResponse(401, {
        error: 'Key validation failed',
        code: 'INVALID_KEY',
        message: result.error || 'The provided key is invalid or has been revoked',
      });
    }

    const serverKey = process.env.GROQ_API_KEY;
    if (!serverKey && process.env.NETLIFY_DEV) {
      console.warn('[LLM Proxy] GROQ_API_KEY is missing in process.env');
    }
    let apiKey: string | undefined = serverKey;

    if (!apiKey) {
      const userKey = await getUserKey(user.sub, provider);
      if (!userKey) {
        return jsonResponse(401, {
          error: 'API key required',
          code: 'KEY_REQUIRED',
          message:
            'No API key available. Please provide your own Groq API key to continue using cloud AI.',
          requiresKey: true,
        });
      }
      apiKey = userKey;
    }

    const result = await tryGenerateText(
      provider,
      model,
      messages,
      temperature,
      maxOutputTokens,
      apiKey,
    );

    if (result.success) {
      return jsonResponse(200, { text: result.text });
    }

    const isRateLimit =
      result.error?.toLowerCase().includes('rate') || result.error?.toLowerCase().includes('429');

    const shouldTrySavedKey =
      !serverKey ||
      isRateLimit ||
      result.error?.toLowerCase().includes('invalid') ||
      result.error?.toLowerCase().includes('expired') ||
      result.error?.toLowerCase().includes('unauthorized');

    if (shouldTrySavedKey) {
      const savedKey = await getUserKey(user.sub, provider);
      if (savedKey && savedKey !== apiKey) {
        const retryResult = await tryGenerateText(
          provider,
          model,
          messages,
          temperature,
          maxOutputTokens,
          savedKey,
        );
        if (retryResult.success) {
          return jsonResponse(200, { text: retryResult.text });
        }
      }

      if (!savedKey && !isRateLimit) {
        return jsonResponse(401, {
          error: 'API key required',
          code: 'KEY_REQUIRED',
          message:
            'No API key available. Please provide your own Groq API key to continue using cloud AI.',
          requiresKey: true,
        });
      }
    }

    return jsonResponse(500, {
      error: 'LLM request failed',
      code: 'LLM_ERROR',
      message: result.error || 'Failed to generate response',
    });
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('authorization')) {
      return jsonResponse(401, { error: 'Unauthorized', code: 'AUTH_ERROR' });
    }

    return secureErrorResponse(error);
  }
};

async function tryGenerateText(
  _provider: string,
  model: string | undefined,
  messages: any[],
  temperature: number | undefined,
  maxOutputTokens: number | undefined,
  apiKey: string,
): Promise<{ success: boolean; text?: string; error?: string }> {
  try {
    const groqProvider = createGroq({ apiKey });
    const aiProvider = groqProvider(model || 'llama-3.3-70b-versatile');

    const { text } = await generateText({
      model: aiProvider,
      messages,
      temperature: temperature ?? 0.7,
      maxOutputTokens: maxOutputTokens ?? 1024,
    });

    return { success: true, text };
  } catch (error: any) {
    return { success: false, error: error.message || 'Unknown error' };
  }
}

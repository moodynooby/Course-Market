import { createGroq } from '@ai-sdk/groq';
import { generateText, streamText } from 'ai';
import { ZodError } from 'zod';
import { formatZodError, llmRequestSchema } from '../../src/lib/schemas';
import { validateToken } from './lib/auth';
import { getUserKey, saveUserKey } from './lib/userKeys';

export const handler = async (event: any) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  try {
    const user = await validateToken(event.headers.authorization);

    let requestBody;
    try {
      requestBody = llmRequestSchema.parse(event.body ? JSON.parse(event.body) : {});
    } catch (e) {
      if (e instanceof ZodError) {
        return {
          statusCode: 400,
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify(formatZodError(e)),
        };
      }
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON' }),
      };
    }

    const { provider, model, messages, temperature, maxOutputTokens, saveKey, userApiKey, stream } =
      requestBody;

    if (saveKey && userApiKey) {
      await saveUserKey(user.sub, provider, userApiKey);
      if (stream) {
        return handleStream(provider, model, messages, temperature, maxOutputTokens, userApiKey);
      }
      const result = await tryGenerateText(
        provider,
        model,
        messages,
        temperature,
        maxOutputTokens,
        userApiKey,
      );
      if (result.success) {
        return {
          statusCode: 200,
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: result.text, keySaved: true }),
        };
      }
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          error: 'Key validation failed',
          code: 'INVALID_KEY',
          message: result.error || 'The provided key is invalid or has been revoked',
        }),
      };
    }

    const serverKey = process.env.GROQ_API_KEY;
    if (!serverKey && process.env.NODE_ENV === 'development') {
      console.warn('[LLM Proxy] GROQ_API_KEY is missing in process.env');
    }
    let apiKey: string | undefined = serverKey;

    if (!apiKey) {
      const userKey = await getUserKey(user.sub, provider);
      if (!userKey) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({
            error: 'API key required',
            code: 'KEY_REQUIRED',
            message:
              'No API key available. Please provide your own Groq API key to continue using cloud AI.',
            requiresKey: true,
          }),
        };
      }
      apiKey = userKey;
    }

    if (stream) {
      return handleStream(provider, model, messages, temperature, maxOutputTokens, apiKey);
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
      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: result.text }),
      };
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
        if (stream) {
          return handleStream(provider, model, messages, temperature, maxOutputTokens, savedKey);
        }
        const retryResult = await tryGenerateText(
          provider,
          model,
          messages,
          temperature,
          maxOutputTokens,
          savedKey,
        );
        if (retryResult.success) {
          return {
            statusCode: 200,
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: retryResult.text }),
          };
        }
      }

      if (!savedKey && !isRateLimit) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({
            error: 'API key required',
            code: 'KEY_REQUIRED',
            message:
              'No API key available. Please provide your own Groq API key to continue using cloud AI.',
            requiresKey: true,
          }),
        };
      }
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'LLM request failed',
        code: 'LLM_ERROR',
        message: result.error || 'Failed to generate response',
      }),
    };
  } catch (error: any) {
    console.error('LLM Proxy Error:', error);

    if (error instanceof Error && error.message.includes('authorization')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized', code: 'AUTH_ERROR' }),
      };
    }

    return {
      statusCode: error.status || 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
    };
  }
};

async function handleStream(
  _provider: string,
  model: string | undefined,
  messages: any[],
  temperature: number | undefined,
  maxOutputTokens: number | undefined,
  apiKey: string,
) {
  try {
    const groqProvider = createGroq({ apiKey });
    const aiProvider = groqProvider(model || 'llama-3.3-70b-versatile');

    const result = await streamText({
      model: aiProvider,
      messages,
      temperature: temperature ?? 0.7,
      maxOutputTokens: maxOutputTokens ?? 1024,
    });

    return result.toDataStreamResponse({
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    });
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Stream generation failed' }),
    };
  }
}

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

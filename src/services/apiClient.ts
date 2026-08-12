import { env } from '../utils/env';

const DEFAULT_TIMEOUT_MS = 15_000;

const getBaseUrl = (): string => {
  if (env.NETLIFY_FUNCTION_URL) return env.NETLIFY_FUNCTION_URL.replace(/\/$/, '');
  return '/.netlify/functions';
};

export function formatApiErrorDetails(err: unknown, separator = '. '): string | null {
  if (err instanceof ApiError && err.details?.length) {
    return err.details.map((d) => `${d.field}: ${d.message}`).join(separator);
  }
  return null;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: { field: string; message: string }[],
    public code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static fromResponse(status: number, body: unknown): ApiError {
    if (body && typeof body === 'object') {
      const data = body as {
        error?: string;
        message?: string;
        code?: string;
        details?: { field: string; message: string }[];
      };
      return new ApiError(
        status,
        data.error || data.message || `API error ${status}`,
        data.details,
        data.code,
      );
    }

    return new ApiError(status, `API error ${status}`);
  }
}

interface RequestOptions extends RequestInit {
  token?: string;
  timeoutMs?: number;
}

export async function apiClient<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, timeoutMs = DEFAULT_TIMEOUT_MS, signal, ...fetchOptions } = options;
  const url = `${getBaseUrl()}${path}`;
  const controller = new AbortController();
  const abortFromCaller = () => controller.abort(signal?.reason);

  if (signal?.aborted) {
    controller.abort(signal.reason);
  } else {
    signal?.addEventListener('abort', abortFromCaller, { once: true });
  }

  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  const headers: HeadersInit = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...fetchOptions.headers,
  };

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      let errorBody: unknown;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        try {
          errorBody = await response.json();
        } catch {
          errorBody = undefined;
        }
      } else {
        errorBody = await response.text();
      }
      throw ApiError.fromResponse(response.status, errorBody);
    }

    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (controller.signal.aborted && !signal?.aborted) {
      throw new ApiError(408, 'The request timed out. Please try again.', undefined, 'TIMEOUT');
    }
    if (error instanceof Error) {
      throw new ApiError(0, error.message || 'Network request failed.', undefined, 'NETWORK_ERROR');
    }
    throw new ApiError(0, 'Network request failed.', undefined, 'NETWORK_ERROR');
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener('abort', abortFromCaller);
  }
}

export const api = {
  get: <T>(path: string, token?: string) => apiClient<T>(path, { method: 'GET', token }),

  post: <T>(path: string, data: unknown, token?: string) =>
    apiClient<T>(path, { method: 'POST', body: JSON.stringify(data), token }),

  put: <T>(path: string, data: unknown, token?: string) =>
    apiClient<T>(path, { method: 'PUT', body: JSON.stringify(data), token }),

  delete: <T>(path: string, token?: string) => apiClient<T>(path, { method: 'DELETE', token }),
};

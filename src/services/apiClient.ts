import { ENV } from '../config/devConfig';

const getBaseUrl = (): string => {
  if (ENV.NETLIFY_FUNCTION_URL) return ENV.NETLIFY_FUNCTION_URL;
  return '/.netlify/functions';
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends RequestInit {
  token?: string;
}

export async function apiClient<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, ...fetchOptions } = options;
  const url = `${getBaseUrl()}${path}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...fetchOptions.headers,
  };

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new ApiError(response.status, `API error ${response.status}: ${errorBody}`);
  }

  return response.json();
}

export const api = {
  get: <T>(path: string, token?: string) => apiClient<T>(path, { method: 'GET', token }),

  post: <T>(path: string, data: unknown, token?: string) =>
    apiClient<T>(path, { method: 'POST', body: JSON.stringify(data), token }),

  put: <T>(path: string, data: unknown, token?: string) =>
    apiClient<T>(path, { method: 'PUT', body: JSON.stringify(data), token }),

  delete: <T>(path: string, token?: string) => apiClient<T>(path, { method: 'DELETE', token }),
};

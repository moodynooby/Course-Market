import { ENV } from '../config/devConfig';

const getBaseUrl = (): string => {
  if (ENV.NETLIFY_FUNCTION_URL) return ENV.NETLIFY_FUNCTION_URL;
  return '/.netlify/functions';
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: { field: string; message: string }[],
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static fromResponse(status: number, body: unknown): ApiError {
    const data = body as {
      error?: string;
      message?: string;
      details?: { field: string; message: string }[];
    };
    const message = data.error || data.message || `API error ${status}`;
    return new ApiError(status, message, data.details);
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
    let errorBody: unknown;
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      errorBody = await response.json();
    } else {
      errorBody = await response.text();
    }
    throw ApiError.fromResponse(response.status, errorBody);
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

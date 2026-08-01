import { AuthError, type AuthUser, validateToken } from './auth';
import { corsResponse, jsonResponse, secureErrorResponse } from './response';
import type { NetlifyEvent } from './types';

interface HandlerResult {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

// Short-circuits CORS preflight and routes uncaught errors through
// secureErrorResponse. Public endpoints get this; no token is required.
export function withCors(handler: (event: NetlifyEvent) => Promise<HandlerResult>) {
  return async (event: NetlifyEvent): Promise<HandlerResult> => {
    if (event.httpMethod === 'OPTIONS') return corsResponse();
    try {
      return await handler(event);
    } catch (error) {
      if (error instanceof AuthError) {
        return jsonResponse(401, { error: 'Unauthorized' });
      }
      return secureErrorResponse(error);
    }
  };
}

// Validates the bearer token and passes the resolved user to the inner
// handler. AuthError -> 401, everything else -> secureErrorResponse.
export function withAuth(handler: (event: NetlifyEvent, user: AuthUser) => Promise<HandlerResult>) {
  return withCors(async (event) => {
    const user = await validateToken(event.headers.authorization);
    return handler(event, user);
  });
}

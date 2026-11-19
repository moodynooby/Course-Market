import { AuthError, type AuthUser, validateToken } from './auth';
import { corsResponse, jsonResponse, secureErrorResponse } from './response';
import type { HandlerResult, NetlifyEvent } from './types';

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

export function withAuth(handler: (event: NetlifyEvent, user: AuthUser) => Promise<HandlerResult>) {
  return withCors(async (event) => {
    const user = await validateToken(event.headers.authorization);
    return handler(event, user);
  });
}

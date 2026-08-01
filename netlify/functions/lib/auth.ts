import { createRemoteJWKSet, jwtVerify } from 'jose';

const domain = process.env.AUTH0_DOMAIN;
const issuer = process.env.AUTH0_ISSUER || (domain ? `https://${domain}/` : '');
const audience = process.env.AUTH0_AUDIENCE;

if (!issuer || !audience) {
  console.warn('Auth0 environment variables are missing. Auth might fail.');
}

const JWKS = issuer ? createRemoteJWKSet(new URL('.well-known/jwks.json', issuer)) : null;

export interface AuthUser {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

// Typed marker so downstream handlers can branch on 401 vs 500 without
// string-matching an error message. Both "missing header" and "invalid token"
// use this so an expired JWT no longer falls through to 500.
export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export async function validateToken(authHeader: string | undefined): Promise<AuthUser> {
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthError('Missing or invalid authorization header');
  }

  const token = authHeader.substring(7);

  try {
    if (!JWKS) throw new Error('JWKS not initialized. Check environment variables.');

    const { payload } = await jwtVerify(token, JWKS!, {
      issuer,
      audience,
      algorithms: ['RS256'],
    });

    return {
      sub: payload.sub!,
      email: (payload.email as string) || payload.sub!,
      name: (payload.name as string) || 'Anonymous Trader',
      picture: payload.picture as string | undefined,
    };
  } catch (error) {
    console.error('Token validation failed:', error);
    throw new AuthError('Invalid or expired token');
  }
}

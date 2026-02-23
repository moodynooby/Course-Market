import { createRemoteJWKSet, jwtVerify } from 'jose';

const domain = process.env.AUTH0_DOMAIN || process.env.VITE_AUTH0_DOMAIN;
const issuer =
  process.env.AUTH0_ISSUER ||
  process.env.AUTH0_ISSUER_BASE_URL ||
  (domain ? `https://${domain}/` : '');
const audience = process.env.AUTH0_AUDIENCE || process.env.VITE_AUTH0_AUDIENCE;

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

export async function validateToken(authHeader: string | undefined): Promise<AuthUser> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }

  const token = authHeader.substring(7);

  try {
    if (!JWKS) throw new Error('JWKS not initialized. Check environment variables.');

    const { payload } = await jwtVerify(token, JWKS!, {
      issuer,
      audience,
    });

    return {
      sub: payload.sub!,
      email: (payload.email as string) || payload.sub!,
      name: (payload.name as string) || (payload.email as string) || payload.sub!,
      picture: payload.picture as string | undefined,
    };
  } catch (error) {
    console.error('Token validation failed:', error);
    throw new Error('Invalid or expired token');
  }
}

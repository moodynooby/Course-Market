import { createRemoteJWKSet, jwtVerify } from 'jose';

const JWKS = createRemoteJWKSet(
  new URL(`https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`),
);

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
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://${process.env.AUTH0_DOMAIN}/`,
      audience: process.env.AUTH0_AUDIENCE,
    });

    return {
      sub: payload.sub!,
      email: payload.email as string,
      name: payload.name as string,
      picture: payload.picture as string | undefined,
    };
  } catch (error) {
    console.error('Token validation failed:', error);
    throw new Error('Invalid or expired token');
  }
}

// --- ENV ---
const auth0Domain = import.meta.env.VITE_AUTH0_DOMAIN || '';
const auth0ClientId = import.meta.env.VITE_AUTH0_CLIENT_ID || '';
const auth0Audience = import.meta.env.VITE_AUTH0_AUDIENCE || '';

if (!auth0Domain || !auth0ClientId) {
  console.warn('Auth0 configuration is incomplete. Authentication will fail.');
  console.debug('Auth0 Domain:', auth0Domain);
  console.debug('Auth0 Client ID:', auth0ClientId);
}

export const ENV = {
  NETLIFY_FUNCTION_URL: import.meta.env.VITE_NETLIFY_FUNCTION_URL || '',
  AUTH0_DOMAIN: auth0Domain,
  AUTH0_CLIENT_ID: auth0ClientId,
  AUTH0_AUDIENCE: auth0Audience,
  MODE: import.meta.env.MODE,
  IS_DEV: import.meta.env.DEV,
  IS_PROD: import.meta.env.PROD,
};

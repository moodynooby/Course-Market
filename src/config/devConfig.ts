// --- ENV ---
export const ENV = {
  NETLIFY_FUNCTION_URL: import.meta.env.VITE_NETLIFY_FUNCTION_URL || '',
  AUTH0_DOMAIN: import.meta.env.VITE_AUTH0_DOMAIN || '',
  AUTH0_CLIENT_ID: import.meta.env.VITE_AUTH0_CLIENT_ID || '',
  AUTH0_AUDIENCE: import.meta.env.VITE_AUTH0_AUDIENCE || '',
  MODE: import.meta.env.MODE,
  IS_DEV: import.meta.env.DEV,
  IS_PROD: import.meta.env.PROD,
};

// --- ENV ---
export const ENV = {
  NETLIFY_FUNCTION_URL: import.meta.env.VITE_NETLIFY_FUNCTION_URL || '',
  MODE: import.meta.env.MODE,
  IS_DEV: import.meta.env.DEV,
  IS_PROD: import.meta.env.PROD,
};

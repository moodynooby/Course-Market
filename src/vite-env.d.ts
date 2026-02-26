/// <reference types="vite/client" />

declare module 'react-big-calendar';

interface ImportMetaEnv {
  readonly VITE_NETLIFY_FUNCTION_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

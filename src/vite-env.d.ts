/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LLM_ENDPOINT?: string;
  readonly VITE_NETLIFY_FUNCTION_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
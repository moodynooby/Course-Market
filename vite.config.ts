import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react({
        babel: {
          plugins: [['babel-plugin-react-compiler']],
        },
      }),
    ],
    // Force definition of Auth0 variables to ensure they are available in production
    // This provides a fallback if the VITE_ prefix is missing in the environment
    define: {
      'import.meta.env.VITE_AUTH0_DOMAIN': JSON.stringify(env.VITE_AUTH0_DOMAIN || env.AUTH0_DOMAIN || ''),
      'import.meta.env.VITE_AUTH0_CLIENT_ID': JSON.stringify(env.VITE_AUTH0_CLIENT_ID || env.AUTH0_CLIENT_ID || ''),
      'import.meta.env.VITE_AUTH0_AUDIENCE': JSON.stringify(env.VITE_AUTH0_AUDIENCE || env.AUTH0_AUDIENCE || ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './src/components'),
        '@pages': path.resolve(__dirname, './src/pages'),
        '@context': path.resolve(__dirname, './src/context'),
        '@hooks': path.resolve(__dirname, './src/hooks'),
        '@utils': path.resolve(__dirname, './src/utils'),
        '@types': path.resolve(__dirname, './src/types'),
        '@services': path.resolve(__dirname, './src/services'),
        '@constants': path.resolve(__dirname, './src/constants'),
        '@assets': path.resolve(__dirname, './src/assets'),
      },
    },
    server: {
      port: 3000,
      host: true,
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // Split heavy LLM dependencies into separate chunks
            'web-llm': ['@mlc-ai/web-llm', 'detect-gpu'],
            wllama: ['@wllama/wllama'],
            // Split MUI components into separate chunks
            'mui-material': ['@mui/material'],
            'mui-icons': ['@mui/icons-material'],
          },
        },
      },
    },
  };
});

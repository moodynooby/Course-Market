import path from 'node:path';
import netlify from '@netlify/vite-plugin';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    react({
      ...reactCompilerPreset(),
    }),
    netlify(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      '@components': path.resolve(import.meta.dirname, './src/components'),
      '@pages': path.resolve(import.meta.dirname, './src/pages'),
      '@context': path.resolve(import.meta.dirname, './src/context'),
      '@hooks': path.resolve(import.meta.dirname, './src/hooks'),
      '@utils': path.resolve(import.meta.dirname, './src/utils'),
      '@types': path.resolve(import.meta.dirname, './src/types'),
      '@services': path.resolve(import.meta.dirname, './src/services'),
      '@assets': path.resolve(import.meta.dirname, './src/assets'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('react-big-calendar') || id.includes('date-fns'))
            return 'vendor-calendar';
          if (id.includes('@mui') || id.includes('@emotion')) return 'vendor-mui';
          if (id.includes('node_modules/react') || id.includes('react-router-dom'))
            return 'vendor-react';
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});

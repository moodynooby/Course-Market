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
  build: {
    rollupOptions: {
      input: {
        main: './index.html',
      },
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

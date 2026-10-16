import netlify from '@netlify/vite-plugin';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

function apiDevRewritePlugin(): Plugin {
  return {
    name: 'api-dev-rewrite',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url?.startsWith('/api/')) {
          req.url = req.url.replace(/^\/api\//, '/.netlify/functions/');
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [
    apiDevRewritePlugin(),
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

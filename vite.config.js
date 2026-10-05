import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'mishkat-api-dev-server',
      configureServer(server) {
        setupApiMiddleware(server);
      },
      configurePreviewServer(server) {
        setupApiMiddleware(server);
      }
    }
  ],
  server: {
    port: 5173,
    host: true
  },
  preview: {
    port: 4173,
    host: true
  }
});

function setupApiMiddleware(server) {
  server.middlewares.use(async (req, res, next) => {
    if (req.url && req.url.startsWith('/api/')) {
      try {
        const { manager } = await import('./src/server/index.js');
        await manager.handleRequest(req, res);
      } catch (err) {
        console.error('Mishkat API server middleware error:', err);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'SERVER_MIDDLEWARE_ERROR', message: err.message }));
      }
      return;
    }
    next();
  });
}


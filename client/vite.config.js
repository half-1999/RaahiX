import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5055',
        changeOrigin: true,
        // Avoid noisy ECONNREFUSED spam while the API is still binding.
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            if (res && !res.headersSent && typeof res.writeHead === 'function') {
              res.writeHead(502, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ message: 'API starting up — retry in a moment', code: 'API_UNAVAILABLE' }));
            } else if (err?.code !== 'ECONNREFUSED') {
              console.error('[vite proxy]', err.message);
            }
          });
        },
      },
    },
  },
});

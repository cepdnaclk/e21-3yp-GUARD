import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load .env / .env.local so VITE_BACKEND_URL can be used in this config file.
  // This is a dev-only proxy target — it is NEVER embedded in the browser bundle.
  const env = loadEnv(mode, process.cwd(), '');

  // Override via VITE_BACKEND_URL=http://your-server:5000 in .env.local if needed.
  // Default: local backend on port 5000.
  const backendTarget = env.VITE_BACKEND_URL || 'http://localhost:5000';

  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: true,
      proxy: {
        // All /api requests are forwarded to the backend.
        '/api': {
          target: backendTarget,
          changeOrigin: true,
        },
        // Socket.IO — must stay separate with ws: true.
        '/socket.io': {
          target: backendTarget,
          ws: true,
          changeOrigin: true,
        },
        // Static uploads served by the backend (e.g. fish images).
        // Keep this as /uploads — the backend does NOT serve them under /api/uploads.
        '/uploads': {
          target: backendTarget,
          changeOrigin: true,
        },
      },
    },
  };
});

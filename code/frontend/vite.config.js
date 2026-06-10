import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        // target: 'https://e21-3yp-guard.onrender.com',
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: true,
      },
      '/socket.io': {
        // target: 'https://e21-3yp-guard.onrender.com',
        target: 'http://localhost:5000',
        ws: true,
        changeOrigin: true,
        secure: true,
      },
      '/uploads': {
        // proxy local fish images served by the backend
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});

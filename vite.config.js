import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    headers: {
      'Service-Worker-Allowed': '/',
      'Cache-Control': 'public, max-age=31536000'
    }
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        // Ensure service worker is not bundled
        manualChunks: {
          'service-worker': ['public/service-worker.js']
        }
      }
    }
  },
  // Ensure service worker is copied to dist
  publicDir: 'public'
});


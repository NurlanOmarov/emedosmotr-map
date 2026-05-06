import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'eMedosmotr Map',
        short_name: 'eMap',
        start_url: '/map',
        display: 'standalone',
        theme_color: '#1E3A5F',
        background_color: '#0F172A',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /\/api\/geo\//,
            handler: 'CacheFirst',
            options: { cacheName: 'geo-cache', expiration: { maxAgeSeconds: 48 * 3600 } },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
      '/ws': { target: 'ws://localhost:8000', ws: true },
    },
  },
  resolve: {
    alias: { '@': '/src' },
  },
});

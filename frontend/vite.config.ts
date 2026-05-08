import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      manifest: {
        name: 'eMedosmotr Map',
        short_name: 'eMap',
        description: 'Система мониторинга внедрения медицинского оборудования',
        start_url: '/',
        display: 'standalone',
        theme_color: '#1E3A5F',
        background_color: '#0F172A',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8002', changeOrigin: true },
      '/ws': { target: 'ws://localhost:8002', ws: true },
      '/uploads': { target: 'http://localhost:8002', changeOrigin: true },
    },
  },
  resolve: {
    alias: { '@': '/src' },
  },
});

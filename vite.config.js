import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  server: { port: 8777, host: true },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
    sourcemap: true
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Sky Pilot Sandbox',
        short_name: 'Sky Pilot',
        description: 'Tilt-to-fly sandbox with 10 aircraft, procedures, parachute, vehicles, balloon & rocket',
        theme_color: '#070d18',
        background_color: '#070d18',
        display: 'standalone',
        orientation: 'any',
        start_url: './',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
        navigateFallback: 'index.html'
      }
    })
  ]
});

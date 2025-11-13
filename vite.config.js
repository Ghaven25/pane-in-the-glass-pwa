import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      injectRegister: 'auto',
      registerType: 'autoUpdate',
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
        cleanupOutdatedCaches: true
      },
      devOptions: {
        enabled: true,
        type: 'module'
      },
      manifest: {
        name: 'Pane in The Glass',
        short_name: 'Pane in The Glass',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#0b1216',
        theme_color: '#33c7e6',
        icons: [
          { src: '/icon-192.png?v=3', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png?v=3', sizes: '512x512', type: 'image/png' },
          { src: '/icon-192-maskable.png?v=3', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icon-512-maskable.png?v=3', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      }
    })
  ]
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/Ultimate64WebMusicPlayer/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['c64-logo.svg'],
      manifest: {
        name: 'Ultimate64 Web Music Player',
        short_name: 'U64 Music',
        description: 'Web-based C64 music player for Ultimate64',
        theme_color: '#483AAA',
        background_color: '#483AAA',
        display: 'standalone',
        icons: [
          {
            src: 'c64-logo.svg',
            sizes: 'any',
            type: 'image/svg+xml'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}']
      }
    })
  ],
  server: {
    proxy: {
      '/api/ultimate64': {
        target: process.env.VITE_ULTIMATE64_IP 
          ? `http://${process.env.VITE_ULTIMATE64_IP}` 
          : 'http://192.168.1.234',
        changeOrigin: true,
        rewrite: (path) => {
          // Remove prefix and decode the path to avoid double-encoding
          const newPath = path.replace(/^\/api\/ultimate64/, '')
          return decodeURIComponent(newPath)
        },
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log(`Proxying ${req.method} ${req.url} to ${proxyReq.path}`)
          })
          // Handle ECONNRESET - Ultimate64 closes connection after processing
          proxy.on('error', (err, req, res) => {
            console.log(`Proxy error (likely success): ${err.code || err.message}`)
            // If connection was reset, treat as success (command was processed)
            if (err.code === 'ECONNRESET') {
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ success: true, message: 'Command sent' }))
            } else {
              res.writeHead(502, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: err.message }))
            }
          })
        }
      }
    }
  }
})

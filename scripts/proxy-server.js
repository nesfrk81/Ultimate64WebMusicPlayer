import express from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import cors from 'cors'

const app = express()
const PORT = 3001

// Enable CORS for all routes
app.use(cors())

// Get Ultimate64 IP from environment or use default
const ULTIMATE64_IP = process.env.ULTIMATE64_IP || '192.168.1.234'

console.log(`Starting CORS proxy server...`)
console.log(`Proxying requests to: http://${ULTIMATE64_IP}`)
console.log(`Proxy server running on: http://localhost:${PORT}`)

// Proxy all requests to Ultimate64
app.use('/', createProxyMiddleware({
  target: `http://${ULTIMATE64_IP}`,
  changeOrigin: true,
  logLevel: 'info',
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[PROXY] ${req.method} ${req.url} -> http://${ULTIMATE64_IP}${req.url}`)
  },
  onError: (err, req, res) => {
    console.error('[PROXY ERROR]', err.message)
    res.status(500).json({ error: 'Proxy error', message: err.message })
  }
}))

app.listen(PORT, () => {
  console.log(`\nCORS proxy server ready!`)
  console.log(`Set VITE_PROXY_URL=http://localhost:${PORT} in your .env file`)
  console.log(`Or update api.js to use http://localhost:${PORT} in development\n`)
})

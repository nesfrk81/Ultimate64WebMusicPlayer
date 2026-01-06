# CORS Proxy Setup

The Ultimate64 REST API doesn't send CORS headers, which causes browser security restrictions when making requests from the web app.

## Development Mode - Option 1: Standalone Proxy Server (Recommended)

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set your Ultimate64 IP (optional, defaults to 192.168.1.234):
   ```bash
   export ULTIMATE64_IP=192.168.1.234
   ```

3. Start the proxy server in one terminal:
   ```bash
   npm run dev:proxy
   ```

4. Create a `.env` file in the project root:
   ```
   VITE_PROXY_URL=http://localhost:3001
   ```

5. Start the dev server in another terminal:
   ```bash
   npm run dev
   ```

## Development Mode - Option 2: Vite Proxy

1. Create a `.env` file in the project root:
   ```
   VITE_ULTIMATE64_IP=192.168.1.234
   ```
   (Replace with your actual Ultimate64 IP)

2. Restart the dev server:
   ```bash
   npm run dev
   ```

The Vite proxy will forward requests from `/api/ultimate64/*` to your Ultimate64 device.

## Production Mode

For production deployments, you have several options:

### Option 1: Browser Extension (Easiest)
Install a CORS browser extension like "CORS Unblock" or "Allow CORS" to bypass CORS restrictions.

### Option 2: Proxy Server
Set up a simple proxy server that adds CORS headers. Example using Node.js:

```javascript
const express = require('express')
const { createProxyMiddleware } = require('http-proxy-middleware')
const cors = require('cors')

const app = express()
app.use(cors())

app.use('/api/ultimate64', createProxyMiddleware({
  target: 'http://YOUR_ULTIMATE64_IP',
  changeOrigin: true,
  pathRewrite: { '^/api/ultimate64': '' }
}))

app.listen(3001)
```

### Option 3: Ultimate64 Firmware Update
If the Ultimate64 firmware is updated to include CORS headers, this issue would be resolved.

### Option 4: Serve from Same Origin
If you can serve the web app from the Ultimate64 device itself, CORS won't be an issue.

## Current Implementation

The app automatically uses the proxy in development mode (`npm run dev`) and attempts direct connections in production. If you encounter CORS errors in production, use one of the solutions above.

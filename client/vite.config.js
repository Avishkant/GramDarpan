import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
const backendTarget = process.env.VITE_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:6000'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Proxy API requests to backend during development. Target comes from env so
    // local development can mirror deployment URLs if needed.
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/api')
      }
    }
  }
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: process.env.PLANTPLAN_API_TARGET || 'http://127.0.0.1:8080',
        changeOrigin: false, // Keep Host aligned with the browser Origin for Spring's CORS check.
      },
    },
  },
})

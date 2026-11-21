import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const API_TARGET = process.env.VITE_API_PROXY ?? 'http://127.0.0.1:8000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    // The API is proxied so auth cookies stay same-origin in development.
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: false },
      '/admin': { target: API_TARGET, changeOrigin: false },
      '/static': { target: API_TARGET, changeOrigin: false },
    },
  },
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          data: ['@tanstack/react-query', 'i18next', 'react-i18next'],
          motion: ['framer-motion'],
        },
      },
    },
  },
})

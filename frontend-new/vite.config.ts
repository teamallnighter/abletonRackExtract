import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'visualization': ['@xyflow/react', 'd3-hierarchy', 'd3-zoom', 'd3-selection'],
          'state': ['zustand', '@tanstack/react-query', 'immer']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['@xyflow/react', 'd3-hierarchy', 'd3-zoom', 'd3-selection']
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true
      }
    }
  }
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': 'http://localhost:3003'
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split React core into its own chunk (cached independently)
          'vendor-react': ['react', 'react-dom'],
          // Split Recharts (large charting library) into its own chunk
          'vendor-charts': ['recharts'],
        }
      }
    }
  }
})

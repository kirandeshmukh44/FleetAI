import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The admin panel is a separate Vite app on its own port, proxying the
// /api/admin namespace to the admin Flask service (port 5001).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
    },
  },
})

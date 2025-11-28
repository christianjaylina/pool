import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Proxy all requests starting with /api to your Node.js backend
    proxy: {
      '/api': {
        target: 'http://localhost:5000', // Matches your server.js port
        changeOrigin: true,
        secure: false,
      },
    },
  },
});

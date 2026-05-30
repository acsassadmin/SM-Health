import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './api',

  plugins: [react()],

  server: {
    host: true,
    port: 5173,
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@mui/icons-material')) {
              return 'vendor-mui-icons';
            }
            if (id.includes('react') || id.includes('@supabase')) {
              return 'vendor-core';
            }
            return 'vendor-others';
          }
        }
      }
    }
  }
})
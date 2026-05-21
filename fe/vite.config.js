import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Fixes the 404 errors by making asset paths relative inside your IONOS subfolder
  base: './',
  
  plugins: [react()],
  
  build: {
    // Solves the "chunks larger than 500 kB" warning by chunking code safely
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Separate Material UI icons because they make the file massive
            if (id.includes('@mui/icons-material')) {
              return 'vendor-mui-icons';
            }
            // Separate core dependencies
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
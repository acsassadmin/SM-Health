import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'


export default defineConfig({
  base: './',
  
  plugins: [react()],
  
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
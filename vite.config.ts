import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '', 
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        histogram: resolve(__dirname, 'histogram-matching-js.html')
      }
    }
  }
})

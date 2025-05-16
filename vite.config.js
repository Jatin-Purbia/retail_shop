import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: "/retail_shop/",
  build:{

    outDir: 'dist',
  },
  plugins: [react()],
})

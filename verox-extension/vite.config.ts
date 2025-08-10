import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import webExtension from 'vite-plugin-web-extension'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), webExtension({ manifest: 'public/manifest.json' })],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {}
})

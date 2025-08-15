import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import webExtension from 'vite-plugin-web-extension'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    webExtension({
      disableAutoLaunch: true,
      manifest: () => import('./manifest.json').then(module => module.default),
    }),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  define: {
    'process.env': process.env
  }
})

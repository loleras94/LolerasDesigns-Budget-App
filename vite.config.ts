import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      viteStaticCopy({
        targets: [
          // Copy static assets into dist/
          { src: 'service-worker.js', dest: '' },
          { src: 'locales', dest: '' },
          { src: 'icon-192.svg', dest: 'assets' },
          { src: 'icon-512.svg', dest: 'assets' },
          { src: 'manifest.json', dest: '' },
        ],
      }),
    ],
    base: '/LolerasDesigns-Budget-App/', // ✅ required for GitHub Pages
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    define: {
      // Optional: define a global constant if you ever need one
      __APP_ENV__: env.MODE,
    },
  }
})

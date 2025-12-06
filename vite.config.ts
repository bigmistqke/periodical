import devtools from 'solid-devtools/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import solidPlugin from 'vite-plugin-solid'

export default defineConfig({
  base: './',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        display: 'standalone',
        icons: [
          {
            src: '/assets/cirkel.svg',
            sizes: '48x48 72x72 96x96 128x128 256x256',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }) as unknown as Plugin,
    devtools(),
    solidPlugin(),
  ],
  server: {
    port: 3000,
  },
  build: {
    target: 'esnext',
    minify: false,
  },
})

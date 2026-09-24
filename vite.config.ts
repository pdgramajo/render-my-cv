import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // GitHub Pages serves the app under /renderCV_web/; default to the site root.
  base: process.env.VITE_BASE ?? '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Icon files that ride along in the precache (also covered by globPatterns).
      includeAssets: [
        'pwa-64x64.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'maskable-icon-512x512.png',
        'apple-touch-icon-180x180.png',
        'favicon.ico',
      ],
      manifest: {
        name: 'RenderCV Web',
        short_name: 'rendercv',
        description: 'Convert RenderCV YAML to PDF entirely in your browser.',
        // One theme_color per manifest; pick the light theme (mirrors the
        // light media-scoped meta), with the same paper as background so the
        // launch screen blends into the app shell.
        theme_color: '#f4efe4',
        background_color: '#f4efe4',
        display: 'standalone',
        lang: 'en',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Only the app shell is precached (js/css/html/svg/png/ico/manifest).
        // The 28 MB Typst WASM is deliberately excluded — it would bloat the
        // install; it is runtime-cached on first compile instead. The explicit
        // byte cap is a second line of defense against accidental inclusion.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            // Typst WASM compiler (emitted to dist/assets/*.wasm via the
            // worker's `?url` import): cache-first after first fetch so an
            // offline compile works after one successful online compile.
            urlPattern: /\.wasm($|\?)/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'typst-wasm',
              expiration: { maxEntries: 2, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Vendored typst sources + fonts under public/typst/ (and any
            // future public/fonts/): same-origin only, cache-first after the
            // first compile. Google Fonts CDN is never touched (zero-network
            // privacy rule — the app shell uses fallback fonts offline).
            urlPattern: /\/(typst|fonts)\//i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'typst-assets',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  build: {
    // Inline bundled fonts (Raleway, Font Awesome) as base64 so font loading
    // adds zero network requests at runtime.
    assetsInlineLimit: 4 * 1024 * 1024,
  },
  worker: {
    format: 'es',
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text'],
    },
    // Integration tests compile a real PDF via the Typst WASM engine and can
    // take well over a minute; the fast unit suites far outpace this.
    testTimeout: 120_000,
  },
})
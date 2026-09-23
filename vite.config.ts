import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // GitHub Pages serves the app under /renderCV_web/; default to the site root.
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
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
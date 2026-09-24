#!/usr/bin/env node
/**
 * Regenerate the PWA icon set from the letterpress brand source SVG.
 *
 * Renders `scripts/icon-source.svg` into `public/` as the standard icon set:
 * pwa-64x64.png, pwa-192x192.png, pwa-512x512.png, maskable-icon-512x512.png,
 * apple-touch-icon-180x180.png and favicon.ico. Uses `@vite-pwa/assets-generator`'s
 * public API (same pipeline as the `pwa-assets-generator` CLI, but with an
 * explicit output directory so the PNGs land in `public/` instead of next to
 * the source SVG).
 *
 * Run with: npm run icons
 */
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateAssets } from '@vite-pwa/assets-generator/api/generate-assets'
import { instructions } from '@vite-pwa/assets-generator/api/instructions'
import { minimalPreset } from '@vite-pwa/assets-generator/presets/minimal'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const source = resolve(scriptDir, 'icon-source.svg')
const outDir = resolve(scriptDir, '..', 'public')

// Match the launcher-safe icons to the brand paper instead of the tool's
// default white padding (the transparent set keeps its 5% transparent margin).
const iconPreset = {
  ...minimalPreset,
  maskable: {
    ...minimalPreset.maskable,
    resizeOptions: { fit: 'contain', background: '#f4efe4' },
  },
  apple: {
    ...minimalPreset.apple,
    resizeOptions: { fit: 'contain', background: '#f4efe4' },
  },
}

const instruction = await instructions({
  imageResolver: () => readFile(source),
  imageName: source,
  originalName: 'scripts/icon-source.svg',
  preset: iconPreset,
  htmlLinks: { xhtml: false, includeId: false },
  basePath: '/',
  resolveSvgName: () => 'icon-source.svg',
})

const log = (message) => console.log(`  ${message}`)
await generateAssets(instruction, true, outDir, log)

console.log(`PWA icons generated into ${outDir.replace(process.cwd(), '.')}`)
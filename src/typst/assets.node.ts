/**
 * Node/Vitest counterpart of `assets.ts`.
 *
 * Loads the same `public/typst/**` files with `fs` so CI compiles the exact
 * artifacts the browser serves — without a dev server and without touching
 * the network. This module is imported ONLY by the Vitest smoke suite; it is
 * never reachable from the browser bundle (Vite 8 fails to bundle `node:fs`,
 * which is the point: the split keeps Node-only code out of the shipped
 * chunks).
 *
 * It also supplies the wasm bytes for the engine in vitest: the web-compiler
 * package's own Node shim resolves the wasm relative to `import.meta.url`,
 * which vite-node virtualizes to an `http://` URL — `readFileSync` then
 * throws "The URL must be of scheme file". Reading the package file directly
 * and handing the engine a `getModule` returning the bytes sidesteps the
 * shim entirely.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { FontBlob, TypstSource } from './assets';
import { FONT_MANIFEST } from './fontConfig';
import { VENDOR_ASSET_PREFIX, VENDORED_SOURCE_FILES } from './packageConfig';

/** Repo-root-relative base for the vendored asset directory. */
function vendoredAssetDir(): string {
  return join(process.cwd(), 'public', VENDOR_ASSET_PREFIX);
}

function readText(file: string): string {
  return readFileSync(join(vendoredAssetDir(), file), 'utf8');
}

/** Load every vendored `.typ` source from the repo's `public/typst/` tree. */
export async function loadVendoredSources(): Promise<TypstSource[]> {
  return VENDORED_SOURCE_FILES.map((file) => ({
    path: file.path,
    content: readText(file.file),
  }));
}

/** Load every vendored font from the repo's `public/typst/fonts/` tree. */
export async function loadVendoredFonts(): Promise<FontBlob[]> {
  return FONT_MANIFEST.map((entry) => ({
    path: entry.file,
    data: new Uint8Array(readFileSync(join(vendoredAssetDir(), entry.file))),
  }));
}

/** The web-compiler wasm shipped in `node_modules`, raw bytes. */
const WEB_COMPILER_WASM_PATH = join(
  process.cwd(),
  'node_modules',
  '@myriaddreamin',
  'typst-ts-web-compiler',
  'pkg',
  'typst_ts_web_compiler_bg.wasm',
);

/** `getModule` for vitest: return the wasm bytes so no shim URL is needed. */
export function loadNodeWasmBytes(): ArrayBuffer {
  return readFileSync(WEB_COMPILER_WASM_PATH).buffer;
}
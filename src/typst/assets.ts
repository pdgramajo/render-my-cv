/**
 * Vendored asset loading (PR-4 tasks 4.6, 4.7).
 *
 * The vendored `.typ` sources and fonts live in `public/typst/**` and are
 * loaded without bundling them into the JS payload:
 *
 * - Browser (this module): same-origin `fetch()` against
 *   `import.meta.env.BASE_URL` — the only network traffic is to the app's own
 *   static origin (zero external requests; the browser HTTP cache covers
 *   repeat reads).
 * - Node/Vitest (`assets.node.ts`): `fs.readFileSync` from the repo's
 *   `public/typst/` tree, so the offline smoke test exercises the exact same
 *   files the browser serves.
 *
 * `sources` are registered into the Typst virtual filesystem; `fonts` feed
 * `loadFonts(bytes, { assets: false })` at engine init (zero remote font
 * assets — the default DejaVu/Libertinus asset fetch from cdn.jsdelivr.net
 * is disabled by `assets: false`, which is what keeps the pipeline offline).
 */

import { FONT_MANIFEST } from './fontConfig';
import { VENDORED_SOURCE_FILES, VENDOR_ASSET_PREFIX } from './packageConfig';

/** One vendored Typst source: virtual path + file content. */
export interface TypstSource {
  /** Virtual filesystem path, e.g. `/rendercv/lib.typ`. */
  path: string;
  /** File content. */
  content: string;
}

/** One vendored font: public/-relative path + raw bytes. */
export interface FontBlob {
  /** public/-relative file path, e.g. `typst/fonts/Raleway-Regular.ttf`. */
  path: string;
  /** Raw font bytes. */
  data: Uint8Array;
}

/** Browser-relative base URL for the vendored asset directory. */
export function vendoredAssetBaseUrl(): string {
  return `${import.meta.env.BASE_URL}${VENDOR_ASSET_PREFIX}`;
}

/** Load every vendored `.typ` source via same-origin fetch. */
export async function loadVendoredSources(): Promise<TypstSource[]> {
  const base = vendoredAssetBaseUrl();
  const sources = await Promise.all(
    VENDORED_SOURCE_FILES.map(async (file) => {
      const response = await fetch(`${base}${file.file}`);
      if (!response.ok) {
        throw new Error(`Failed to load vendored typst source: ${file.file} (${response.status})`);
      }
      return { path: file.path, content: await response.text() };
    }),
  );
  return sources;
}

/** Load every vendored font via same-origin fetch. */
export async function loadVendoredFonts(): Promise<FontBlob[]> {
  const base = vendoredAssetBaseUrl();
  const fonts = await Promise.all(
    FONT_MANIFEST.map(async (entry) => {
      const response = await fetch(`${base}${entry.file}`);
      if (!response.ok) {
        throw new Error(`Failed to load vendored font: ${entry.file} (${response.status})`);
      }
      return { path: entry.file, data: new Uint8Array(await response.arrayBuffer()) };
    }),
  );
  return fonts;
}
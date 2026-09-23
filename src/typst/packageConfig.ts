/**
 * Vendored RenderCV Typst package metadata and the virtual filesystem layout
 * (PR-4 tasks 4.1–4.3, 4.7).
 *
 * The `public/typst/` tree mirrors the RenderCV 2.8 wheel's own bundling:
 *
 * ```
 * public/typst/rendercv/lib.typ            ← rendercv-typst v0.3.0 entry,
 *                                            line 1 patched from
 *                                            `#import "@preview/fontawesome:0.6.0": fa-icon`
 *                                            to `#import "typst_fontawesome/lib.typ": fa-icon`
 * public/typst/rendercv/typst.toml         ← provenance (package metadata)
 * public/typst/rendercv/LICENSE            ← provenance (MIT, rendercv/rendercv)
 * public/typst/rendercv/typst_fontawesome/ ← fontawesome 0.6.0 package source
 * public/typst/fonts/                      ← Raleway ×2 + Font Awesome 6 ×2 (OFL-1.1)
 * ```
 *
 * These constants are pure metadata (no I/O): the environment-aware loaders
 * in `assets.ts` / `assets.node.ts` resolve the `file` paths against their
 * runtime base (`import.meta.env.BASE_URL` in the browser, the repo root in
 * Node).
 */

/** Virtual root of the Typst compiler filesystem. */
export const VIRTUAL_ROOT = '/';

/** Where the generated entry document is mounted. */
export const MAIN_ENTRY_PATH = `${VIRTUAL_ROOT}main.typ`;

/** Where the vendored rendercv package entry is mounted. */
export const RENDERCV_ENTRY_PATH = `${VIRTUAL_ROOT}rendercv/lib.typ`;

/** Where the vendored fontawesome package is mounted (sibling of lib.typ). */
export const FONTAWESOME_ENTRY_PATH = `${VIRTUAL_ROOT}rendercv/typst_fontawesome/lib.typ`;

/** public/-relative directory that holds all vendored assets. */
export const VENDOR_ASSET_PREFIX = 'typst/';

/**
 * Every vendored `.typ` source that must be registered in the virtual
 * filesystem (tasks 4.7: the asset map covers every vendored `.typ` file).
 * `typst.toml` / `LICENSE` ride along in `public/typst/` for provenance only —
 * the compiler never reads them.
 */
export interface VendoredSourceFile {
  /** Virtual filesystem path (absolute, rooted at `VIRTUAL_ROOT`). */
  path: string;
  /** Path relative to the `public/typst/` vendored asset directory. */
  file: string;
}

export const VENDORED_SOURCE_FILES: VendoredSourceFile[] = [
  { path: RENDERCV_ENTRY_PATH, file: 'rendercv/lib.typ' },
  {
    path: FONTAWESOME_ENTRY_PATH,
    file: 'rendercv/typst_fontawesome/lib.typ',
  },
  {
    path: `${VIRTUAL_ROOT}rendercv/typst_fontawesome/lib-impl.typ`,
    file: 'rendercv/typst_fontawesome/lib-impl.typ',
  },
  {
    path: `${VIRTUAL_ROOT}rendercv/typst_fontawesome/lib-gen-func.typ`,
    file: 'rendercv/typst_fontawesome/lib-gen-func.typ',
  },
  {
    path: `${VIRTUAL_ROOT}rendercv/typst_fontawesome/lib-gen-map.typ`,
    file: 'rendercv/typst_fontawesome/lib-gen-map.typ',
  },
];
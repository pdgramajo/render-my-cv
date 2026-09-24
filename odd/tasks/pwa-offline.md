# Feature: PWA — installable/offline

## Objective
Make RenderCV Web a proper PWA: installable on Android (Chrome) and iOS (Safari) with a manifest + icons, and offline-capable after first use (including the 28 MB Typst WASM compiler).

## Problem / Why
The original SDD prompt scheduled PWA explicitly as "posteriormente" (later). It is now the main remaining capability gap: the app currently has no manifest, no icons, no service worker, so it cannot be installed and has no offline behavior. Mobile-first was always a stated goal (the design doc drives mobile-first CSS, coarse-pointer preview fallback), so PWA completes that promise.

## Constraints / Context (verified)
- GitHub Pages deploy under **base path** `VITE_BASE=/render-my-cv/` (default `/` in `vite.config.ts`). Manifest start_url/scope and SW registration MUST work under the subpath.
- Strict TDD: **false** (sdd-init record) — run ordinary functional checks (tests/tsc/build).
- Stack: Vite 8 + React 19 + TS. `vite-plugin-pwa@1.3.0` supports `vite ^8.0.0` (verified peerDependencies).
- No existing icons anywhere (`public/` has no png/svg/ico/webmanifest). Brand is "letterpress atelier" — cream paper + ink + `¶` glyph accent.
- Vendored assets live under `public/typst/` and `public/fonts/` (fetched at runtime by the worker; the wasm compiler is separate ~28.4 MB with gzip ~10.9 MB).
- Deploy workflow already emits `dist/` and uploads it; icon/manifest/SW must land in `dist/` so the existing workflow publishes them unchanged (no workflow edit expected).
- Privacy rule from sdd-init: if localStorage/IndexedDB/Cache Storage is used, justify and document it (Cache Storage = service worker cache, justified for offline).

## Scope (authorized)
1. Manifest (`webmanifest`) with correct colors from the design system (light `#f4efe4`, dark `#17140f` — match existing `theme-color` metas), display standalone, start_url/scope honoring VITE_BASE.
2. Icons: generate from a source SVG/PNG matching the letterpress brand: at least 192x192 + 512x512 (and maskable variant for Android install). Keep icons small; generate with a script into `public/` (or via a devDependency tool).
3. Service worker: shell (JS/CSS/HTML) precached — **runtime cache** (cache-first after first fetch) for the 28 MB wasm + typst fonts/sources, NOT precache (install would download ~10-28 MB upfront). Offline guarantee: after one successful online compile, everything needed for offline compiles is cached. `registerType` prudent: autoUpdate (content changes should reflect quickly) with expected behavior documented.
4. Register SW in the app; add install affordance evidence (beforeinstallprompt UI is optional — decision: keep minimal, no custom install banner unless trivial; manifest alone satisfies "instalable").
5. README: short "Install / Offline" note.
6. Tests: add/extend a unit test only where cheap and meaningful (e.g., assets manifest config sanity — avoid heavy SW tests in jsdom). Functional checks = `npm test`, `npx tsc --noEmit`, `npm run build`, plus manual/scripted verification of dist artifacts (manifest, sw.js, icons under subpath).

## Out of scope
- Custom install banner / beforeinstallprompt UI.
- Push notifications, background sync, periodic sync.
- Workbox advanced strategies beyond cache-first runtime for wasm/fonts/sources.

## Acceptance criteria
- `npm run build` (with and without `VITE_BASE=/render-my-cv/`) emits `dist/manifest.webmanifest` (or linked manifest file), a service worker (e.g., `dist/sw.js`), and icon files; built app registers the SW.
- Manifest `start_url`/`scope` resolve correctly under `/render-my-cv/` when deployed (relative or base-aware).
- After first compile online, the app works offline (wasm, fonts, typst sources cached; shell precached).
- No security regression: scope-limited SW, no external runtime network (zero-network guarantee preserved — workbox must NOT attempt to cache external Google Fonts; the app loads Fraunces/Spline via CDN in index.html — those are NOT needed for PDF generation; offline app shell may show fallback fonts, acceptable).
- PR-friendly size: this feature should land as ONE or TWO work-unit commits (chained later if 400-line budget exceeded — unlikely).

## Tasks
- [x] **T1** Add `vite-plugin-pwa` (pin ^1.3.0) + register the `VitePWA` plugin in `vite.config.ts` with manifest (name/short_name/theme colors/display standalone, icons), `registerType: 'autoUpdate'`, and workbox config: precache patterns `**/*.{js,css,html,svg,png,ico,webmanifest}` excluding wasm; runtimeCaching cache-first for `\.wasm($|\?)` and `typst|fonts` asset paths. Verify `npm run build` emits dist artifacts under base. ✅ Commit `dc34da4` (capability)
- [x] **T2** Create brand icon source (letterpress: cream background, ink `¶` glyph, accent) as SVG; generate 192/512 + maskable PNGs (e.g., via a small Node script or `sharp`/pwa-assets-generator devDep) into `public/`; add `<link rel="icon">`/apple-touch-icon/maskable entries consistent with manifest; README "Install / Offline" note. ✅ Commit `b4a5ae4` (assets/docs)
- [x] **T3** Wire SW registration in `src/main.tsx` (guarded, jsdom-safe); verified artifacts under both base configs. ✅ Commits `dc34da4` + `b4a5ae4`

## Verification evidence
- `npm test`: 66 passed / 7 files (jsdom unaffected)
- `npx tsc --noEmit` + `-p tsconfig.node.json`: clean
- `npm run build` (default base): precache 23 entries (364 KiB), wasm absent from precache; `VITE_BASE=/render-my-cv/ npm run build`: manifest start_url/scope `/render-my-cv/`, sw.js with `typst-wasm` + `typst-assets` CacheFirst routes, skipWaiting+clientsClaim
- Parent spot check (rerun): manifest JSON valid (4 icons, standalone, cream colors), precache list contains ONLY small assets (no `.wasm` blob), 66 tests green
- Authored lines (excl. lockfile): 179 — under 400 budget, no chained PR needed
- Risk (gentle-ai assess, base-diff): medium — writer self-verification sufficient per RDD-off gate; no separate verifier needed (not small-model profile)

## Progress
- [x] T1 ✅ `dc34da4`
- [x] T2 ✅ `b4a5ae4`
- [x] T3 ✅ `dc34da4` + `b4a5ae4`
- [x] Merge `feat/pwa-offline` → `main` + push (user decision under repository policy) ✅ merge commit `087bdb3` pushed 2026-09-24; Pages run 36056877698 success
- [ ] Optional: manual install smoke test on real Android/iOS device

## Authorized edit roots
- `vite.config.ts`, `src/main.tsx`, `public/` (icons + manifest if created there), `index.html` (only if needed for icons/theme), `package.json` (+ lockfile), `README.md`, new test files under `src/`.

## Route declaration
- Writer: delegated (2+ non-trivial files) via `general` agent. Tasks T1–T3 all delegated in one writer; writer commits in work units per `work-unit-commits` skill, on branch `feat/pwa-offline`.

## Verification (writer must run and report `<command>: <observed result>`)
- `npm test`
- `npx tsc --noEmit`
- `npm run build` (default base)
- `VITE_BASE=/render-my-cv/ npm run build` then inspect `dist/manifest.webmanifest`, `dist/sw.js`, `dist/*.png` icons exist and paths/scope are base-aware.
- `npm run preview` smoke (optional, if quick) — report App loads + SW registers in console.

## Known environmental failures
- None. Do NOT treat jsdom lacking SW as a test failure — registerSW must not throw there.
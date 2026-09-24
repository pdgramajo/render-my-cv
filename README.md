# render-my-cv

Render RenderCV YAML résumés to PDF entirely in your browser — zero uploads, Typst WASM, works on desktop and mobile.

**Try it live:** [pdgramajo.github.io/render-my-cv](https://pdgramajo.github.io/render-my-cv/)

A typesetting desk for [RenderCV](https://github.com/sinaatalay/rendercv)-compatible YAML résumés. Validation, layout and PDF compilation all happen locally: your CV never leaves your device.

## What it does

- **YAML in, PDF out** — drop a `.yaml` file in the RenderCV format, get a polished PDF.
- **100% client-side** — no servers, no uploads. The Typst compiler runs as WebAssembly in your browser tab.
- **Zero network after load** — fonts, the RenderCV Typst theme and the compiler are bundled and vendored locally.
- **Works on desktop and mobile** — installable as a PWA-friendly static site on GitHub Pages.

## Install / Offline

The site is a Progressive Web App: browsers that support it offer **Install** (or **Add to Home Screen**) from the menu — no app store needed. The app shell (UI, styles, scripts) is precached, so the page opens immediately with an internet connection and works offline from the first visit. The Typst compiler and its fonts are fetched on demand and cached after your first successful PDF compile, so once you have compiled online, offline PDF generation works too. Service workers update automatically when a new version is deployed.

## Getting started

```bash
npm install
npm run dev
```

Open the printed local URL, drop `example.yaml` into the workbench, and download the rendered PDF.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck + production build to `dist/` |
| `npm run preview` | Preview the production build |
| `npm test` | Vitest suite (component + YAML/Typst unit tests) |
| `TYPST_INTEGRATION=1 npm test` | Full suite including the WebAssembly integration test (generates a real PDF) |

## How it works

1. **Parse** — the YAML file is parsed and validated against the RenderCV model schemas.
2. **Render** — your data is composed into a Typst source document using a vendored RenderCV theme.
3. **Compile** — the Typst WebAssembly compiler turns it into PDF bytes, rendered in an embedded preview.
4. **Download / Share** — export the PDF with your file's name, or share it via the Web Share API.

Built with React 19, Vite, TypeScript, `js-yaml` and `typst.ts` (Typst WASM).

## Deployment

The repository ships a GitHub Actions workflow (`.github/workflows/deploy.yml`) that runs the test suite and publishes `dist/` to GitHub Pages. Set the workflow to run on `main`, and configure Pages to deploy from **GitHub Actions**.

For a repository-pages deployment (default `https://<owner>.github.io/<repo>/`), the build needs the base path:

```bash
VITE_BASE=/render-my-cv/ npm run build
```

## License

MIT © pdgramajo — see [LICENSE](./LICENSE).

Third-party assets and their licenses are listed in [THIRD_PARTY.md](./THIRD_PARTY.md).
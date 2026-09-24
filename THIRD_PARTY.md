# Third-party notices

This project builds on open-source software. Licenses are reproduced in full where the asset is vendored into the repository; otherwise the license text is available at the linked source.

## Runtime dependencies

| Package | License | Notes |
| --- | --- | --- |
| [typst.ts](https://github.com/Myriad-Dreamin/typst.ts) (`@myriaddreamin/typst.ts`, `@myriaddreamin/typst-ts-web-compiler`) | [Apache-2.0](node_modules/@myriaddreamin/typst.ts/LICENSE) | Typst WebAssembly compiler |
| [React](https://react.dev) / [React DOM](https://react.dev) | MIT | UI |
| [js-yaml](https://github.com/nodeca/js-yaml) | MIT | YAML parsing |
| [Vite](https://vitejs.dev) + plugins | MIT | Build tooling |

## Vendored in `public/typst/`

The RenderCV Typst theme and its FontAwesome binding are vendored from [RenderCV](https://github.com/sinaatalay/rendercv), **MIT © 2023 Sina Atalay and individual contributors** (see [LICENSE](public/typst/rendercv/LICENSE)).

- `public/typst/rendercv/` — RenderCV Typst theme including `typst_fontawesome/`
- `public/typst/fonts/Raleway-*.ttf` — Raleway typeface, [SIL Open Font License 1.1](https://scripts.sil.org/OFL)
- `public/typst/fonts/fa-*.ttf` — Font Awesome Free icon fonts, [SIL Open Font License 1.1](https://fontawesome.com/license/free)

## Web fonts loaded at runtime

Google Fonts CSS is loaded from `fonts.googleapis.com` in `index.html` (worst case, the app falls back to system font stacks):

| Font | License |
| --- | --- |
| Fraunces | [SIL OFL 1.1](https://scripts.sil.org/OFL) |
| Spline Sans | [SIL OFL 1.1](https://scripts.sil.org/OFL) |
| Fragment Mono | [SIL OFL 1.1](https://scripts.sil.org/OFL) |

## Distribution note

`node_modules` is not committed. The TypeScript WASM packages are bundled at build time; their Apache-2.0 notices are preserved in the `dist/` output where the bundler carries them.
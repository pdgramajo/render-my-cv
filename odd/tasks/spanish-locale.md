# Feature: Spanish/English section-name support

## Objective
A YAML using Spanish section keys (`resumen`, `experiencia`, `educación`,
`habilidades`) plus `locale: language: spanish` must render a full PDF, as
official RenderCV does — instead of an empty PDF with only name/headline.
Support is limited to Spanish and English.

## Problem / Why
Section keys were hardcoded English-only in `model.ts` conversion,
`validateRenderCv.ts`, and the `renderCvToTypst.ts` switch. `locale` was
silently dropped. Unknown (Spanish) section keys fell through to `default`
and were skipped → empty body in the PDF.

## Design decisions
- Preserve the original section name (e.g. `Resumen`) as the rendered Typst
  title (`== Resumen`), while mapping to a canonical `type` for
  parse/validate/render/serialize.
- `normalizeSectionType(name)` (case-insensitive, trimmed) maps
  summary|resumen|perfil|objective|objetivo → summary,
  experience|experiencia|work|trabajo|employment|laboral → experience,
  education|educación|formación|estudios|academic → education,
  skills|habilidades|competencias|tecnologías|idiomas|languages → skills.
  Unknown keys keep their raw lowercased key so renderers skip them.
- Model shape change: `SectionEntry { name, type: string, payload }`;
  `CvSections = Record<string, SectionEntry>`. Fragment functions take the
  display title as first argument.

## Scope
- Branch: `feature/spanish-locale-support` (never on default branch).
- Languages: Spanish + English only.

## Checklist
- [x] T1 — Map section names in `model.ts` / `validateRenderCv.ts` via `normalizeSectionType`
- [x] T2 — Restructure types (`SectionEntry`, `CvSections`) and consumers (form steps, fragments, renderer, serializer)
- [x] T3 — Preserve original section name as Typst title (`== <original>`)
- [x] T4 — Fix typecheck fallout (duplicate `CvSections`, missing imports, payload casts in tests)
- [x] T5 — Spanish fixture + end-to-end test: Spanish YAML → PDF (`src/__fixtures__/spanish.yaml`, `src/__tests__/spanish-locale.test.ts`)
- [ ] T6 — Work-unit commit on the feature branch

## Verification
- `npm run test`: 12 files / 102 tests passed (2026-10-15).
- `npx tsc --noEmit` + `tsc --noEmit -p tsconfig.node.json`: OK.
- Spanish fixture compiles to a real PDF (header `%PDF-`).

## Delivery strategy
`ask-on-risk` default; forecast is well under 400 changed lines → single
work-unit commit on `feature/spanish-locale-support`.

## Next step
Commit the work unit (T6), then report outcome.

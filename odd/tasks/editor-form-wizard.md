# Feature: Editor Form Wizard (schema-driven form + raw toggle)

## Objective
Replace the single file-drop + textarea-intent with a **schema-driven, step-by-step form** that edits the typed `RenderCv` model directly. Each YAML key of the known schema gets its own input; unknown/advanced keys stay reachable through a **raw YAML toggle**. Autosave the draft locally (`localStorage`). Compile still feeds the existing pipeline.

Approved decision: **Approach B (schema-driven form + raw toggle)**, not generic key-scanning. Wizard by steps instead of one giant form (user request).

## Problem
- Today the app only compiles from an uploaded file; the user cannot draft or edit inside the app.
- The `RenderCv` model is a stable typed schema (~65 lines) — generic YAML key-scanning would create useless fields for keys outside the renderer's known subset.
- A single huge form is hostile on mobile and in the letterpress workbench UI.

## Why
User wants to "capture the keys of the YAML and build a dynamic form" — implemented correctly as schema-driven (Approach B approved explicitly) because the renderer only knows a fixed subset and drops unknown keys silently. User also asked for a multi-step wizard instead of one big form.

## Scope (authorized)
- New branch `feat/editor-form-wizard` (already created); **do NOT push** — user tests locally.
- Schema-driven form for the full typed `RenderCv` subset (all fields in `src/types/rendercv.ts`).
- Wizard steps, one per logical group.
- Raw YAML edit toggle (escape hatch for unknown/advanced keys).
- Autosave draft to `localStorage` + restore on load.
- Import file still works (prefills the form); Start over clears form + draft.
- Compile uses the existing pipeline (`parse → validate → compileTypst`) from the form state — the pipeline itself is UNCHANGED.
- Tests, docs (README note + this feature doc).

## Constraints / fixed decisions
1. **Pipeline untouched** (`src/yaml/parse.ts`, `src/rendercv/*`, `src/pdf/*`, `src/typst/*`): form serializes a model back to YAML text, then existing `parseRenderCvYaml`/`validateRenderCv`/`compileTypst` handle it. No changes to validation rules, error table, or renderer.
2. **Serializer inverted from `convertToModel`**: internal camelCase (`socialNetworks`, `startDate`, `boldKeywords`) must map back to YAML snake_case (`social_networks`, `start_date`, `bold_keywords`) using `js-yaml` `dump`. Roundtrip for the known subset must be model-idempotent.
3. **Unknown/advanced keys** (e.g., `design.theme` in real RenderCV YAML, unknown sections) are preserved ONLY via the raw toggle text; the form model drops them (same as today's converter). The raw toggle is the escape hatch. No silent data loss: warn when a parsed document contained unknown keys.
4. **js-yaml is the only YAML lib** (already a dependency; includes `dump`). No new runtime deps; no new forms library — plain React state + declarative schema.
5. **Autosave**: localStorage key `rendercv.wizard.draft.v1`, debounced (~500 ms), JSON `{ model, raw }`. Guarded so jsdom/tests pass (matchMedia/localStorage mocks where needed).
6. **Wizard steps** (user request — not one giant form):
   - Step 1: Header — name, headline, location, email, phone, social networks list
   - Step 2: Summary — list of markdown paragraphs
   - Step 3: Experience — list of entries (company, position, location, start/end month, highlights, boldKeywords)
   - Step 4: Education — list of entries (institution, area, location, months, highlights)
   - Step 5: Skills — list of entries (label, details)
   - Step 6: Review & Raw — sees the serialized YAML + toggles raw editing; compile also offered here (or in Actions, unchanged).
   - Stepper UI at top; per-step input components; "Back"/"Next"; no forced pre-validation between steps (validation happens at compile, same as today), but fields with `required` show inline hint.
7. **Field types per schema**: text (single line), textarea-markdown (multi-line, for summary/highlights/details), month (`YYYY-MM` input with `present` checkbox for end dates when applicable), list editors for repeatable entries. Each list entry has stable identity for add/remove/reorder (index-based is okay but deleting must renumber correctly — use entry ids derived from index intentionally; reorder optional, skip unless trivial).
8. Design language continues the letterpress workbench (existing styles.css tokens; follow `work-unit-commits` skill for commit shape).
9. Accessibility: label every field, aria for step nav, `role="status"` for save/error states, keyboard operable.

## Acceptance criteria
- [x] A user can load/type a YAML, see it split into wizard steps, edit each known key, and produce a PDF via the same compile pipeline.
- [x] Serialization roundtrip: `parse(example.yaml) → model → serialize → parse → model` is equal for the known subset (test).
- [x] Raw toggle shows the complete current YAML; edits there compile directly; unknown keys entered in raw mode survive that compile.
- [x] Draft autosaves after editing and restores on reload (localStorage; test with mock).
- [x] File import prefills the form (test); Start over clears form + draft + preview.
- [x] No regression: full existing suite stays green, tsc + build (both `VITE_BASE` configs) pass.
- [x] No push from branch (user tests locally via `npm run dev`).

## Tasks

### T0 — UX: classic default view + "Edit YAML" gate (NEW, user decision)
- Default view = CLASSIC workbench exactly like main: FileInput drop → compile → preview + Actions.
- Wizard is NOT shown by default. A visible **"Edit YAML"** button in the left controls panel switches to wizard mode (`view` / `edit` state in App; default `view`).
- From wizard, a **"← Back to preview"** control returns to classic view without losing draft/model.
- Import file still compiles immediately (classic behavior); wizard accessible afterwards via Edit YAML when a model exists.

### T1 — Serializer `modelToYaml` (READY)
- File: `src/rendercv/serialize.ts` (new) exporting `renderCvToYaml(model: RenderCv): string` (+ maybe `parseYamlToModel` wrapper already exists via parse.ts).
- Invert `convertToModel`: snake_case keys (`social_networks`, `start_date`, `end_date`, `bold_keywords`), preserve section order via `Object.entries` order of `sections`, dump with js-yaml `dump`.
- Checks: `npm test` (new serializer unit tests), tsc.

### T2 — Form schema declaration (READY)
- File: `src/form/schema.ts` (new): declarative config for each field: key path, label, type (`text | textarea | month | month-present | list`), required flag, placeholder, section grouping. Covers every field of `RenderCv`.
- Test: a types-level/unit check that the schema references only real model fields (spot-check via fixture roundtrip).
- Checks: tsc, existing tests.

### T3 — Wizard steps UI
- Files: `src/components/form/` (new components): `FieldText`, `FieldTextarea`, `FieldMonth`, `EditableList` (generic add/remove rows, used for social networks, summary paragraphs, experience/education/skills entries, highlights), `Stepper` (steps indicator), `StepHeader`, per-step containers `HeaderStep`, `SummaryStep`, `ExperienceStep`, `EducationStep`, `SkillsStep`, `ReviewStep` (raw toggle + YAML preview + compile CTA).
- Local state per step edits a copy; parent owns `RenderCv` model; onChange bubbles up.
- Checks: component tests (render, edit, add/remove), tsc, `npm test`.

### T4 — App integration + autosave + raw toggle
- `src/App.tsx`: holds `model: RenderCv | null`, `rawDraft: string`, step index; handlers `onModelChange`, `onCompileFromModel`, `onCompileFromRaw`, `onImportFile`, `onStartOver`.
- `src/hooks/useDraft.ts` (new): localStorage autosave (debounced), restore on mount, clear.
- `src/components/FileInput.tsx`: keep; on file → parse → set model (prefill form).
- Raw toggle: `ReviewStep` shows textarea with current YAML when active; compile from raw uses `parseRenderCvYaml(raw)` → `validateRenderCv` → `compileTypst` identical to old file path; warn if document contained unsupported keys (compare raw keys vs known schema).
- Actions/Download/Share unchanged where possible.
- Checks: e2e-ish component test (import fixture → model → edit → compile produces pdfUrl), `npm test`, tsc, build both bases.

### T5 — Whitespace/styling + docs (READY)
- `src/styles.css` additions for stepper, fields, lists, raw panel, save indicator. Follow existing letterpress tokens.
- README: short "Form editor + autosave" note.
- Checks: tsc, `npm run build`, visual sanity via `npm run dev` (user does final visual check locally).

## Verification (per task, run all)
- `npm test` (full suite; new tests added per task)
- `npx tsc --noEmit`
- `npm run build` (default base) and `VITE_BASE=/render-my-cv/ npm run build`

## Delivery / commits (no push)
- Feature branch `feat/editor-form-wizard`; ~300-400 authored lines expected (under budget).
- 2-3 work-unit commits (Conventional Commits, no AI attribution):
  1. `feat(form): add schema-driven wizard editor with autosave` (T1-T4)
  2. `docs: record wizard editor feature and tests` (T5 + this doc)
- NO push — user tests locally.

## Risks / open questions
- **Roundtrip fidelity**: YAML ordering/quoting may differ after `dump`; mitigations: unit roundtrip test equality on model (not raw text), accept cosmetic YAML diffs.
- **Unknown keys**: dropped by form editing (by design, same as converter); raw toggle preserves them for compile. Warn clearly.
- **jsdom/localStorage**: mock in tests; real behavior user-verified locally.
- **Stepper state on large lists**: lists are small (CVs); fine.

## Authorized edit roots
`src/` (new files under `src/form/`, `src/components/form/`, `src/hooks/`, `src/rendercv/serialize.ts`), `src/styles.css`, `src/App.tsx`, `src/components/FileInput.tsx`, `odd/tasks/editor-form-wizard.md`, `README.md`. Pipeline files (`src/yaml/`, `src/rendercv/*` except new `serialize.ts`, `src/pdf/`, `src/typst/`) are READ-ONLY.

## Status
- [x] T1 modelToYaml — `src/rendercv/serialize.ts` + 6 unit tests
- [x] T2 form schema — `src/form/schema.ts` + 8 unit tests
- [x] T3 wizard steps UI — `src/components/form/` (12 component tests)
- [x] T4 app integration + autosave + raw toggle — `src/App.tsx`, `src/hooks/useDraft.ts` (6 integration tests)
- [x] T5 styles + docs — `src/styles.css`, README note, this doc
- [x] T0 classic-default view + Edit YAML gate — commit `3ac28ba` (default classic view, "Edit YAML" opens wizard, "← Back to preview" keeps state, import stays in view; +112/−25)
- Commits:
  1. `feat(form): add schema-driven wizard editor with autosave`
  2. `docs: record wizard editor feature and tests`
  3. `feat(form): gate wizard behind Edit YAML on classic view`
- Suite: 100 tests (11 files) green; tsc + both builds green; NO push — user verifies locally via `npm run dev`.

## Delivery decision PENDING (do not merge silently)
- Authored lines: **2785** (excl. lockfile; includes 557 CSS + 631 tests + 262 schema) — exceeds the ~400 budget.
- When the user decides to deliver to main: chained-PR split (step groups or capability) OR maintainer-approved `size:exception`. This branch is a local preview only.
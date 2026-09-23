/**
 * Vendored font manifest (PR-4 task 4.5 — Raleway ×2 + Font Awesome 6 ×2).
 *
 * Family names and weights were verified against the actual TTF name tables
 * (fontTools) after download:
 *
 * | File                   | Family                           | Weight |
 * |------------------------|----------------------------------|--------|
 * | fonts/Raleway-Regular.ttf | Raleway                       | 400    |
 * | fonts/Raleway-Bold.ttf    | Raleway                       | 700    |
 * | fonts/fa-regular-400.ttf  | Font Awesome 6 Free Regular   | 400    |
 * | fonts/fa-solid-900.ttf    | Font Awesome 6 Free Solid     | 900    |
 *
 * Raleway is the lib.typ default text family; the FA webfonts serve the
 * header connection icons. NOTE (parity risk, see design open question #3):
 * typst-fontawesome 0.6.0 targets version 7 desktop-font family names
 * ("Font Awesome 7 Free"), so the FA6 webfonts register but do not match —
 * icons fall back to the text font. Compilation is unaffected; glyph parity
 * is addressed with the renderer in PR-5.
 */

/** Directory of the font files, relative to the vendored asset directory. */
export const FONT_ASSET_PREFIX = 'fonts/';

export interface FontEntry {
  /** Path relative to the `public/typst/` vendored asset directory. */
  file: string;
  /** Font family as declared in the font's name table. */
  family: string;
  /** Numeric weight (OS/2 usWeightClass). */
  weight: number;
}

export const FONT_MANIFEST: FontEntry[] = [
  { file: `${FONT_ASSET_PREFIX}Raleway-Regular.ttf`, family: 'Raleway', weight: 400 },
  { file: `${FONT_ASSET_PREFIX}Raleway-Bold.ttf`, family: 'Raleway', weight: 700 },
  {
    file: `${FONT_ASSET_PREFIX}fa-regular-400.ttf`,
    family: 'Font Awesome 6 Free Regular',
    weight: 400,
  },
  {
    file: `${FONT_ASSET_PREFIX}fa-solid-900.ttf`,
    family: 'Font Awesome 6 Free Solid',
    weight: 900,
  },
];

/** The lib.typ default text family (exercised by the smoke compile). */
export const FONT_FAMILY_RALEWAY = 'Raleway';
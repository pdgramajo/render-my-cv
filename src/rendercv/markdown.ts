/**
 * Markdown → Typst converter for the fixture's markdown subset:
 * bold (`**bold**` → `*bold*`), inline links (`[label](url)` →
 * `#link(url)[label]`), and unordered lists (`- item`, identical syntax in
 * Typst so lines pass through unchanged). Raw `#` and `$` are escaped.
 *
 * `bold_keywords` (experience `bold_keywords`) are applied with full-word
 * matching — word boundaries only, no partial matches ("React" never matches
 * "ReactJS"). The conversion order is deliberate:
 *
 *   1. bold keywords   → `**keyword**`
 *   2. bold            → `*keyword*`
 *   3. escape `#`/`$`
 *   4. links           → `#link(...)[...]` (introduced `#` must stay raw)
 *
 * Single-star `*emphasis*` and `_emphasis_` are already valid Typst syntax
 * and pass through untouched (MVP subset; RenderCV's full italic conversion
 * is out of scope).
 */

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function applyBoldKeywords(text: string, keywords: string[] | undefined): string {
  if (keywords === undefined || keywords.length === 0) {
    return text;
  }
  const pattern = new RegExp(`\\b(${keywords.map(escapeRegex).join('|')})\\b`, 'g');
  return text.replace(pattern, '**$1**');
}

/**
 * Convert the MVP markdown subset to Typst markup.
 *
 * @param text The markdown text (a highlight, headline, or paragraph).
 * @param boldKeywords Optional full-word keywords to bold.
 */
export function renderMarkdown(text: string, boldKeywords?: string[]): string {
  let out = applyBoldKeywords(text, boldKeywords);
  out = out.replace(/\*\*([\s\S]+?)\*\*/g, '*$1*');
  out = out.replace(/#/g, () => '\\#').replace(/\$/g, () => '\\$');
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '#link($2)[$1]');
  return out;
}
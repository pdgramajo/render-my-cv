/**
 * Hand-rolled ports of the RenderCV `.j2.typ` fragments (design D2, D7):
 * preamble, header, per-section and per-entry templates, with the
 * `main_column` and `date_and_location_column` builders.
 *
 * Shape contract: the generated Typst mirrors the design's entry example —
 *
 * ```typst
 * #regular-entry(
 *   [
 *     *Independent*
 *     _Software Engineer_
 *
 *     - Building SaaS products, ...
 *   ],
 *   [
 *     2025-12 to present
 *     Argentina
 *   ],
 * )
 * ```
 *
 * Dates render literally in `YYYY-MM` form with the literal `present` end
 * date (design D7 — spec wins over CLI month-name formatting). Exact spacing
 * parity against the vendored reference templates is asserted in PR-4 (4.12).
 */

import { renderMarkdown } from './markdown';
import { connectionsFragment } from './socialNetworks';
import type {
  EducationEntry,
  ExperienceEntry,
  RenderCv,
  SkillEntry,
} from '../types/rendercv';

/** Quote a value for a Typst string literal. */
function typstString(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
}

/**
 * A Typst content block: `[...]` when empty, otherwise the content indented
 * 4 spaces between 2-space brackets (matches the entry template convention).
 */
function contentBlock(content: string): string {
  if (content.length === 0) {
    return '[]';
  }
  const indented = content
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n');
  return `[\n${indented}\n  ]`;
}

/**
 * The entry's main column: bold name line, italic subtitle line, then a bullet
 * block for highlights (source order, markdown-converted, `bold_keywords`
 * applied). Empty highlights produce no bullet block and no blank separator.
 */
export function mainColumn(
  bold: string | undefined,
  italic: string | undefined,
  highlights: string[] | undefined,
  boldKeywords: string[] | undefined,
): string {
  const lines: string[] = [];
  if (bold !== undefined && bold.length > 0) {
    lines.push(`*${bold}*`);
  }
  if (italic !== undefined && italic.length > 0) {
    lines.push(`_${italic}_`);
  }
  const bullets = (highlights ?? [])
    .filter((highlight) => highlight.length > 0)
    .map((highlight) => `- ${renderMarkdown(highlight, boldKeywords)}`);
  if (bullets.length > 0) {
    lines.push('');
    lines.push(...bullets);
  }
  return lines.join('\n');
}

/**
 * The entry's second column: `start to end` dates and the location.
 * `present` renders literally; a start-only or end-only date renders alone
 * (no invented partner); absent dates render no date line at all.
 */
export function dateAndLocationColumn(
  startDate: string | undefined,
  endDate: string | undefined,
  location: string | undefined,
): string {
  const lines: string[] = [];
  if (startDate !== undefined && endDate !== undefined) {
    lines.push(`${startDate} to ${endDate}`);
  } else if (startDate !== undefined) {
    lines.push(startDate);
  } else if (endDate !== undefined) {
    lines.push(endDate);
  }
  if (location !== undefined && location.length > 0) {
    lines.push(location);
  }
  return lines.join('\n');
}

/** `#regular-entry` wrapper for one experience entry. */
export function experienceEntry(entry: ExperienceEntry): string {
  const main = mainColumn(entry.company, entry.position, entry.highlights, entry.boldKeywords);
  const second = dateAndLocationColumn(entry.startDate, entry.endDate, entry.location);
  return `#regular-entry(\n  ${contentBlock(main)},\n  ${contentBlock(second)},\n)`;
}

/** `#education-entry` wrapper for one education entry. */
export function educationEntry(entry: EducationEntry): string {
  const main = mainColumn(entry.institution, entry.area, entry.highlights, undefined);
  const second = dateAndLocationColumn(entry.startDate, entry.endDate, entry.location);
  return `#education-entry(\n  ${contentBlock(main)},\n  ${contentBlock(second)},\n)`;
}

/** The `#import` + `#show: rendercv.with(...)` preamble. */
export function preamble(model: RenderCv): string {
  return [
    `#import "rendercv/lib.typ": *`,
    '',
    `#show: rendercv.with(`,
    `  name: ${typstString(model.name)},`,
    `  title: ${typstString(`${model.name}'s CV`)},`,
    `  page-size: "a4",`,
    `  header-connections-show-icons: true,`,
    `)`,
  ].join('\n');
}

/** The `= name` heading plus optional headline and connections fragment. */
export function header(model: RenderCv): string {
  const parts = [`= ${model.name}`];
  if (model.headline !== undefined && model.headline.length > 0) {
    parts.push(`#headline([${renderMarkdown(model.headline)}])`);
  }
  const connections = connectionsFragment(model.socialNetworks ?? []);
  if (connections.length > 0) {
    parts.push(connections);
  }
  return parts.join('\n\n');
}

/** `== Summary` heading + `#summary[...]` block; empty summaries render nothing. */
export function summarySection(paragraphs: string[]): string {
  const body = paragraphs
    .filter((paragraph) => paragraph.length > 0)
    .map((paragraph) => renderMarkdown(paragraph))
    .join('\n\n  ');
  if (body.length === 0) {
    return '';
  }
  return `== Summary\n#summary[\n  ${body}\n]`;
}

/** `== Experience` heading + `#regular-entry` blocks; empty lists render nothing. */
export function experienceSection(entries: ExperienceEntry[]): string {
  if (entries.length === 0) {
    return '';
  }
  return `== Experience\n${entries.map(experienceEntry).join('\n\n')}`;
}

/** `== Education` heading + `#education-entry` blocks; empty lists render nothing. */
export function educationSection(entries: EducationEntry[]): string {
  if (entries.length === 0) {
    return '';
  }
  return `== Education\n${entries.map(educationEntry).join('\n\n')}`;
}

/**
 * `== Skills` heading + `#content-area[...]` with one `- *label*: details`
 * bullet per skill (source order). Empty or all-empty-label lists render
 * nothing. `content-area` is the lib.typ wrapper used by the skills section
 * (design's verified API list); exact parity is checked in PR-4 (4.12).
 */
export function skillsSection(entries: SkillEntry[]): string {
  const bullets = entries
    .filter((entry) => entry.label.trim().length > 0)
    .map((entry) => {
      const details =
        entry.details !== undefined && entry.details.length > 0
          ? `: ${renderMarkdown(entry.details)}`
          : '';
      return `  - *${entry.label}*${details}`;
    });
  if (bullets.length === 0) {
    return '';
  }
  return `== Skills\n#content-area[\n${bullets.join('\n')}\n]`;
}
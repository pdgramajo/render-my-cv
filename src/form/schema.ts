/**
 * Form schema — the declarative map between the typed `RenderCv` model and
 * the wizard UI.
 *
 * Every field of the known model has a declarative entry here: its model key
 * path, human label, control type (`text | textarea | month | month-present |
 * strings | entries`), required flag and placeholder. Step containers and the
 * generic list editors consume these definitions; the `KNOWN_*` key sets feed
 * the unknown-keys warning that guards the raw YAML toggle.
 */

import { parseRenderCvYaml } from '../yaml/parse';

/* ---------- field definition types ---------- */

export type ScalarFieldType = 'text' | 'textarea' | 'month' | 'month-present';

export interface ScalarFieldDef {
  /** Model key on the owning object, e.g. `company` or `startDate`. */
  key: string;
  label: string;
  type: ScalarFieldType;
  required?: boolean;
  placeholder?: string;
}

export interface StringListDef {
  /** Model key holding `string[]`, e.g. `summary` or `boldKeywords`. */
  key: string;
  label: string;
  type: 'strings';
  /** Row control: single-line text or markdown textarea. */
  mode: 'text' | 'textarea';
  rowPlaceholder?: string;
  addLabel: string;
  emptyLabel: string;
}

export interface EntryListDef {
  key: string;
  label: string;
  type: 'entries';
  /** Row heading noun, e.g. "Network" or "Role". */
  noun: string;
  fields: ScalarFieldDef[];
  lists?: StringListDef[];
}

export type StepFieldDef = ScalarFieldDef | StringListDef | EntryListDef;

/* ---------- wizard steps ---------- */

export type StepId = 'header' | 'summary' | 'experience' | 'education' | 'skills' | 'review';

export interface StepSchema {
  id: StepId;
  title: string;
  blurb: string;
}

export const WIZARD_STEPS: StepSchema[] = [
  { id: 'header', title: 'Header', blurb: 'Your name, contact details and social links.' },
  { id: 'summary', title: 'Summary', blurb: 'A short professional summary — one markdown paragraph per row.' },
  { id: 'experience', title: 'Experience', blurb: 'Roles you have held, in any order you like.' },
  { id: 'education', title: 'Education', blurb: 'Degrees, programs and coursework.' },
  { id: 'skills', title: 'Skills', blurb: 'Skill labels with optional details.' },
  { id: 'review', title: 'Review & Raw', blurb: 'Check the serialized YAML, toggle raw editing, and compile.' },
];

/* ---------- per-step field definitions ---------- */

export const HEADER_FIELDS: ScalarFieldDef[] = [
  { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Jane Doe' },
  { key: 'headline', label: 'Headline', type: 'text', placeholder: 'Senior Software Engineer' },
  { key: 'location', label: 'Location', type: 'text', placeholder: 'Remote · Amsterdam' },
  { key: 'email', label: 'Email', type: 'text', placeholder: 'jane@example.com' },
  { key: 'phone', label: 'Phone', type: 'text', placeholder: '+1 555 010 0000' },
];

export const SOCIAL_NETWORK_FIELDS: ScalarFieldDef[] = [
  { key: 'network', label: 'Network', type: 'text', required: true, placeholder: 'github' },
  { key: 'username', label: 'Username', type: 'text', required: true, placeholder: 'jane-doe' },
];

export const SUMMARY_LIST: StringListDef = {
  key: 'summary',
  label: 'Summary paragraphs',
  type: 'strings',
  mode: 'textarea',
  rowPlaceholder: 'One markdown paragraph per row — **bold** and *italics* are supported.',
  addLabel: 'Add paragraph',
  emptyLabel: 'No summary paragraphs yet.',
};

export const EXPERIENCE_FIELDS: ScalarFieldDef[] = [
  { key: 'company', label: 'Company', type: 'text', required: true, placeholder: 'Acme Corp' },
  { key: 'position', label: 'Position', type: 'text', placeholder: 'Senior Engineer' },
  { key: 'location', label: 'Location', type: 'text', placeholder: 'Remote' },
  { key: 'startDate', label: 'Start', type: 'month' },
  { key: 'endDate', label: 'End', type: 'month-present' },
];

export const EXPERIENCE_LISTS: StringListDef[] = [
  {
    key: 'highlights',
    label: 'Highlights',
    type: 'strings',
    mode: 'textarea',
    rowPlaceholder: 'What you did there — markdown allowed.',
    addLabel: 'Add highlight',
    emptyLabel: 'No highlights yet.',
  },
  {
    key: 'boldKeywords',
    label: 'Bold keywords',
    type: 'strings',
    mode: 'text',
    rowPlaceholder: 'Word to emphasize in the highlights (full-word match)',
    addLabel: 'Add keyword',
    emptyLabel: 'No bold keywords.',
  },
];

export const EDUCATION_FIELDS: ScalarFieldDef[] = [
  { key: 'institution', label: 'Institution', type: 'text', required: true, placeholder: 'University of Somewhere' },
  { key: 'area', label: 'Area', type: 'text', placeholder: 'Computer Science' },
  { key: 'location', label: 'Location', type: 'text', placeholder: 'Remote' },
  { key: 'startDate', label: 'Start', type: 'month' },
  { key: 'endDate', label: 'End', type: 'month-present' },
];

export const EDUCATION_LISTS: StringListDef[] = [
  {
    key: 'highlights',
    label: 'Highlights',
    type: 'strings',
    mode: 'textarea',
    rowPlaceholder: 'Coursework, thesis, honors — markdown allowed.',
    addLabel: 'Add highlight',
    emptyLabel: 'No highlights yet.',
  },
];

export const SKILLS_FIELDS: ScalarFieldDef[] = [
  { key: 'label', label: 'Skill', type: 'text', required: true, placeholder: 'React' },
  { key: 'details', label: 'Details', type: 'textarea', placeholder: 'Hooks, server components, state management' },
];

/* ---------- unknown-keys detection (raw toggle guard) ---------- */

export const KNOWN_CV_KEYS = [
  'name',
  'headline',
  'location',
  'email',
  'phone',
  'social_networks',
  'sections',
];

export const KNOWN_SECTION_NAMES = ['summary', 'experience', 'education', 'skills'];
export const KNOWN_SOCIAL_KEYS = ['network', 'username'];
export const KNOWN_EXPERIENCE_KEYS = [
  'company',
  'position',
  'location',
  'start_date',
  'end_date',
  'highlights',
  'bold_keywords',
];
export const KNOWN_EDUCATION_KEYS = ['institution', 'area', 'location', 'start_date', 'end_date', 'highlights'];
export const KNOWN_SKILL_KEYS = ['label', 'details'];

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * Compare a raw YAML document against the known schema and collect the paths
 * of every key the form does not know. Unparseable input reports no keys —
 * the parse error itself will surface at compile time.
 */
export function detectUnknownKeys(rawYaml: string): string[] {
  let document: unknown;
  try {
    document = parseRenderCvYaml(rawYaml);
  } catch {
    return [];
  }

  const warnings: string[] = [];
  const root = asRecord(document);
  if (root === null) {
    return warnings;
  }
  for (const key of Object.keys(root)) {
    if (key !== 'cv') {
      warnings.push(key);
    }
  }

  const cv = asRecord(root.cv);
  if (cv === null) {
    return warnings;
  }
  for (const key of Object.keys(cv)) {
    if (!KNOWN_CV_KEYS.includes(key)) {
      warnings.push(`cv.${key}`);
    }
  }

  const socials = cv.social_networks;
  if (Array.isArray(socials)) {
    socials.forEach((entry, index) => {
      const record = asRecord(entry);
      if (record === null) {
        return;
      }
      for (const key of Object.keys(record)) {
        if (!KNOWN_SOCIAL_KEYS.includes(key)) {
          warnings.push(`cv.social_networks[${index}].${key}`);
        }
      }
    });
  }

  const sections = asRecord(cv.sections);
  if (sections === null) {
    return warnings;
  }
  for (const [name, payload] of Object.entries(sections)) {
    if (!KNOWN_SECTION_NAMES.includes(name)) {
      warnings.push(`cv.sections.${name}`);
      continue;
    }
    if (name === 'summary' || !Array.isArray(payload)) {
      continue;
    }
    const knownKeys =
      name === 'experience'
        ? KNOWN_EXPERIENCE_KEYS
        : name === 'education'
          ? KNOWN_EDUCATION_KEYS
          : KNOWN_SKILL_KEYS;
    payload.forEach((entry, index) => {
      const record = asRecord(entry);
      if (record === null) {
        return;
      }
      for (const key of Object.keys(record)) {
        if (!knownKeys.includes(key)) {
          warnings.push(`cv.sections.${name}[${index}].${key}`);
        }
      }
    });
  }

  return warnings;
}
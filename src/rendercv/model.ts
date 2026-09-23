/**
 * `convertToModel` — parsed YAML document → typed `RenderCv` model.
 *
 * Conversion is deliberately TOLERANT (design D6): unknown sections and
 * unknown top-level fields never fail conversion, and `cv.name` is not
 * enforced here — validation is `validateRenderCv`'s responsibility. Known
 * scalar header fields and known section entries are mapped onto the camelCase
 * model shape only when they have the right raw type; anything else is dropped
 * (validation owns shape errors). Section order is preserved via
 * `Object.entries` (JS string-key insertion order == source YAML order).
 */

import type {
  CvSections,
  EducationEntry,
  ExperienceEntry,
  RenderCv,
  SectionPayload,
  SkillEntry,
  SocialNetwork,
} from '../types/rendercv';

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function stringValue(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' ? value : undefined;
}

function stringList(record: Record<string, unknown>, key: string): string[] | undefined {
  const value = record[key];
  return Array.isArray(value) ? (value as string[]) : undefined;
}

/** `start_date` → `startDate` style key renaming for optional scalar fields. */
function renamedString(
  record: Record<string, unknown>,
  rawKey: string,
  modelKey: string,
): { [key: string]: string } | Record<string, never> {
  const value = stringValue(record, rawKey);
  return value === undefined ? {} : { [modelKey]: value };
}

function convertExperience(raw: unknown): ExperienceEntry[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map((entry): ExperienceEntry => {
    const record = asRecord(entry);
    if (record === null) {
      return { company: '' };
    }
    const company = stringValue(record, 'company');
    return {
      company: company === undefined ? '' : company,
      ...renamedString(record, 'position', 'position'),
      ...renamedString(record, 'location', 'location'),
      ...renamedString(record, 'start_date', 'startDate'),
      ...renamedString(record, 'end_date', 'endDate'),
      ...(stringList(record, 'highlights') !== undefined
        ? { highlights: stringList(record, 'highlights') }
        : {}),
      ...(stringList(record, 'bold_keywords') !== undefined
        ? { boldKeywords: stringList(record, 'bold_keywords') }
        : {}),
    };
  });
}

function convertEducation(raw: unknown): EducationEntry[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map((entry): EducationEntry => {
    const record = asRecord(entry);
    if (record === null) {
      return { institution: '' };
    }
    const institution = stringValue(record, 'institution');
    return {
      institution: institution === undefined ? '' : institution,
      ...renamedString(record, 'area', 'area'),
      ...renamedString(record, 'location', 'location'),
      ...renamedString(record, 'start_date', 'startDate'),
      ...renamedString(record, 'end_date', 'endDate'),
      ...(stringList(record, 'highlights') !== undefined
        ? { highlights: stringList(record, 'highlights') }
        : {}),
    };
  });
}

function convertSkills(raw: unknown): SkillEntry[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map((entry): SkillEntry => {
    const record = asRecord(entry);
    if (record === null) {
      return { label: '' };
    }
    const label = stringValue(record, 'label');
    return {
      label: label === undefined ? '' : label,
      ...renamedString(record, 'details', 'details'),
    };
  });
}

function convertSection(name: string, payload: unknown): SectionPayload {
  switch (name) {
    case 'summary':
      // Markdown paragraphs; a non-array summary is dropped by conversion
      // (validation raises the structured error on the raw document).
      return Array.isArray(payload) ? (payload as string[]) : [];
    case 'experience':
      return convertExperience(payload);
    case 'education':
      return convertEducation(payload);
    case 'skills':
      return convertSkills(payload);
    default:
      // Unknown sections survive conversion untouched (never fatal).
      return payload as SectionPayload;
  }
}

/**
 * Convert a parsed YAML document onto the `RenderCv` model.
 *
 * Never throws for data-shape reasons: unknown fields and sections are
 * tolerated, and wrong-typed known fields are dropped at this stage.
 */
export function convertToModel(parsed: unknown): RenderCv {
  const document = asRecord(parsed);
  const cv = asRecord(document === null ? null : document.cv);

  const name = typeof cv?.name === 'string' ? cv.name : '';

  const sections: Record<string, SectionPayload> = {};
  const rawSections = asRecord(cv === null ? null : cv.sections);
  if (rawSections !== null) {
    for (const [sectionName, payload] of Object.entries(rawSections)) {
      sections[sectionName] = convertSection(sectionName, payload);
    }
  }

  let socialNetworks: SocialNetwork[] | undefined;
  if (cv !== null && Array.isArray(cv.social_networks)) {
    socialNetworks = cv.social_networks as SocialNetwork[];
  }

  return {
    name,
    ...(cv !== null ? renamedString(cv, 'headline', 'headline') : {}),
    ...(cv !== null ? renamedString(cv, 'location', 'location') : {}),
    ...(cv !== null ? renamedString(cv, 'email', 'email') : {}),
    ...(cv !== null ? renamedString(cv, 'phone', 'phone') : {}),
    ...(socialNetworks !== undefined ? { socialNetworks } : {}),
    sections: sections as CvSections,
  };
}
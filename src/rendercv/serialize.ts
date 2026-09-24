/**
 * `renderCvToYaml` — typed `RenderCv` model → YAML text (the inverse of
 * `convertToModel`).
 *
 * Internal camelCase model keys map back to the RenderCV snake_case YAML
 * schema: `socialNetworks` → `social_networks`, `startDate` → `start_date`,
 * `endDate` → `end_date`, `boldKeywords` → `bold_keywords`. Optional fields
 * that are `undefined` are omitted entirely (an absent key roundtrips as
 * absent). Section order is preserved via `Object.entries` (JS string-key
 * insertion order == the source YAML order).
 *
 * Unknown sections are passed through untouched: the form never shows them,
 * and the raw YAML toggle is the escape hatch that keeps them for compile.
 */

import { dump } from 'js-yaml';
import type {
  CvSections,
  EducationEntry,
  ExperienceEntry,
  RenderCv,
  SkillEntry,
  SocialNetwork,
} from '../types/rendercv';

function socialToYaml(entry: SocialNetwork): Record<string, unknown> {
  return { network: entry.network, username: entry.username };
}

function experienceToYaml(entry: ExperienceEntry): Record<string, unknown> {
  return {
    company: entry.company,
    ...(entry.position !== undefined ? { position: entry.position } : {}),
    ...(entry.location !== undefined ? { location: entry.location } : {}),
    ...(entry.startDate !== undefined ? { start_date: entry.startDate } : {}),
    ...(entry.endDate !== undefined ? { end_date: entry.endDate } : {}),
    ...(entry.highlights !== undefined ? { highlights: entry.highlights } : {}),
    ...(entry.boldKeywords !== undefined ? { bold_keywords: entry.boldKeywords } : {}),
  };
}

function educationToYaml(entry: EducationEntry): Record<string, unknown> {
  return {
    institution: entry.institution,
    ...(entry.area !== undefined ? { area: entry.area } : {}),
    ...(entry.location !== undefined ? { location: entry.location } : {}),
    ...(entry.startDate !== undefined ? { start_date: entry.startDate } : {}),
    ...(entry.endDate !== undefined ? { end_date: entry.endDate } : {}),
    ...(entry.highlights !== undefined ? { highlights: entry.highlights } : {}),
  };
}

function skillToYaml(entry: SkillEntry): Record<string, unknown> {
  return {
    label: entry.label,
    ...(entry.details !== undefined ? { details: entry.details } : {}),
  };
}

function convertSectionPayload(name: string, payload: unknown): unknown {
  switch (name) {
    case 'summary':
      return payload as string[];
    case 'experience':
      return (payload as ExperienceEntry[]).map(experienceToYaml);
    case 'education':
      return (payload as EducationEntry[]).map(educationToYaml);
    case 'skills':
      return (payload as SkillEntry[]).map(skillToYaml);
    default:
      // Unknown sections pass through untouched (raw-toggle territory).
      return payload;
  }
}

function sectionsToYaml(sections: CvSections): Record<string, unknown> {
  const yaml: Record<string, unknown> = {};
  for (const [name, payload] of Object.entries(sections)) {
    yaml[name] = convertSectionPayload(name, payload);
  }
  return yaml;
}

/**
 * Serialize a `RenderCv` model back to RenderCV-compatible YAML text.
 *
 * Never throws for data-shape reasons: the model is the typed contract, and
 * js-yaml `dump` quotes only what YAML would otherwise re-type on re-parse.
 */
export function renderCvToYaml(model: RenderCv): string {
  const document = {
    cv: {
      name: model.name,
      ...(model.headline !== undefined ? { headline: model.headline } : {}),
      ...(model.location !== undefined ? { location: model.location } : {}),
      ...(model.email !== undefined ? { email: model.email } : {}),
      ...(model.phone !== undefined ? { phone: model.phone } : {}),
      ...(model.socialNetworks !== undefined
        ? { social_networks: model.socialNetworks.map(socialToYaml) }
        : {}),
      sections: sectionsToYaml(model.sections),
    },
  };
  // lineWidth -1: never fold long markdown summaries; keep the raw YAML
  // readable and byte-stable for the Review step.
  return dump(document, { lineWidth: -1 });
}
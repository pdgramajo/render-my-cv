/**
 * RenderCV domain model — MVP subset.
 *
 * Mirrors the RenderCV 2.8 YAML schema for the MVP fields:
 * `cv.name`, `cv.headline`, `cv.location`, `cv.email`, `cv.phone`,
 * `cv.social_networks` and the sections `summary`, `experience`,
 * `education`, `skills`.
 *
 * Dates are stored as `YYYY-MM` strings; `endDate` additionally accepts the
 * literal `"present"`. Unknown sections and fields never fail any stage;
 * they are dropped or skipped by the MVP renderer.
 */

export interface RenderCv {
  name: string;
  headline?: string;
  location?: string;
  email?: string;
  phone?: string;
  socialNetworks?: SocialNetwork[];
  /** Ordered via `Object.entries` — iteration order is the source YAML order. */
  sections: CvSections;
}

export interface SocialNetwork {
  network: string;
  username: string;
}

export type SectionName = 'summary' | 'experience' | 'education' | 'skills';

export type SectionPayload =
  | string[] // summary: markdown paragraphs
  | ExperienceEntry[]
  | EducationEntry[]
  | SkillEntry[];

/** Ordered section map; unknown sections are skipped by the MVP renderer. */
export interface CvSections extends Partial<Record<SectionName, SectionPayload>> {}

export interface ExperienceEntry {
  company: string;
  position?: string;
  location?: string;
  /** `YYYY-MM`; `endDate` may also be the literal `"present"`. */
  startDate?: string;
  endDate?: string;
  /** Markdown; an empty array renders no bullet block. */
  highlights?: string[];
  /** Full-word match, applied to highlights by the renderer. */
  boldKeywords?: string[];
}

export interface EducationEntry {
  institution: string;
  area?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  highlights?: string[];
}

export interface SkillEntry {
  label: string;
  details?: string;
}
/**
 * `renderCvToTypst` — validates nothing, renders everything.
 *
 * Orchestrates the fragments into the Typst entry document: preamble (import +
 * `#show: rendercv.with(...)` with MVP params only), header (name, headline,
 * connections), then the known sections in model order. Unknown sections are
 * skipped; empty sections render nothing. Internal failures surface the
 * canonical "Unable to generate PDF" render message.
 */

import { PipelineError } from '../types/pipeline';
import type {
  EducationEntry,
  ExperienceEntry,
  RenderCv,
  SectionPayload,
  SkillEntry,
} from '../types/rendercv';
import { renderError } from './errors';
import {
  educationSection,
  experienceSection,
  header,
  preamble,
  skillsSection,
  summarySection,
} from './fragments';

function renderSection(name: string, payload: SectionPayload): string {
  switch (name) {
    case 'summary':
      return summarySection(payload as string[]);
    case 'experience':
      return experienceSection(payload as ExperienceEntry[]);
    case 'education':
      return educationSection(payload as EducationEntry[]);
    case 'skills':
      return skillsSection(payload as SkillEntry[]);
    default:
      // Unknown sections are skipped by the MVP renderer (never fatal).
      return '';
  }
}

/**
 * Render a validated model to Typst source.
 *
 * @throws PipelineError "Unable to generate PDF" (stage `render`) on any
 *         unexpected internal failure.
 */
export function renderCvToTypst(model: RenderCv): string {
  try {
    const parts: string[] = [preamble(model), header(model)];
    const sections = model.sections as Record<string, SectionPayload>;
    for (const [name, payload] of Object.entries(sections)) {
      const section = renderSection(name, payload);
      if (section.length > 0) {
        parts.push(section);
      }
    }
    return `${parts.join('\n\n')}\n`;
  } catch (error) {
    if (error instanceof PipelineError) {
      throw error;
    }
    const detail = error instanceof Error ? error.message : String(error);
    throw renderError(`Failed to render CV: ${detail}`);
  }
}
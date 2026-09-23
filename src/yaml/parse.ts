/**
 * YAML parsing stage for the RenderCV pipeline.
 *
 * `parseRenderCvYaml` parses raw YAML text with js-yaml (client-side, no
 * network); `validateRenderCv` maps the parsed document onto the typed
 * `RenderCv` model for the MVP subset and enforces the `cv.name` requirement.
 *
 * Note: full model validation (field types, shapes, date formats) lands with
 * the PR-3 validation stage; this module only converts and checks `cv.name`.
 */

import { load } from 'js-yaml';
import { PipelineError } from '../types/pipeline';
import type { RenderCv, SectionPayload, SocialNetwork } from '../types/rendercv';

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * Parse RenderCV-compatible YAML text into a plain JS document.
 *
 * @throws PipelineError "Invalid YAML structure" when the text is not
 *         well-formed YAML (details carry the js-yaml parse message).
 * @throws PipelineError "Unable to read YAML file" for empty/whitespace input.
 */
export function parseRenderCvYaml(raw: string): unknown {
  if (raw.trim().length === 0) {
    throw new PipelineError(
      'read',
      'Unable to read YAML file',
      'File is empty or could not be read as UTF-8 text.',
    );
  }
  try {
    return load(raw);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new PipelineError('parse', 'Invalid YAML structure', detail);
  }
}

/**
 * Validate a parsed document and map it onto the typed `RenderCv` model.
 *
 * @throws PipelineError "Missing required field: cv.name" when `cv.name` is
 *         absent or not a non-empty string.
 */
export function validateRenderCv(parsed: unknown): RenderCv {
  const document = asRecord(parsed);
  const cv = document ? asRecord(document.cv) : null;

  if (cv === null || typeof cv.name !== 'string' || cv.name.trim().length === 0) {
    throw new PipelineError(
      'validate',
      'Missing required field: cv.name',
      'Field "cv.name" is required and must be a non-empty string.',
    );
  }

  const sections: Record<string, SectionPayload> = {};
  const rawSections = asRecord(cv.sections);
  if (rawSections !== null) {
    for (const [name, payload] of Object.entries(rawSections)) {
      sections[name] = payload as SectionPayload;
    }
  }

  const socialNetworks = Array.isArray(cv.social_networks)
    ? (cv.social_networks as SocialNetwork[])
    : undefined;

  return {
    name: cv.name,
    ...(typeof cv.headline === 'string' ? { headline: cv.headline } : {}),
    ...(typeof cv.location === 'string' ? { location: cv.location } : {}),
    ...(typeof cv.email === 'string' ? { email: cv.email } : {}),
    ...(typeof cv.phone === 'string' ? { phone: cv.phone } : {}),
    ...(socialNetworks !== undefined ? { socialNetworks } : {}),
    sections,
  };
}
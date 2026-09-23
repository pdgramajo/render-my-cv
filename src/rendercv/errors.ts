/**
 * PipelineError factory helpers (design decision D5).
 *
 * Every pipeline stage maps its failures to exactly one canonical message:
 *
 * | Factory        | Stage     | Canonical message            |
 * |----------------|-----------|------------------------------|
 * | `readError`    | read      | "Unable to read YAML file"   |
 * | `parseError`   | parse     | "Invalid YAML structure"     |
 * | `missingNameError` | validate | "Missing required field: cv.name" |
 * | `validationError`  | validate | "Unable to generate PDF"    |
 * | `renderError`  | render    | "Unable to generate PDF"     |
 * | `compileError` | compile   | "Typst compilation failed"   |
 *
 * `details` is optional technical context, human-readable and never a raw
 * stack trace (spec: error presentation contract).
 */

import { PipelineError } from '../types/pipeline';

/** Unreadable / empty / non-text input. */
export function readError(details?: string): PipelineError {
  return new PipelineError('read', 'Unable to read YAML file', details);
}

/** Malformed YAML. */
export function parseError(details?: string): PipelineError {
  return new PipelineError('parse', 'Invalid YAML structure', details);
}

/** `cv.name` missing, empty or not a string. */
export function missingNameError(details?: string): PipelineError {
  return new PipelineError('validate', 'Missing required field: cv.name', details);
}

/** Any validation violation other than a missing `cv.name`. */
export function validationError(details?: string): PipelineError {
  return new PipelineError('validate', 'Unable to generate PDF', details);
}

/** Renderer failure (pre-compile). */
export function renderError(details?: string): PipelineError {
  return new PipelineError('render', 'Unable to generate PDF', details);
}

/** Typst compilation failure. */
export function compileError(details?: string): PipelineError {
  return new PipelineError('compile', 'Typst compilation failed', details);
}
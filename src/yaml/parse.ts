/**
 * YAML parsing stage for the RenderCV pipeline.
 *
 * `parseRenderCvYaml` parses raw YAML text with js-yaml (client-side, no
 * network). Validation + model mapping live in the rendercv stage
 * (`src/rendercv/validateRenderCv.ts`); this module re-exports it so the
 * pipeline entry point stays `parse` → `validate` on the same import surface.
 */

import { load } from 'js-yaml';
import { parseError, readError } from '../rendercv/errors';

export { validateRenderCv } from '../rendercv/validateRenderCv';

/**
 * Parse RenderCV-compatible YAML text into a plain JS document.
 *
 * @throws PipelineError "Invalid YAML structure" when the text is not
 *         well-formed YAML (details carry the js-yaml parse message).
 * @throws PipelineError "Unable to read YAML file" for empty/whitespace input.
 */
export function parseRenderCvYaml(raw: string): unknown {
  if (raw.trim().length === 0) {
    throw readError('File is empty or could not be read as UTF-8 text.');
  }
  try {
    return load(raw);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw parseError(detail);
  }
}
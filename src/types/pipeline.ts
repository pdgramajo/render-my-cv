/**
 * Pipeline error contract.
 *
 * Every user-facing failure is one of the five canonical messages below,
 * carried by a typed `PipelineError` with the pipeline stage that failed and
 * optional technical `details` (human-readable; never a raw stack trace).
 */

export type PipelineStage = 'read' | 'parse' | 'validate' | 'render' | 'compile';

export type CanonicalMessage =
  | 'Unable to read YAML file'
  | 'Invalid YAML structure'
  | 'Missing required field: cv.name'
  | 'Unable to generate PDF'
  | 'Typst compilation failed';

export class PipelineError extends Error {
  readonly stage: PipelineStage;
  readonly details?: string;

  constructor(stage: PipelineStage, message: CanonicalMessage, details?: string) {
    super(message);
    this.name = 'PipelineError';
    this.stage = stage;
    this.details = details;
  }
}
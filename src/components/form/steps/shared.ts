import type { RenderCv } from '../../../types/rendercv'

export type StepProps = {
  model: RenderCv
  onChange: (next: RenderCv) => void
}

/** "" → undefined so optional strings serialize as absent keys. */
export function toOptional(value: string): string | undefined {
  return value === '' ? undefined : value
}
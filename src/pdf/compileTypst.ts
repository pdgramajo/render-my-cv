import { WorkerClient } from '../typst/client'
import { renderCvToTypst } from '../rendercv/renderCvToTypst'
import type { RenderCv } from '../types/rendercv'
import { PipelineError } from '../types/pipeline'

/**
 * PDF facade (PR-5): render the model to Typst and compile to PDF bytes
 * through the browser compile worker. Throws the canonical "Unable to
 * generate PDF" message when rendering fails; compile failures keep their
 * canonical "Typst compilation failed" message.
 *
 * The worker loads the vendored sources/fonts from the static origin and the
 * wasm from the bundled asset URL — no network beyond same-origin static.
 */
export async function compileTypst(model: RenderCv): Promise<Uint8Array> {
  let typst: string;
  try {
    typst = renderCvToTypst(model)
  } catch (err: any) {
    throw new PipelineError('render', 'Unable to generate PDF', err?.message)
  }
  const client = new WorkerClient()
  try {
    return await client.compile({ entry: typst })
  } catch (err: any) {
    if (err instanceof PipelineError) {
      throw err
    }
    throw new PipelineError('compile', 'Typst compilation failed', err?.message)
  }
}

export async function compileTypstToBlob(model: RenderCv): Promise<Blob> {
  const bytes = await compileTypst(model)
  return new Blob([new Uint8Array(bytes)], { type: 'application/pdf' })
}
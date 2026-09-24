import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { parseRenderCvYaml, validateRenderCv } from '../yaml/parse'
import { renderCvToTypst } from '../rendercv/renderCvToTypst'
import { loadNodeWasmBytes, loadVendoredFonts, loadVendoredSources } from '../typst/assets.node'
import { MainThreadBackend } from '../typst/backends/mainThread'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

describe('integration: fixture -> PDF (case 8)', () => {
  it('generates PDF starting with %PDF-', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
      throw new Error('network disallowed')
    })
    try {
      const fixturePath = resolve(__dirname, '../__fixtures__/johndoe-fake.yaml')
      const yaml = readFileSync(fixturePath, 'utf-8')
      const model = validateRenderCv(parseRenderCvYaml(yaml))
      const typst = renderCvToTypst(model)
      const backend = new MainThreadBackend({
        assets: { loadSources: loadVendoredSources, loadFonts: loadVendoredFonts },
        getModule: loadNodeWasmBytes,
      })
      const pdf = await backend.compile({ entry: typst })
      const header = new TextDecoder().decode(pdf.subarray(0, 5))
      expect(header).toBe('%PDF-')
    } finally {
      fetchSpy.mockRestore()
    }
  })
})
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

describe('integration: Spanish section names -> PDF', () => {
  it('maps Spanish section keys to canonical types and preserves original titles', () => {
    const yaml = readFileSync(resolve(__dirname, '../__fixtures__/spanish.yaml'), 'utf-8')
    const model = validateRenderCv(parseRenderCvYaml(yaml))

    expect(Object.keys(model.sections)).toEqual([
      'resumen',
      'experiencia',
      'educación',
      'habilidades',
    ])
    expect(model.sections['resumen'].type).toBe('summary')
    expect(model.sections['experiencia'].type).toBe('experience')
    expect(model.sections['educación'].type).toBe('education')
    expect(model.sections['habilidades'].type).toBe('skills')

    const typst = renderCvToTypst(model)
    // Original Spanish names are kept as rendered titles.
    expect(typst).toContain('== resumen')
    expect(typst).toContain('== experiencia')
    expect(typst).toContain('== educación')
    expect(typst).toContain('== habilidades')
    // The Spanish content itself is rendered, not dropped.
    expect(typst).toContain('María González')
    expect(typst).toContain('Laboratorios Ficticios')
    expect(typst).toContain('Universidad Estatal Ficticia')
  })

  it('compiles the Spanish fixture to a PDF starting with %PDF-', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
      throw new Error('network disallowed')
    })
    try {
      const yaml = readFileSync(resolve(__dirname, '../__fixtures__/spanish.yaml'), 'utf-8')
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

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, screen, waitFor, cleanup, within } from '@testing-library/react'
import App from './App'
import { DRAFT_KEY } from './hooks/useDraft'
import type { RenderCv } from './types/rendercv'

// Only the PDF stage is stubbed — parse/validate run for real, so this suite
// exercises the full form → serialize → parse → validate → compile pipeline.
vi.mock('./pdf/compileTypst', () => ({
  compileTypst: vi.fn(async () => new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])),
}))

import { compileTypst } from './pdf/compileTypst'

/** Raw fixture text inlined by Vite; no filesystem access, no node types. */
import fixtureRaw from './__fixtures__/example.yaml?raw'

const compactBaseModel: RenderCv = {
  name: 'John Doe',
  sections: {
    summary: ['One paragraph.'],
    experience: [{ company: 'Acme', position: 'Dev' }],
    education: [{ institution: 'Uni' }],
    skills: [{ label: 'React' }],
  },
}

function pickFile(file: File) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  fireEvent.change(input, { target: { files: [file] } })
}

function goToReview() {
  const nav = screen.getByRole('navigation', { name: /steps/i })
  fireEvent.click(within(nav).getByRole('button', { name: /step 6/i }))
}

describe('App: form wizard (integration)', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:mock'),
      revokeObjectURL: vi.fn(),
    })
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('imports the fixture into the form, edits it, and compiles from the model', async () => {
    render(<App />)
    pickFile(new File([fixtureRaw], 'example.yaml', { type: 'text/yaml' }))

    const name = (await screen.findByRole("textbox", { name: /^name$/i })) as HTMLInputElement
    expect(name.value).toBe('John Doe')

    fireEvent.change(name, { target: { value: 'Jane Smith' } })

    goToReview()

    const pre = await screen.findByTestId('serialized-yaml')
    expect(pre).toHaveTextContent('Jane Smith')
    expect(pre).toHaveTextContent('social_networks:')
    expect(pre).toHaveTextContent('start_date:')

    fireEvent.click(screen.getByTestId('compile-form'))

    await waitFor(() => {
      expect(screen.getByTestId('pdf-preview')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /download pdf/i })).toBeInTheDocument()
  })

  it('raw toggle compiles the raw text as-is with unknown keys intact', async () => {
    const raw = [
      'design:',
      '  theme: classic',
      'cv:',
      '  name: Raw Ada',
      '  sections:',
      '    summary:',
      '      - Hello from raw mode.',
    ].join('\n')

    render(<App />)
    pickFile(new File([raw], 'raw.yaml', { type: 'text/yaml' }))

    await screen.findByRole("textbox", { name: /^name$/i })
    goToReview()

    // Unknown top-level `design` is called out, then preserved via raw mode.
    const warning = await screen.findByText(/outside the form schema/i)
    expect(warning).toHaveTextContent('design')

    fireEvent.click(screen.getByRole('button', { name: /raw yaml/i }))
    const textarea = screen.getByLabelText('Raw YAML editor') as HTMLTextAreaElement
    expect(textarea.value).toContain('theme: classic')

    fireEvent.change(textarea, {
      target: { value: textarea.value.replace('Raw Ada', 'Raw Ada Two') },
    })
    fireEvent.click(screen.getByTestId('compile-raw'))

    await waitFor(() => {
      expect(screen.getByTestId('pdf-preview')).toBeInTheDocument()
    })
    const lastCall = vi.mocked(compileTypst).mock.calls.at(-1)![0]
    expect(lastCall).toMatchObject({ name: 'Raw Ada Two' })
  })

  it('warns about unknown keys inside a known section', async () => {
    const withUnknown = [
      'cv:',
      '  name: Ada',
      '  sections:',
      '    experience:',
      '      - company: X',
      '        custom_field: 1',
    ].join('\n')

    render(<App />)
    pickFile(new File([withUnknown], 'custom.yaml', { type: 'text/yaml' }))

    await screen.findByRole("textbox", { name: /^name$/i })
    goToReview()

    const warning = await screen.findByText(/outside the form schema/i)
    expect(warning).toHaveTextContent('cv.sections.experience[0].custom_field')
  })

  it('autosaves the draft after editing and restores it on reload', async () => {
    render(<App />)
    pickFile(new File([fixtureRaw], 'example.yaml', { type: 'text/yaml' }))

    const name = (await screen.findByRole("textbox", { name: /^name$/i })) as HTMLInputElement
    fireEvent.change(name, { target: { value: 'Autosaved Ada' } })

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? '{}') as {
        model: RenderCv
        raw: string
      }
      expect(stored.model.name).toBe('Autosaved Ada')
    })

    // "Reload": a fresh mount restores the draft straight into the wizard.
    cleanup()
    render(<App />)
    const restored = (await screen.findByRole("textbox", { name: /^name$/i })) as HTMLInputElement
    expect(restored.value).toBe('Autosaved Ada')
    expect(screen.getByRole('navigation', { name: /steps/i })).toBeInTheDocument()
  })

  it('restores a previously saved draft without a file import', () => {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ model: compactBaseModel, raw: '' }),
    )
    render(<App />)
    expect(screen.getByRole('navigation', { name: /steps/i })).toBeInTheDocument()
    expect((screen.getByRole("textbox", { name: /^name$/i }) as HTMLInputElement).value).toBe('John Doe')
  })

  it('start over clears the form, the draft and the preview', async () => {
    render(<App />)
    pickFile(new File([fixtureRaw], 'example.yaml', { type: 'text/yaml' }))

    await screen.findByRole("textbox", { name: /^name$/i })
    fireEvent.click(screen.getByRole('button', { name: /start over/i }))

    expect(screen.getByText('Drop your CV YAML here')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByTestId('preview-empty')).toBeInTheDocument()
    })
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull()
  })
})
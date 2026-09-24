import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import App from './App'

vi.mock('./yaml/parse', () => ({
  parseRenderCvYaml: vi.fn(() => ({})),
  validateRenderCv: vi.fn(() => ({ name: 'Test' })),
}))

vi.mock('./pdf/compileTypst', () => ({
  compileTypst: vi.fn(async () => new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])),
}))

function pickFile(file: File) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  fireEvent.change(input, { target: { files: [file] } })
}

describe('App', () => {
  beforeEach(() => {
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

  it('renders title and file input', () => {
    render(<App />)
    expect(screen.getByText('RenderCV Web')).toBeInTheDocument()
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(input).toBeInTheDocument()
  })

  it('Reset button is disabled until a file is processed', () => {
    render(<App />)
    const reset = screen.getByRole('button', { name: /start over/i })
    expect(reset).toBeDisabled()
  })

  it('Reset clears the generated PDF and re-enables the drop zone', async () => {
    render(<App />)
    pickFile(new File(['name: Test\n'], 'test.yaml', { type: 'text/yaml' }))

    const reset = await waitFor(() => {
      const button = screen.getByRole('button', { name: /start over/i })
      expect(button).not.toBeDisabled()
      return button
    })
    expect(screen.getByTestId('pdf-preview')).toBeInTheDocument()

    fireEvent.click(reset)

    await waitFor(() => {
      expect(screen.getByTestId('preview-empty')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /start over/i })).toBeDisabled()
    expect(screen.getByText('Drop your CV YAML here')).toBeInTheDocument()
  })

  it('Download uses the YAML filename with a .pdf extension', async () => {
    render(<App />)
    pickFile(new File(['name: Test\n'], 'archivo.yaml', { type: 'text/yaml' }))

    const download = await waitFor(() => {
      const button = screen.getByRole('button', { name: /download/i })
      expect(button).not.toBeDisabled()
      return button
    })

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click')
    fireEvent.click(download)

    // The handler creates an <a download="..."> and clicks it; the spy runs
    // synchronously, so the element is appended → clicked → removed.
    const anchors = clickSpy.mock.instances as HTMLAnchorElement[]
    const clicked = anchors[0]
    expect(clicked.download).toBe('archivo.pdf')
    clickSpy.mockRestore()
  })
})
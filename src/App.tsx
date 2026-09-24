import { useState } from 'react'
import { FileInput, Preview, Actions } from './components'
import { parseRenderCvYaml, validateRenderCv } from './yaml/parse'
import { compileTypst } from './pdf/compileTypst'
import type { RenderCv } from './types/rendercv'

export default function App() {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const revoke = () => {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl)
      setPdfUrl(null)
    }
  }

  const handleFile = async (file: File) => {
    setError(null)
    revoke()
    setLoading(true)
    try {
      const text = await file.text()
      const doc = parseRenderCvYaml(text)
      const model: RenderCv = validateRenderCv(doc)
      const bytes = await compileTypst(model)
      const url = URL.createObjectURL(
        new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }),
      )
      setPdfUrl(url)
    } catch (e: any) {
      setError(e?.message || 'Unable to generate PDF')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (!pdfUrl) return
    const a = document.createElement('a')
    a.href = pdfUrl
    a.download = 'rendercv.pdf'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handleShare = async () => {
    if (!pdfUrl) return
    try {
      const bytes = await fetch(pdfUrl).then(r => r.arrayBuffer())
      const file = new File([bytes], 'rendercv.pdf', { type: 'application/pdf' })
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'RenderCV PDF' })
      }
    } catch {
      // ignore
    }
  }

  return (
    <div className="app">
      <header className="app__header">
        <div className="masthead reveal reveal--1">
          <p className="masthead__kicker">
            <span className="masthead__glyph" aria-hidden="true">
              ¶
            </span>
            YAML · Typst · PDF — set in your browser
          </p>
          <h1 className="masthead__title">RenderCV Web</h1>
          <p className="masthead__lede">
            A typesetting desk for RenderCV résumés. Drop a YAML file, and validation,
            layout and PDF compilation happen right here — your CV never leaves this page.
          </p>
        </div>
      </header>

      <main className="workbench">
        <aside className="workbench__controls">
          <div className="reveal reveal--2">
            <FileInput onFile={handleFile} disabled={loading} />
          </div>

          {loading && (
            <div className="status status--loading" role="status">
              <span className="status__spinner" aria-hidden="true" />
              <span>Generating PDF...</span>
            </div>
          )}

          {error && (
            <div className="status status--error" role="alert">
              <span className="status__glyph" aria-hidden="true">
                !
              </span>
              <p className="status__error-text">{error}</p>
            </div>
          )}
        </aside>

        <section className="workbench__output">
          <div className="output-stack reveal reveal--3">
            <Preview pdfUrl={pdfUrl} />
            <Actions
              pdfUrl={pdfUrl}
              onDownload={handleDownload}
              onShare={handleShare}
              disabled={loading}
            />
          </div>
        </section>
      </main>

      <footer className="app__footer reveal reveal--4">
        <p className="app__footer-note">RenderCV Web — local typesetting desk</p>
        <p className="app__footer-meta">100% in-browser · YAML → Typst → PDF</p>
      </footer>
    </div>
  )
}
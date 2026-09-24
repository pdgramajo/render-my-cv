import { useEffect, useMemo, useRef, useState } from 'react'
import { Actions, FileInput, Preview } from './components'
import { Wizard } from './components/form'
import { detectUnknownKeys } from './form/schema'
import { useDraft } from './hooks/useDraft'
import { compileTypst } from './pdf/compileTypst'
import { renderCvToYaml } from './rendercv/serialize'
import type { RenderCv } from './types/rendercv'
import { parseRenderCvYaml, validateRenderCv } from './yaml/parse'

export default function App() {
  const [model, setModel] = useState<RenderCv | null>(null)
  const [rawDraft, setRawDraft] = useState('')
  const [step, setStep] = useState(0)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [pdfName, setPdfName] = useState<string | null>(null)

  const draft = useDraft()
  // Restore-on-mount writes model+raw in one effect run; remember it so the
  // first autosave doesn't immediately rewrite what was just restored.
  const restoredRef = useRef(false)

  useEffect(() => {
    const saved = draft.restore()
    if (saved !== null) {
      restoredRef.current = true
      setModel(saved.model)
      setRawDraft(saved.raw)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (model === null) {
      return
    }
    if (restoredRef.current) {
      restoredRef.current = false
      return
    }
    draft.persist({ model, raw: rawDraft })
  }, [model, rawDraft, draft.persist])

  const unknownKeys = useMemo(
    () => (rawDraft.trim().length > 0 ? detectUnknownKeys(rawDraft) : []),
    [rawDraft],
  )

  const revoke = () => {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl)
      setPdfUrl(null)
    }
  }

  const handleStartOver = () => {
    revoke()
    setError(null)
    setLoading(false)
    setPdfName(null)
    setModel(null)
    setRawDraft('')
    setStep(0)
    draft.clear()
    // Remounts FileInputs so the selected-file chip clears too.
    setResetKey((key) => key + 1)
  }

  const compile = async (yaml: string) => {
    setError(null)
    revoke()
    setLoading(true)
    try {
      const doc = parseRenderCvYaml(yaml)
      const validated: RenderCv = validateRenderCv(doc)
      const bytes = await compileTypst(validated)
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

  const handleCompileFromModel = () => {
    if (model !== null) {
      compile(renderCvToYaml(model))
    }
  }

  const handleCompileFromRaw = () => compile(rawDraft)

  const handleImportFile = async (file: File) => {
    setError(null)
    revoke()
    setLoading(true)
    // Strip the extension from the source YAML so the PDF download keeps the
    // same base name: `archivo.yaml` → `archivo.pdf`.
    const baseName = file.name.replace(/\.[^.]+$/, '')
    setPdfName(baseName)
    try {
      const text = await file.text()
      const doc = parseRenderCvYaml(text)
      const imported: RenderCv = validateRenderCv(doc)
      setModel(imported)
      setRawDraft(text)
      setStep(0)
      // Same pipeline as before the wizard: import compiles immediately too.
      const bytes = await compileTypst(imported)
      const url = URL.createObjectURL(
        new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }),
      )
      setPdfUrl(url)
    } catch (e: any) {
      setError(e?.message || 'Unable to read file')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (!pdfUrl) return
    const a = document.createElement('a')
    a.href = pdfUrl
    a.download = pdfName ? `${pdfName}.pdf` : 'rendercv.pdf'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handleShare = async () => {
    if (!pdfUrl) return
    try {
      const bytes = await fetch(pdfUrl).then((r) => r.arrayBuffer())
      const file = new File(
        [bytes],
        pdfName ? `${pdfName}.pdf` : 'rendercv.pdf',
        { type: 'application/pdf' },
      )
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
            A typesetting desk for RenderCV résumés. Compose your CV in the form wizard,
            import an existing YAML to prefill it, and validation, layout and PDF compilation
            happen right here — your CV never leaves this page.
          </p>
        </div>
      </header>

      <main className="workbench">
        <section className="workbench__editor">
          {model !== null ? (
            <Wizard
              model={model}
              step={step}
              onStepChange={setStep}
              onModelChange={setModel}
              onImportFile={handleImportFile}
              onStartOver={handleStartOver}
              rawDraft={rawDraft}
              onRawDraftChange={setRawDraft}
              unknownKeys={unknownKeys}
              onCompileFromModel={handleCompileFromModel}
              onCompileFromRaw={handleCompileFromRaw}
              saveState={draft.saveState}
              savedAt={draft.savedAt}
              compiling={loading}
              toolbarKey={resetKey}
            />
          ) : (
            <div className="empty-state reveal reveal--2">
              <p className="empty-state__kicker">
                <span className="masthead__glyph" aria-hidden="true">
                  ¶
                </span>
                Compose in the wizard, or import a YAML to prefill it
              </p>
              <FileInput key={resetKey} onFile={handleImportFile} disabled={loading} />
              <p className="empty-state__note">
                Start typing (your draft autosaves to this device) or drop an existing
                RenderCV YAML to prefill the form.
              </p>
              <button
                type="button"
                className="btn btn--ghost btn--reset"
                onClick={handleStartOver}
                disabled={!pdfUrl && !error}
              >
                Start over
              </button>
            </div>
          )}
        </section>

        <section className="workbench__output">
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

          <div className="output-stack reveal reveal--3">
            <Preview pdfUrl={pdfUrl} />
            <Actions
              pdfUrl={pdfUrl}
              fileName={pdfName ? `${pdfName}.pdf` : undefined}
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
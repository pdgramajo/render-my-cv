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
    <div>
      <h1>RenderCV Web</h1>
      <FileInput onFile={handleFile} disabled={loading} />
      {loading && <div>Generating PDF...</div>}
      {error && <div role="alert">{error}</div>}
      <Preview pdfUrl={pdfUrl} />
      <Actions pdfUrl={pdfUrl} onDownload={handleDownload} onShare={handleShare} />
    </div>
  )
}

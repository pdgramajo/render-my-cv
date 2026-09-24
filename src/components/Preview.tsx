import { useMemo } from 'react'

type Props = {
  pdfUrl: string | null
}

/**
 * Touch-first devices (phones, most tablets) have no embedded PDF viewer, so
 * a blob URL inside an `<iframe>` renders blank. Detect the real capability
 * via the `pointer: coarse` media query instead of guessing with a user agent
 * string; the iframe preview stays on fine-pointer devices where the browser
 * renders the PDF inline.
 */
function detectCoarsePointer(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches
  )
}

export function Preview({ pdfUrl }: Props) {
  const isCoarsePointer = useMemo(detectCoarsePointer, [])
  return (
    <section className="preview" aria-label="PDF preview">
      <header className="preview__bar">
        <span className="preview__label">PDF Preview</span>
        <span
          className={`preview__state${pdfUrl ? ' is-live' : ''}`}
          aria-hidden="true"
        >
          {pdfUrl ? 'READY' : 'IDLE'}
        </span>
      </header>
      {!pdfUrl ? (
        <div className="preview__empty">
          <span className="preview__empty-glyph" aria-hidden="true">
            ¶
          </span>
          <p data-testid="preview-empty">No PDF generated yet</p>
          <span className="preview__empty-sub">your typeset page will appear here</span>
        </div>
      ) : isCoarsePointer ? (
        <div className="preview__empty preview__empty--ready" data-testid="preview-mobile-ready">
          <span className="preview__empty-glyph" aria-hidden="true">
            ↓
          </span>
          <p>Your PDF is ready</p>
          <span className="preview__empty-sub">
            Tap <strong>Download</strong> to open it in your device viewer
          </span>
        </div>
      ) : (
        <iframe
          data-testid="pdf-preview"
          className="preview__frame"
          src={pdfUrl}
          title="PDF Preview"
        />
      )}
    </section>
  )
}
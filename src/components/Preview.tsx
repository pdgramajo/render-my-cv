type Props = {
  pdfUrl: string | null
}

export function Preview({ pdfUrl }: Props) {
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
      {pdfUrl ? (
        <iframe
          data-testid="pdf-preview"
          className="preview__frame"
          src={pdfUrl}
          title="PDF Preview"
        />
      ) : (
        <div className="preview__empty">
          <span className="preview__empty-glyph" aria-hidden="true">
            ¶
          </span>
          <p data-testid="preview-empty">No PDF generated yet</p>
          <span className="preview__empty-sub">your typeset page will appear here</span>
        </div>
      )}
    </section>
  )
}
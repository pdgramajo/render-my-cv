type Props = {
  pdfUrl: string | null
  fileName?: string
  onDownload: () => void
  onShare?: () => void
  disabled?: boolean
}

function DownloadIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v12m0 0-4-4m4 4 4-4" />
      <path d="M4 21h16" />
    </svg>
  )
}

function ShareIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 15V4m0 0L7 9m5-5 5 5" />
      <path d="M4 21h16" />
    </svg>
  )
}

export function Actions({ pdfUrl, fileName, onDownload, onShare, disabled }: Props) {
  if (!pdfUrl) return null
  return (
    <footer className="actions">
      <span className="actions__meta">{fileName ?? 'rendercv.pdf'} · compiled locally</span>
      <div className="actions__buttons">
        <button className="btn btn--primary" onClick={onDownload} disabled={disabled}>
          <DownloadIcon />
          Download PDF
        </button>
        {onShare && (
          <button className="btn btn--ghost" onClick={onShare} disabled={disabled}>
            <ShareIcon />
            Share
          </button>
        )}
      </div>
    </footer>
  )
}
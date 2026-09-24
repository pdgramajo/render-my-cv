type Props = {
  pdfUrl: string | null
  onDownload: () => void
  onShare?: () => void
  disabled?: boolean
}

export function Actions({ pdfUrl, onDownload, onShare, disabled }: Props) {
  if (!pdfUrl) return null
  return (
    <div>
      <button onClick={onDownload} disabled={disabled}>
        Download PDF
      </button>
      {onShare && (
        <button onClick={onShare} disabled={disabled}>
          Share
        </button>
      )}
    </div>
  )
}

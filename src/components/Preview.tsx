type Props = {
  pdfUrl: string | null
}

export function Preview({ pdfUrl }: Props) {
  if (!pdfUrl) {
    return <div data-testid="preview-empty">No PDF generated yet</div>
  }
  return (
    <iframe
      data-testid="pdf-preview"
      src={pdfUrl}
      style={{ width: '100%', height: '80vh', border: '1px solid #ccc' }}
      title="PDF Preview"
    />
  )
}

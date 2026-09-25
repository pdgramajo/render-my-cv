import { useMemo, useState } from 'react'
import { Actions, Preview } from '../../../components'
import { renderCvToYaml } from '../../../rendercv/serialize'
import type { RenderCv } from '../../../types/rendercv'

type Props = {
  model: RenderCv
  raw: string
  onRawChange: (value: string) => void
  unknownKeys: string[]
  onCompileFromModel: () => void
  onCompileFromRaw: () => void
  compiling: boolean
  /** Optional PDF handoff from the parent. When both the URL and a download
   * handler are provided, the compiled preview and its Download/Share actions
   * render inside the review step (used when the wizard takes over the full
   * page width and the classic output column is hidden). */
  pdfUrl?: string | null
  pdfName?: string
  onDownload?: () => void
  onShare?: () => void
}

/**
 * Step 6 — Review & Raw. Shows the YAML serialized from the model; toggling
 * raw mode swaps the preview for an editable textarea whose content compiles
 * as-is (the escape hatch for unknown/advanced keys). Unknown keys found in a
 * parsed document are called out so nothing is silently dropped.
 */
export function ReviewStep({
  model,
  raw,
  onRawChange,
  unknownKeys,
  onCompileFromModel,
  onCompileFromRaw,
  compiling,
  pdfUrl,
  pdfName,
  onDownload,
  onShare,
}: Props) {
  const [rawMode, setRawMode] = useState(false)
  const yaml = useMemo(() => renderCvToYaml(model), [model])

  const toggle = (next: boolean) => {
    setRawMode(next)
    // First time raw mode turns on, seed the textarea with the current YAML.
    if (next && raw.trim() === '') {
      onRawChange(yaml)
    }
  }

  return (
    <div className="review">
      {unknownKeys.length > 0 && (
        <p className="warn" role="status">
          This document has fields outside the form schema: {unknownKeys.join(', ')}. They are
          dropped when you edit the form — switch to raw YAML to keep them.
        </p>
      )}

      <div className="raw-toggle" role="group" aria-label="YAML editing mode">
        <button
          type="button"
          className={rawMode ? '' : 'is-active'}
          onClick={() => toggle(false)}
          aria-pressed={!rawMode}
        >
          Form YAML
        </button>
        <button
          type="button"
          className={rawMode ? 'is-active' : ''}
          onClick={() => toggle(true)}
          aria-pressed={rawMode}
        >
          Raw YAML
        </button>
      </div>

      {rawMode ? (
        <textarea
          className="raw-panel__textarea"
          aria-label="Raw YAML editor"
          spellCheck={false}
          value={raw}
          rows={18}
          onChange={(event) => onRawChange(event.target.value)}
        />
      ) : (
        <pre className="raw-panel__pre" aria-label="Serialized YAML" data-testid="serialized-yaml">
          {yaml}
        </pre>
      )}

      <p className="review__note">
        {rawMode
          ? 'Raw mode compiles this text exactly as written — unknown keys survive.'
          : 'The form compiles this generated YAML — unknown keys are dropped.'}
      </p>

      {rawMode ? (
        <button
          type="button"
          className="btn btn--primary"
          data-testid="compile-raw"
          onClick={onCompileFromRaw}
          disabled={compiling}
        >
          {compiling ? 'Compiling…' : 'Compile raw YAML'}
        </button>
      ) : (
        <button
          type="button"
          className="btn btn--primary"
          data-testid="compile-form"
          onClick={onCompileFromModel}
          disabled={compiling}
        >
          {compiling ? 'Compiling…' : 'Compile PDF'}
        </button>
      )}

      {pdfUrl && onDownload && (
        <div className="review__output">
          <Preview pdfUrl={pdfUrl} />
          <Actions
            pdfUrl={pdfUrl}
            fileName={pdfName}
            onDownload={onDownload}
            onShare={onShare}
            disabled={compiling}
          />
        </div>
      )}
    </div>
  )
}

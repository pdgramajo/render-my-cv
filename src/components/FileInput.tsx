import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'

type Props = {
  onFile: (file: File) => void
  disabled?: boolean
}

export function FileInput({ onFile, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [selectedName, setSelectedName] = useState<string | null>(null)

  const pick = (file: File | undefined) => {
    if (!file) return
    setSelectedName(file.name)
    onFile(file)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    pick(e.target.files?.[0])
  }

  const handleDrop = (e: DragEvent<HTMLInputElement>) => {
    e.preventDefault()
    setDragging(false)
    if (!disabled) {
      pick(e.dataTransfer.files?.[0])
    }
  }

  const zoneLabel = selectedName
    ? selectedName
    : dragging
      ? 'Release to set the press'
      : 'Drop your CV YAML here'

  const zoneHint = selectedName
    ? 'Pick another file to replace it'
    : 'or click to browse — nothing is uploaded'

  const zoneClass = [
    'upload-zone',
    dragging ? 'upload-zone--dragging' : '',
    selectedName ? 'upload-zone--loaded' : '',
    disabled ? 'is-disabled' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={zoneClass} data-testid="upload-zone">
      <input
        ref={inputRef}
        className="upload-zone__input"
        type="file"
        accept=".yaml,.yml,application/yaml,text/yaml"
        onChange={handleChange}
        onDragOver={e => {
          e.preventDefault()
          if (!disabled) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        disabled={disabled}
        aria-label="Upload a RenderCV YAML file"
      />
      <div className="upload-zone__body" aria-hidden="true">
        <span className="upload-zone__glyph" aria-hidden="true">
          ¶
        </span>
        <p className="upload-zone__title">{zoneLabel}</p>
        <p className="upload-zone__hint">{zoneHint}</p>
        <span className="upload-zone__chip">ACCEPTS .yaml / .yml</span>
      </div>
    </div>
  )
}
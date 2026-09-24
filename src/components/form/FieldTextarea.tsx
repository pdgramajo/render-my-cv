type Props = {
  id: string
  label?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

/** Multi-line markdown field for summaries, highlights and skill details. */
export function FieldTextarea({ id, label, value, onChange, placeholder }: Props) {
  return (
    <div className="field">
      {label && (
        <label className="field__label" htmlFor={id}>
          {label}
        </label>
      )}
      <textarea
        id={id}
        className="field__control"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}
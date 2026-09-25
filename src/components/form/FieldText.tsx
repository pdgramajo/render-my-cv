type Props = {
  id: string
  label?: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  placeholder?: string
  wide?: boolean
}

/**
 * Single-line text field. A required field that is currently empty renders an
 * inline hint — validation itself still happens at compile, exactly as before.
 */
export function FieldText({ id, label, value, onChange, required, placeholder, wide }: Props) {
  return (
    <div className={`field${wide ? ' field--wide' : ''}`}>
      {label && (
        <label className="field__label" htmlFor={id}>
          {label}
          {required && (
            <span className="field__req" aria-hidden="true">
              {' '}*
            </span>
          )}
        </label>
      )}
      <input
        id={id}
        className="field__control"
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        aria-required={required || undefined}
      />
      {required && value.trim() === '' && (
        <p className="field__hint" role="note">
          Required — needed before compiling.
        </p>
      )}
    </div>
  )
}
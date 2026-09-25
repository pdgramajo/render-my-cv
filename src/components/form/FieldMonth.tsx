type Props = {
  id: string
  label?: string
  value: string | undefined
  onChange: (value: string) => void
  allowPresent?: boolean
}

/**
 * `YYYY-MM` month picker. End dates optionally get a "Present" chip: checking
 * it sets the value to the literal `"present"`, the same escape the RenderCV
 * schema accepts. An empty value (`''`) means "cleared" — the owner decides
 * whether to store it as an absent key.
 */
export function FieldMonth({ id, label, value, onChange, allowPresent }: Props) {
  const present = value === 'present'
  const monthValue = value !== undefined && !present ? value : ''

  return (
    <div className="field field--month">
      {label && (
        <span className="field__label" id={`${id}-label`}>
          {label}
        </span>
      )}
      <div className="month-row">
        <input
          id={id}
          className="field__control"
          type="month"
          value={monthValue}
          disabled={present}
          aria-labelledby={label ? `${id}-label` : undefined}
          aria-disabled={present || undefined}
          onChange={(event) => onChange(event.target.value)}
        />
        {allowPresent && (
          <label className="present-chip">
            <input
              type="checkbox"
              checked={present}
              onChange={(event) => onChange(event.target.checked ? 'present' : '')}
            />
            Present
          </label>
        )}
      </div>
    </div>
  )
}
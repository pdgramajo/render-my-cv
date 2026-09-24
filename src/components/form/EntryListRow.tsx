import type { ScalarFieldDef, StringListDef } from '../../form/schema'
import { EditableList, StringListRow } from './EditableList'
import { FieldMonth } from './FieldMonth'
import { FieldText } from './FieldText'
import { FieldTextarea } from './FieldTextarea'

type EntryListRowProps<T extends Record<string, unknown>> = {
  index: number
  entry: T
  noun: string
  fieldDefs: ScalarFieldDef[]
  listDefs?: StringListDef[]
  scope: string
  onChange: (next: T) => void
  onRemove: () => void
}

function scalarControl(
  def: ScalarFieldDef,
  id: string,
  value: string | undefined,
  onChange: (value: string) => void,
) {
  switch (def.type) {
    case 'text':
      return (
        <FieldText
          id={id}
          label={def.label}
          value={value ?? ''}
          required={def.required}
          placeholder={def.placeholder}
          onChange={onChange}
        />
      )
    case 'textarea':
      return (
        <FieldTextarea
          id={id}
          label={def.label}
          value={value ?? ''}
          placeholder={def.placeholder}
          onChange={onChange}
        />
      )
    case 'month':
    case 'month-present':
      return (
        <FieldMonth
          id={id}
          label={def.label}
          value={value}
          allowPresent={def.type === 'month-present'}
          onChange={onChange}
        />
      )
  }
}

/**
 * One object row inside a list editor, driven entirely by the field schema:
 * scalar fields on top, nested string lists (highlights, bold keywords)
 * below. Clearing a field writes `undefined` so the serializer omits the key.
 */
export function EntryListRow<T extends Record<string, unknown>>({
  index,
  entry,
  noun,
  fieldDefs,
  listDefs,
  scope,
  onChange,
  onRemove,
}: EntryListRowProps<T>) {
  const setField = (key: string, type: ScalarFieldDef['type']) => (value: string) => {
    const next: string | undefined = type.startsWith('month') && value === '' ? undefined : value
    onChange({ ...entry, [key]: next } as T)
  }

  return (
    <div className="entry-row">
      <header className="entry-row__head">
        <span className="entry-row__label">
          {noun} {index + 1}
        </span>
        <button
          type="button"
          className="btn btn--icon"
          aria-label={`Remove ${noun.toLowerCase()} ${index + 1}`}
          onClick={onRemove}
        >
          ×
        </button>
      </header>

      <div className="entry-row__fields">
        {fieldDefs.map((def) => {
          const raw = (entry as Record<string, unknown>)[def.key]
          const value = typeof raw === 'string' ? raw : undefined
          return (
            <div key={def.key} className="entry-row__cell">
              {scalarControl(def, `${scope}-${def.key}`, value, setField(def.key, def.type))}
            </div>
          )
        })}
      </div>

      {listDefs && listDefs.length > 0 && (
        <div className="entry-row__lists">
          {listDefs.map((def) => {
            const raw = (entry as Record<string, unknown>)[def.key]
            return (
              <section className="list-group" key={def.key}>
                <h4 className="list-group__label">{def.label}</h4>
                <EditableList
                  items={Array.isArray(raw) ? (raw as string[]) : []}
                  onChange={(next) => onChange({ ...entry, [def.key]: next } as T)}
                  buildNew={() => ''}
                  addLabel={def.addLabel}
                  emptyLabel={def.emptyLabel}
                  renderRow={(rowIndex, item, update, remove) => (
                    <StringListRow
                      id={`${scope}-${def.key}-${rowIndex}`}
                      value={item}
                      mode={def.mode}
                      placeholder={def.rowPlaceholder}
                      onChange={update}
                      onRemove={remove}
                    />
                  )}
                />
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
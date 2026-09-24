import type { ReactNode } from 'react'
import { FieldText } from './FieldText'
import { FieldTextarea } from './FieldTextarea'

type EditableListProps<T> = {
  items: T[]
  onChange: (next: T[]) => void
  /** Factory for a fresh row — called on "Add". */
  buildNew: () => T
  addLabel: string
  emptyLabel?: string
  renderRow: (
    index: number,
    item: T,
    onChangeItem: (next: T) => void,
    onRemove: () => void,
  ) => ReactNode
}

/**
 * Generic add/remove list editor. Rows are identified by their position, so
 * deleting a row renumbers the rest (index-derived ids stay coherent) and the
 * list stays small — CVs are not spreadsheets.
 */
export function EditableList<T>({
  items,
  onChange,
  buildNew,
  addLabel,
  emptyLabel,
  renderRow,
}: EditableListProps<T>) {
  const add = () => onChange([...items, buildNew()])
  const updateAt = (index: number) => (next: T) =>
    onChange(items.map((item, i) => (i === index ? next : item)))
  const removeAt = (index: number) => () => onChange(items.filter((_, i) => i !== index))

  return (
    <section className="list-editor">
      {items.length === 0 && emptyLabel && <p className="list-editor__empty">{emptyLabel}</p>}
      <ol className="list-editor__rows">
        {items.map((item, index) => (
          <li key={index} className="list-editor__row">
            {renderRow(index, item, updateAt(index), removeAt(index))}
          </li>
        ))}
      </ol>
      <button type="button" className="btn btn--ghost btn--add" onClick={add}>
        + {addLabel}
      </button>
    </section>
  )
}

type StringListRowProps = {
  id: string
  value: string
  mode: 'text' | 'textarea'
  placeholder?: string
  onChange: (value: string) => void
  onRemove: () => void
}

/** One row of a string list (summary paragraph, highlight, bold keyword). */
export function StringListRow({ id, value, mode, placeholder, onChange, onRemove }: StringListRowProps) {
  return (
    <div className="string-row">
      {mode === 'textarea' ? (
        <FieldTextarea id={id} value={value} placeholder={placeholder} onChange={onChange} />
      ) : (
        <FieldText id={id} value={value} placeholder={placeholder} onChange={onChange} />
      )}
      <button type="button" className="btn btn--icon" aria-label="Remove row" onClick={onRemove}>
        ×
      </button>
    </div>
  )
}
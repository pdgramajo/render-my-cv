import { HEADER_FIELDS, SOCIAL_NETWORK_FIELDS } from '../../../form/schema'
import { EditableList } from '../EditableList'
import { EntryListRow } from '../EntryListRow'
import { FieldText } from '../FieldText'
import { toOptional, type StepProps } from './shared'

/** Step 1 — Header: name, contact lines and social networks. */
export function HeaderStep({ model, onChange }: StepProps) {
  const patch = (partial: Partial<typeof model>) => onChange({ ...model, ...partial })

  return (
    <div className="step__fields">
      <FieldText
        id="header-name"
        label="Name"
        value={model.name}
        required
        placeholder="Jane Doe"
        wide
        onChange={(value) => patch({ name: value })}
      />
      {HEADER_FIELDS.filter((field) => field.key !== 'name').map((field) => {
        const value = (model as unknown as Record<string, unknown>)[field.key]
        return (
          <FieldText
            key={field.key}
            id={`header-${field.key}`}
            label={field.label}
            value={typeof value === 'string' ? value : ''}
            placeholder={field.placeholder}
            onChange={(next) => patch({ [field.key]: toOptional(next) })}
          />
        )
      })}
      <EditableList
        items={model.socialNetworks ?? []}
        onChange={(next) => patch({ socialNetworks: next })}
        buildNew={() => ({ network: '', username: '' })}
        addLabel="Add social network"
        emptyLabel="No social networks yet."
        renderRow={(index, item, update, remove) => (
          <EntryListRow
            index={index}
            entry={item}
            noun="Network"
            fieldDefs={SOCIAL_NETWORK_FIELDS}
            scope={`header-social-${index}`}
            onChange={update}
            onRemove={remove}
          />
        )}
      />
    </div>
  )
}
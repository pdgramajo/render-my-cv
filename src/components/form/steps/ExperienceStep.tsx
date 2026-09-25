import type { ExperienceEntry } from '../../../types/rendercv'
import { EXPERIENCE_FIELDS, EXPERIENCE_LISTS } from '../../../form/schema'
import { EditableList } from '../EditableList'
import { EntryListRow } from '../EntryListRow'
import type { StepProps } from './shared'

/** Step 3 — Experience: role entries with dates, highlights and bold keywords. */
export function ExperienceStep({ model, onChange }: StepProps) {
  const experience = (model.sections.experience as ExperienceEntry[] | undefined) ?? []
  const patchEntries = (next: typeof experience) =>
    onChange({ ...model, sections: { ...model.sections, experience: next } })

  return (
    <div className="step__fields">
      <EditableList
        items={experience}
        onChange={patchEntries}
        buildNew={() => ({ company: '' })}
        addLabel="Add role"
        emptyLabel="No roles yet."
        renderRow={(index, item, update, remove) => (
          <EntryListRow
            index={index}
            entry={item}
            noun="Role"
            fieldDefs={EXPERIENCE_FIELDS}
            listDefs={EXPERIENCE_LISTS}
            scope={`experience-${index}`}
            onChange={update}
            onRemove={remove}
          />
        )}
      />
    </div>
  )
}
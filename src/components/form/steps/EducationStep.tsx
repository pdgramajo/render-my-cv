import type { EducationEntry } from '../../../types/rendercv'
import { EDUCATION_FIELDS, EDUCATION_LISTS } from '../../../form/schema'
import { EditableList } from '../EditableList'
import { EntryListRow } from '../EntryListRow'
import type { StepProps } from './shared'

/** Step 4 — Education: degree entries with dates and highlights. */
export function EducationStep({ model, onChange }: StepProps) {
  const education = (model.sections.education as EducationEntry[] | undefined) ?? []
  const patchEntries = (next: typeof education) =>
    onChange({ ...model, sections: { ...model.sections, education: next } })

  return (
    <div className="step__fields">
      <EditableList
        items={education}
        onChange={patchEntries}
        buildNew={() => ({ institution: '' })}
        addLabel="Add degree"
        emptyLabel="No education entries yet."
        renderRow={(index, item, update, remove) => (
          <EntryListRow
            index={index}
            entry={item}
            noun="Degree"
            fieldDefs={EDUCATION_FIELDS}
            listDefs={EDUCATION_LISTS}
            scope={`education-${index}`}
            onChange={update}
            onRemove={remove}
          />
        )}
      />
    </div>
  )
}
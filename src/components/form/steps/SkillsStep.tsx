import type { SectionEntry, SkillEntry } from '../../../types/rendercv'
import { SKILLS_FIELDS } from '../../../form/schema'
import { EditableList } from '../EditableList'
import { EntryListRow } from '../EntryListRow'
import type { StepProps } from './shared'

/** Step 5 — Skills: label/detail pairs. */
export function SkillsStep({ model, onChange }: StepProps) {
  const skillsEntry = model.sections.skills
    ? (model.sections.skills as SectionEntry)
    : { name: 'skills', type: 'skills' as const, payload: [] }
  const skills = skillsEntry.payload as SkillEntry[]
  const patchEntries = (next: typeof skills) =>
    onChange({ ...model, sections: { ...model.sections, skills: { ...skillsEntry, payload: next } } })

  return (
    <div className="step__fields">
      <EditableList
        items={skills}
        onChange={patchEntries}
        buildNew={() => ({ label: '' })}
        addLabel="Add skill"
        emptyLabel="No skills yet."
        renderRow={(index, item, update, remove) => (
          <EntryListRow
            index={index}
            entry={item}
            noun="Skill"
            fieldDefs={SKILLS_FIELDS}
            scope={`skills-${index}`}
            onChange={update}
            onRemove={remove}
          />
        )}
      />
    </div>
  )
}
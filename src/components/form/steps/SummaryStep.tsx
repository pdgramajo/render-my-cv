import { SUMMARY_LIST } from '../../../form/schema'
import { EditableList, StringListRow } from '../EditableList'
import type { StepProps } from './shared'

/** Step 2 — Summary: markdown paragraphs, one per row. */
export function SummaryStep({ model, onChange }: StepProps) {
  const summary = (model.sections.summary as string[] | undefined) ?? []
  const patchSummaries = (next: string[]) =>
    onChange({ ...model, sections: { ...model.sections, summary: next } })

  return (
    <div className="step__fields">
      <EditableList
        items={summary}
        onChange={patchSummaries}
        buildNew={() => ''}
        addLabel={SUMMARY_LIST.addLabel}
        emptyLabel={SUMMARY_LIST.emptyLabel}
        renderRow={(index, item, update, remove) => (
          <StringListRow
            id={`summary-${index}`}
            value={item}
            mode={SUMMARY_LIST.mode}
            placeholder={SUMMARY_LIST.rowPlaceholder}
            onChange={update}
            onRemove={remove}
          />
        )}
      />
    </div>
  )
}
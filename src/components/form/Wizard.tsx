import { WIZARD_STEPS } from '../../form/schema'
import type { RenderCv } from '../../types/rendercv'
import { FileInput } from '../FileInput'
import { Stepper } from './Stepper'
import { EducationStep } from './steps/EducationStep'
import { ExperienceStep } from './steps/ExperienceStep'
import { HeaderStep } from './steps/HeaderStep'
import { ReviewStep } from './steps/ReviewStep'
import { SkillsStep } from './steps/SkillsStep'
import { SummaryStep } from './steps/SummaryStep'

export type SaveState = 'idle' | 'saving' | 'saved'

type Props = {
  model: RenderCv
  step: number
  onStepChange: (next: number) => void
  onModelChange: (next: RenderCv) => void
  onImportFile: (file: File) => void
  onStartOver: () => void
  rawDraft: string
  onRawDraftChange: (value: string) => void
  unknownKeys: string[]
  onCompileFromModel: () => void
  onCompileFromRaw: () => void
  saveState: SaveState
  savedAt: Date | null
  compiling: boolean
  toolbarKey: number
}

const LAST_STEP = WIZARD_STEPS.length - 1

/**
 * The wizard shell: import toolbar + autosave chip, the stepper, the current
 * step's container and the Back/Next navigation. The parent owns the model,
 * the step index and the raw draft; everything changes by bubbling up.
 */
export function Wizard({
  model,
  step,
  onStepChange,
  onModelChange,
  onImportFile,
  onStartOver,
  rawDraft,
  onRawDraftChange,
  unknownKeys,
  onCompileFromModel,
  onCompileFromRaw,
  saveState,
  savedAt,
  compiling,
  toolbarKey,
}: Props) {
  const safeStep = Math.min(Math.max(step, 0), LAST_STEP)
  const currentStep = WIZARD_STEPS[safeStep]

  const renderStep = () => {
    switch (currentStep.id) {
      case 'header':
        return <HeaderStep model={model} onChange={onModelChange} />
      case 'summary':
        return <SummaryStep model={model} onChange={onModelChange} />
      case 'experience':
        return <ExperienceStep model={model} onChange={onModelChange} />
      case 'education':
        return <EducationStep model={model} onChange={onModelChange} />
      case 'skills':
        return <SkillsStep model={model} onChange={onModelChange} />
      case 'review':
        return (
          <ReviewStep
            model={model}
            raw={rawDraft}
            onRawChange={onRawDraftChange}
            unknownKeys={unknownKeys}
            onCompileFromModel={onCompileFromModel}
            onCompileFromRaw={onCompileFromRaw}
            compiling={compiling}
          />
        )
    }
  }

  return (
    <section className="wizard reveal reveal--2" aria-label="CV form wizard">
      <div className="wizard__toolbar">
        <FileInput key={toolbarKey} onFile={onImportFile} disabled={compiling} />
        <div className="wizard__meta">
          {saveState !== 'idle' && (
            <p className="save-chip" role="status">
              <span className="save-chip__dot" aria-hidden="true" />
              {saveState === 'saving'
                ? 'Saving draft…'
                : `Draft saved locally · ${savedAt?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) ?? ''}`}
            </p>
          )}
          <button
            type="button"
            className="btn btn--ghost btn--reset"
            onClick={onStartOver}
            disabled={compiling}
          >
            Start over
          </button>
        </div>
      </div>

      <Stepper steps={WIZARD_STEPS} current={safeStep} onSelect={onStepChange} />

      <div className="step">
        <header className="step__head">
          <h2 className="step__title" id={`step-${currentStep.id}-title`}>
            {currentStep.title}
          </h2>
          <p className="step__blurb">{currentStep.blurb}</p>
        </header>
        <div role="group" aria-labelledby={`step-${currentStep.id}-title`}>
          {renderStep()}
        </div>
      </div>

      <nav className="wizard__nav" aria-label="Step navigation">
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => onStepChange(safeStep - 1)}
          disabled={safeStep === 0 || compiling}
        >
          ← Back
        </button>
        <span className="wizard__nav-count" aria-live="polite">
          Step {safeStep + 1} of {WIZARD_STEPS.length}
        </span>
        {safeStep < LAST_STEP ? (
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => onStepChange(safeStep + 1)}
            disabled={compiling}
          >
            Next →
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--primary"
            onClick={onCompileFromModel}
            disabled={compiling}
          >
            {compiling ? 'Compiling…' : 'Compile PDF'}
          </button>
        )}
      </nav>
    </section>
  )
}
import type { StepSchema } from '../../form/schema'

type Props = {
  steps: StepSchema[]
  current: number
  onSelect: (index: number) => void
}

/** Horizontal step indicator; every step is clickable (no gated pre-validation). */
export function Stepper({ steps, current, onSelect }: Props) {
  return (
    <nav className="stepper" aria-label="Wizard steps">
      <ol className="stepper__list">
        {steps.map((step, index) => {
          const active = index === current
          const done = index < current
          return (
            <li key={step.id} className="stepper__item">
              <button
                type="button"
                className={`stepper__link${active ? ' is-active' : ''}${done ? ' is-done' : ''}`}
                onClick={() => onSelect(index)}
                aria-current={active ? 'step' : undefined}
                aria-label={`Step ${index + 1}: ${step.title}`}
              >
                <span className="stepper__num" aria-hidden="true">
                  {done ? '✓' : index + 1}
                </span>
                <span className="stepper__label">{step.title}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
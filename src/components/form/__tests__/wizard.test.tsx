import { describe, expect, it, vi, afterEach } from 'vitest'
import { fireEvent, render, screen, within, cleanup } from '@testing-library/react'
import { useState } from 'react'
import { Wizard } from '../Wizard'
import type { RenderCv } from '../../../types/rendercv'

const baseModel: RenderCv = {
  name: 'John Doe',
  headline: 'Engineer',
  email: 'j@example.com',
  socialNetworks: [{ network: 'github', username: 'johndoe' }],
  sections: {
    summary: ['One paragraph.'],
    experience: [
      {
        company: 'Acme',
        position: 'Dev',
        location: 'Remote',
        startDate: '2022-01',
        endDate: 'present',
        highlights: ['Built things'],
        boldKeywords: ['things'],
      },
      { company: 'Beta', position: 'Junior' },
    ],
    education: [{ institution: 'Uni', area: 'CS' }],
    skills: [{ label: 'React', details: 'Hooks' }],
  },
}

const noop = () => {}

function BaseWizard(props: Partial<Parameters<typeof Wizard>[0]>) {
  return <Wizard model={baseModel} step={0} onStepChange={noop} onModelChange={noop} onImportFile={noop} onStartOver={noop} rawDraft="" onRawDraftChange={noop} unknownKeys={[]} onCompileFromModel={noop} onCompileFromRaw={noop} saveState="idle" savedAt={null} compiling={false} toolbarKey={0} {...props} />
}

function Harness({ initial = baseModel }: { initial?: RenderCv }) {
  const [model, setModel] = useState(initial)
  const [step, setStep] = useState(0)
  return (
    <Wizard
      model={model}
      step={step}
      onStepChange={setStep}
      onModelChange={setModel}
      onImportFile={noop}
      onStartOver={noop}
      rawDraft=""
      onRawDraftChange={noop}
      unknownKeys={[]}
      onCompileFromModel={noop}
      onCompileFromRaw={noop}
      saveState="saved"
      savedAt={new Date('2026-01-02T03:04:05')}
      compiling={false}
      toolbarKey={0}
    />
  )
}

function RawHarness({ onCompileFromRaw }: { onCompileFromRaw: () => void }) {
  const [raw, setRaw] = useState('')
  return (
    <Wizard
      model={baseModel}
      step={5}
      onStepChange={noop}
      onModelChange={noop}
      onImportFile={noop}
      onStartOver={noop}
      rawDraft={raw}
      onRawDraftChange={setRaw}
      unknownKeys={[]}
      onCompileFromModel={noop}
      onCompileFromRaw={onCompileFromRaw}
      saveState="idle"
      savedAt={null}
      compiling={false}
      toolbarKey={0}
    />
  )
}

describe('Wizard', () => {
  afterEach(cleanup)

  it('shows six steps and starts on Header', () => {
    render(<BaseWizard />)
    const nav = screen.getByRole('navigation', { name: /steps/i })
    expect(within(nav).getAllByRole('button')).toHaveLength(6)
    expect(screen.getByRole('button', { name: 'Step 1: Header' })).toHaveAttribute(
      'aria-current',
      'step',
    )
    expect(screen.getByRole('heading', { name: 'Header' })).toBeInTheDocument()
  })

  it('disables Back on the first step and advances with Next', () => {
    render(<Harness />)
    const back = screen.getByRole('button', { name: /back/i })
    expect(back).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByRole('button', { name: 'Step 2: Summary' })).toHaveAttribute(
      'aria-current',
      'step',
    )
  })

  it('bubbles name edits up through onModelChange', () => {
    const onChange = vi.fn()
    render(<BaseWizard onModelChange={onChange} />)
    fireEvent.change(screen.getByRole("textbox", { name: /^name$/i }), { target: { value: 'Ada Lovelace' } })
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ name: 'Ada Lovelace' }))
  })

  it('shows a required hint for an empty required field', () => {
    render(<Harness />)
    const name = screen.getByRole("textbox", { name: /^name$/i })
    fireEvent.change(name, { target: { value: '' } })
    expect(screen.getByText(/required — needed before compiling/i)).toBeInTheDocument()
  })

  it('experience rows can be removed with stable renumbering', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: /next/i })) // summary
    fireEvent.click(screen.getByRole('button', { name: /next/i })) // experience

    expect(screen.getByText('Role 1')).toBeInTheDocument()
    expect(screen.getByText('Role 2')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Remove role 1' }))

    expect(screen.queryByText('Role 2')).not.toBeInTheDocument()
    expect(screen.getByText('Role 1')).toBeInTheDocument()
    expect(screen.getByLabelText(/company/i)).toHaveValue('Beta')
  })

  it('experience rows gain a new blank entry with an inline required hint', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    fireEvent.click(screen.getByRole('button', { name: /next/i }))

    fireEvent.click(screen.getByRole('button', { name: /add role/i }))
    expect(screen.getByText('Role 3')).toBeInTheDocument()
    const row = screen.getByText('Role 3').closest('.entry-row') as HTMLElement
    expect(within(row).getByText(/required — needed before compiling/i)).toBeInTheDocument()
  })

  it('present end dates toggle through the month-present field', () => {
    const onChange = vi.fn()
    render(<BaseWizard step={2} onModelChange={onChange} />)
    const present = screen.getAllByLabelText(/present/i)[0] as HTMLInputElement
    expect(present.checked).toBe(true)

    // Unchecking Present writes an empty end date (stored as undefined).
    fireEvent.click(present)
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        sections: expect.objectContaining({
          experience: expect.arrayContaining([
            expect.objectContaining({ company: 'Acme', endDate: undefined }),
          ]),
        }),
      }),
    )

    // The month input is disabled while Present is checked.
    fireEvent.click(screen.getAllByLabelText(/present/i)[0])
    const endMonth = screen.getAllByLabelText(/^end$/i)[0] as HTMLInputElement
    expect(endMonth).toBeDisabled()
  })

  it('edits summary paragraphs through the string list', () => {
    const onChange = vi.fn()
    render(<BaseWizard step={1} onModelChange={onChange} />)
    const paragraph = screen.getByPlaceholderText(/one markdown paragraph/i) as HTMLInputElement
    fireEvent.change(paragraph, { target: { value: 'Rewritten.' } })
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        sections: expect.objectContaining({ summary: ['Rewritten.'] }),
      }),
    )
  })

  it('review shows serialized YAML and compiles from the model', () => {
    const onCompileFromModel = vi.fn()
    render(<BaseWizard step={5} onCompileFromModel={onCompileFromModel} />)
    const pre = screen.getByTestId('serialized-yaml')
    expect(pre).toHaveTextContent('social_networks:')
    expect(pre).toHaveTextContent('John Doe')
    expect(pre).toHaveTextContent('end_date: present')

    fireEvent.click(screen.getByTestId('compile-form'))
    expect(onCompileFromModel).toHaveBeenCalledTimes(1)
  })

  it('raw toggle reveals the textarea and compiles raw', () => {
    const onCompileFromRaw = vi.fn()
    render(<RawHarness onCompileFromRaw={onCompileFromRaw} />)
    fireEvent.click(screen.getByRole('button', { name: /raw yaml/i }))
    const textarea = screen.getByLabelText('Raw YAML editor') as HTMLTextAreaElement
    expect(textarea).toBeInTheDocument()
    expect(textarea.value).toContain('John Doe')

    fireEvent.click(screen.getByTestId('compile-raw'))
    expect(onCompileFromRaw).toHaveBeenCalledTimes(1)
  })

  it('renders the unknown-keys warning when present', () => {
    render(<BaseWizard step={5} unknownKeys={['cv.design']} />)
    expect(screen.getByText(/outside the form schema/i)).toHaveTextContent('cv.design')
  })

  it('shows the save indicator in the toolbar', () => {
    render(<BaseWizard saveState="saved" savedAt={new Date('2026-01-02T03:04:05')} />)
    expect(screen.getByText(/draft saved locally/i)).toBeInTheDocument()
  })
})
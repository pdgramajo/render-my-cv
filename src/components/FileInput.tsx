import { useRef, type ChangeEvent } from 'react'

type Props = {
  onFile: (file: File) => void
  disabled?: boolean
}

export function FileInput({ onFile, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onFile(file)
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }
  }

  return (
    <input
      ref={inputRef}
      type="file"
      accept=".yaml,.yml,application/yaml,text/yaml"
      onChange={handleChange}
      disabled={disabled}
    />
  )
}

import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('renders title and file input', () => {
    render(<App />)
    expect(screen.getByText('RenderCV Web')).toBeInTheDocument()
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(input).toBeInTheDocument()
  })
})
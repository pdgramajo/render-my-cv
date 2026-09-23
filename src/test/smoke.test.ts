import { describe, expect, it } from 'vitest'
import App from '../App'

describe('scaffold smoke', () => {
  it('resolves the app module through the vitest pipeline', () => {
    expect(typeof App).toBe('function')
  })
})
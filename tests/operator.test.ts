import { describe, expect, it } from 'vitest'
import { createClearFlow } from '../src/operator'

describe('clear-today flow', () => {
  it('needs three presses: ask, confirm, delete', () => {
    const f = createClearFlow()
    expect(f.label()).toBe('Clear today')
    expect(f.press()).toBe(false)
    expect(f.label()).toBe('Sure? Deletes all of today’s runs')
    expect(f.press()).toBe(false)
    expect(f.label()).toBe('Press once more to delete')
    expect(f.press()).toBe(true)
    expect(f.label()).toBe('Clear today')
  })
  it('reset goes back to the start (menu closed or another button pressed)', () => {
    const f = createClearFlow()
    f.press()
    f.press()
    f.reset()
    expect(f.label()).toBe('Clear today')
    expect(f.press()).toBe(false)
  })
})

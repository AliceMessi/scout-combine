import { describe, expect, it } from 'vitest'
import { localDay } from '../src/day'

describe('localDay', () => {
  it('uses the local calendar date', () => {
    expect(localDay(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
    expect(localDay(new Date(2026, 10, 24, 0, 0))).toBe('2026-11-24')
  })
})

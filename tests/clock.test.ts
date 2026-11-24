import { describe, expect, it } from 'vitest'
import { createClock } from '../src/clock'

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

describe('createClock', () => {
  it('splits a frame into sub-steps of at most 8 ms', () => {
    const c = createClock({ scale: 1 })
    expect(c.tick(16)).toEqual([8, 8])
    expect(c.tick(20)).toEqual([8, 8, 4])
  })
  it('applies the scale', () => {
    const steps = createClock({ scale: 10 }).tick(16)
    expect(steps).toHaveLength(20)
    expect(sum(steps)).toBeCloseTo(160)
    expect(Math.max(...steps)).toBeLessThanOrEqual(8)
  })
  it('clock clamps a long gap', () => {
    expect(sum(createClock({ scale: 1 }).tick(600000))).toBe(250)
  })
  it('tracks game time', () => {
    const c = createClock({ scale: 2 })
    c.tick(16)
    c.tick(4)
    expect(c.now()).toBeCloseTo(40)
  })
  it('ignores negative or zero frames', () => {
    expect(createClock({ scale: 1 }).tick(-5)).toEqual([])
  })
})

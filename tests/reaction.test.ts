import { describe, expect, it } from 'vitest'
import { createReaction } from '../src/drills/reaction'
import type { Press } from '../src/drills/types'

const P: Press = { x: 800, y: 450, source: 'pointer' }
const half = () => 0.5 // every wait lasts 1000 + 0.5 * 2000 = 2000 ms

describe('Reaction drill', () => {
  it('a press before the signal is a false start', () => {
    const d = createReaction(half)
    d.step(1500, [P])
    expect(d.metrics().falseStarts).toBe(1)
    expect(d.view().tooEarly).toBe(true)
    expect(d.view().phase).toBe('feedback')
  })
  it('a press less than 100 ms after the signal is a false start', () => {
    const d = createReaction(half)
    d.step(2000, [])
    expect(d.view().phase).toBe('signal')
    d.step(50, [P])
    expect(d.metrics()).toMatchObject({ falseStarts: 1, trials: 0 })
  })
  it('a press after 100 ms is a valid trial', () => {
    const d = createReaction(half)
    d.step(2000, [])
    d.step(250, [P])
    expect(d.metrics()).toMatchObject({ trials: 1, falseStarts: 0, medianMs: 250 })
    expect(d.view().lastMs).toBe(250)
  })
  it('mashing counts one false start per trial', () => {
    const d = createReaction(half)
    for (let i = 0; i < 10; i++) d.step(50, [P])
    expect(d.metrics().falseStarts).toBe(1)
  })
  it('restarts a trial 600 ms after feedback', () => {
    const d = createReaction(half)
    d.step(500, [P]) // false start at 500, feedback until 1100
    d.step(599, [])
    expect(d.view().phase).toBe('feedback')
    d.step(1, [])
    expect(d.view().phase).toBe('wait')
    d.step(2000, [])
    expect(d.view().phase).toBe('signal')
  })
  it('takes the median of valid trials', () => {
    const d = createReaction(half)
    d.step(2000, []); d.step(200, [P]) // signal 2000, press 2200
    d.step(600, []); d.step(2000, []); d.step(300, [P])
    d.step(600, []); d.step(2000, []); d.step(250, [P])
    expect(d.metrics()).toMatchObject({ trials: 3, medianMs: 250 })
  })
  it('ends after 30 s and then ignores presses', () => {
    const d = createReaction(half)
    d.step(29999, [])
    expect(d.done()).toBe(false)
    d.step(1, [])
    expect(d.done()).toBe(true)
    d.step(10, [P])
    expect(d.metrics()).toMatchObject({ trials: 0, falseStarts: 0, medianMs: null })
    expect(d.view().remainingMs).toBe(0)
  })
  it('accepts the action key too', () => {
    const d = createReaction(half)
    d.step(2000, [])
    d.step(300, [{ x: 0, y: 0, source: 'key' }])
    expect(d.metrics().trials).toBe(1)
  })
})

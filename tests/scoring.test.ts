import { describe, expect, it } from 'vitest'
import { fittsTp, flickScore, lastHitScore, overallScore, percentile, reactionScore, roleOf } from '../src/scoring'

describe('reactionScore', () => {
  it.each([
    [150, 0, 100], [400, 0, 0], [275, 0, 50], [275, 2, 40], [100, 0, 100], [500, 0, 0], [null, 0, 0], [390, 3, 0],
  ])('median %s ms, %s false starts -> %s', (ms, fs, want) => {
    expect(reactionScore(ms, fs)).toBe(want)
  })
})

describe('flickScore', () => {
  it.each([
    [6.5, 10, 0, 100], [2.5, 10, 0, 0], [4.5, 9, 1, 45], [6.5, 2, 0, 0], [9, 5, 0, 100],
  ])('tp %s, %s hits, %s misses -> %s', (tp, h, m, want) => {
    expect(flickScore(tp, h, m)).toBe(want)
  })
})

describe('lastHitScore', () => {
  it('is the share of dead units you finished', () => {
    expect(lastHitScore(14, 19)).toBe(74)
    expect(lastHitScore(0, 0)).toBe(0)
    expect(lastHitScore(5, 5)).toBe(100)
  })
})

describe('fittsTp', () => {
  it('uses the Shannon formulation', () => {
    expect(fittsTp(600, 60, 1000)).toBeCloseTo(3.459, 3)
  })
})

describe('overall, role, percentile', () => {
  it('overall is the rounded mean', () => {
    expect(overallScore({ reaction: 80, flick: 60, lastHit: 70 })).toBe(70)
    expect(overallScore({ reaction: 80, flick: 60, lastHit: 71 })).toBe(70)
  })
  it('role comes from the best drill', () => {
    expect(roleOf({ reaction: 90, flick: 60, lastHit: 70 })).toBe('Opener')
    expect(roleOf({ reaction: 40, flick: 90, lastHit: 70 })).toBe('Marksman')
    expect(roleOf({ reaction: 40, flick: 60, lastHit: 90 })).toBe('Finisher')
  })
  it('scores within 10 points make a Flex', () => {
    expect(roleOf({ reaction: 70, flick: 75, lastHit: 79 })).toBe('Flex')
    expect(roleOf({ reaction: 70, flick: 75, lastHit: 80 })).toBe('Flex')
  })
  it('ties pick Reaction > Flick > Last Hit', () => {
    expect(roleOf({ reaction: 90, flick: 90, lastHit: 40 })).toBe('Opener')
    expect(roleOf({ reaction: 40, flick: 90, lastHit: 90 })).toBe('Marksman')
  })
  it('percentile is the share of today\'s runs below you', () => {
    expect(percentile(70, [50, 60, 70, 80, 90])).toBe(40)
    expect(percentile(70, [50, 60, 70, 80])).toBeNull()
  })
})

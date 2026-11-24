import { describe, expect, it } from 'vitest'
import { metricLines, tipFor, TIPS } from '../src/cardText'
import type { RunResult } from '../src/run'

const base: RunResult = {
  tag: 'ABC',
  role: 'Flex',
  scores: { reaction: 50, flick: 60, lastHit: 70, overall: 60 },
  metrics: {
    reaction: { medianMs: 231.4, trials: 10, falseStarts: 2 },
    flick: { throughput: 4.83, hits: 23, misses: 2 },
    lastHit: { lastHits: 14, early: 3, missed: 5, units: 19 },
  },
}

describe('card text', () => {
  it('shows the raw metric behind each score', () => {
    expect(metricLines(base)).toEqual({
      reaction: 'median 231 ms · 2 early',
      flick: '4.8 bit/s at 92% accuracy',
      lastHit: '14/19 last hits',
    })
  })
  it('handles empty drills', () => {
    const r = { ...base, metrics: { ...base.metrics, reaction: { medianMs: null, trials: 0, falseStarts: 0 }, flick: { throughput: 0, hits: 0, misses: 0 } } }
    expect(metricLines(r).reaction).toBe('no valid reaction')
    expect(metricLines(r).flick).toBe('no targets hit')
  })
  it('tips the weakest drill', () => {
    expect(tipFor(base)).toBe(TIPS.reaction)
    expect(tipFor({ ...base, scores: { ...base.scores, reaction: 90, flick: 20 } })).toBe(TIPS.flick)
    expect(tipFor({ ...base, scores: { ...base.scores, reaction: 90, lastHit: 10 } })).toBe(TIPS.lastHit)
  })
})

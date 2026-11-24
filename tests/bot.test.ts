import { describe, expect, it } from 'vitest'
import { playHeadless, type BotLevel } from '../src/bot'
import { median } from '../src/scoring'

function overallMedian(level: BotLevel, n: number) {
  const xs = Array.from({ length: n }, (_, i) => playHeadless(level, 1000 + i).scores.overall)
  return median(xs)!
}

describe('bot balance', () => {
  it('better bots score higher, over most of the range', () => {
    const casual = overallMedian('casual', 50)
    const average = overallMedian('average', 50)
    const sharp = overallMedian('sharp', 50)
    expect(casual).toBeLessThan(average)
    expect(average).toBeLessThan(sharp)
    expect(sharp).toBeGreaterThanOrEqual(60)
    expect(casual).toBeLessThanOrEqual(45)
  }, 60000)
  it('a headless run completes all three drills', () => {
    const r = playHeadless('average', 7)
    expect(r.metrics.reaction.trials).toBeGreaterThan(5)
    expect(r.metrics.flick.hits).toBeGreaterThan(10)
    expect(r.metrics.lastHit.units).toBeGreaterThan(3)
  })
})

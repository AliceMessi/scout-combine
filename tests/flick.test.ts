import { describe, expect, it } from 'vitest'
import { createFlick, radiusAt } from '../src/drills/flick'
import { mulberry32 } from '../src/rng'
import { fittsTp } from '../src/scoring'

const at = (x: number, y: number) => ({ x, y, source: 'pointer' as const })
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y)

describe('Flick drill', () => {
  it('radius shrinks linearly from 36 to 16.2', () => {
    expect(radiusAt(0)).toBeCloseTo(36)
    expect(radiusAt(35000)).toBeCloseTo(16.2)
    expect(radiusAt(17500)).toBeCloseTo(26.1)
  })
  it('the first target is at least 400 from the centre', () => {
    const t = createFlick(mulberry32(1)).view().target
    expect(dist(t, { x: 800, y: 450 })).toBeGreaterThanOrEqual(400)
  })
  it('every new target is a flick away and fully inside the play area', () => {
    const d = createFlick(mulberry32(3))
    let prev = d.view().target
    for (let i = 0; i < 1000; i++) {
      d.step(1, [at(prev.x, prev.y)])
      const t = d.view().target
      expect(dist(t, prev)).toBeGreaterThanOrEqual(400)
      expect(t.x - t.r).toBeGreaterThanOrEqual(0)
      expect(t.y - t.r).toBeGreaterThanOrEqual(100) // clear of the timer
      expect(t.y + t.r).toBeLessThanOrEqual(820) // clear of the stats line
      expect(t.x + t.r).toBeLessThanOrEqual(1600)
      expect(t.y + t.r).toBeLessThanOrEqual(900)
      prev = t
    }
    expect(d.metrics().hits).toBe(1000)
  })
  it('a click inside is a hit, outside is a miss that keeps the target', () => {
    const d = createFlick(mulberry32(5))
    const t = d.view().target
    d.step(100, [at(t.x + t.r + 5, t.y)])
    expect(d.metrics()).toMatchObject({ hits: 0, misses: 1 })
    expect(d.view().target).toEqual(t)
    d.step(100, [at(t.x + t.r - 1, t.y)])
    expect(d.metrics()).toMatchObject({ hits: 1, misses: 1 })
    expect(d.view().lastHit).toEqual({ x: t.x + t.r - 1, y: t.y })
  })
  it('ignores key presses', () => {
    const d = createFlick(mulberry32(5))
    const t = d.view().target
    d.step(100, [{ x: t.x, y: t.y, source: 'key' }])
    expect(d.metrics()).toMatchObject({ hits: 0, misses: 0 })
  })
  it('throughput is the mean Fitts TP over hits', () => {
    const d = createFlick(mulberry32(9))
    const t1 = d.view().target
    d.step(500, [at(t1.x, t1.y)])
    const tp1 = fittsTp(dist(t1, { x: 800, y: 450 }), 2 * t1.r, 500)
    const t2 = d.view().target
    d.step(800, [at(t2.x, t2.y)])
    const tp2 = fittsTp(dist(t2, t1), 2 * t2.r, 800)
    expect(d.metrics().throughput).toBeCloseTo((tp1 + tp2) / 2, 6)
  })
  it('throughput is 0 with no hits; ends after 35 s', () => {
    const d = createFlick(mulberry32(2))
    expect(d.metrics().throughput).toBe(0)
    d.step(34999, [])
    expect(d.done()).toBe(false)
    d.step(1, [])
    expect(d.done()).toBe(true)
    const t = d.view().target
    d.step(10, [at(t.x, t.y)])
    expect(d.metrics().hits).toBe(0)
  })
})

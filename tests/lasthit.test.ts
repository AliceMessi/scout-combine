import { describe, expect, it } from 'vitest'
import { createLastHit } from '../src/drills/lasthit'
import type { Press } from '../src/drills/types'

const P: Press = { x: 800, y: 450, source: 'pointer' }
const K: Press = { x: 0, y: 0, source: 'key' }
// rng always 0.5: every unit gets allies hitting for exactly 20 hp every 450 ms
// (interval 350 + 0.5 * 200, no jitter; chunk 18 + 0.5 * 4, no jitter).
// hp: 100 -> 80 @450 -> 60 @900 -> 40 @1350 -> 20 @1800 -> dead @2250
const half = () => 0.5

describe('Last Hit drill', () => {
  it('allies kill an untouched unit: missed', () => {
    const d = createLastHit(half)
    d.step(2249, [])
    expect(d.view().hp).toBe(20)
    d.step(1, [])
    expect(d.metrics()).toEqual({ lastHits: 0, early: 0, missed: 1, units: 1 })
    expect(d.view().lastOutcome).toBe('missed')
  })
  it('an early shot takes 30 hp and starts an 800 ms cooldown when it lands', () => {
    const d = createLastHit(half)
    d.step(0, [P])
    d.step(100, [P]) // shot already in flight: ignored
    d.step(250, [])
    expect(d.view().hp).toBe(70)
    expect(d.metrics().early).toBe(1)
    expect(d.view().lastOutcome).toBe('early')
    d.step(550, [P]) // t = 900, cooldown until 1150: ignored
    expect(d.view().shotInFlightMs).toBeNull()
    d.step(250, [P]) // t = 1150: fires
    expect(d.view().shotInFlightMs).toBe(350)
  })
  it('a shot landing at or under the mark is a last hit', () => {
    const d = createLastHit(half)
    d.step(1500, [P]) // lands at 1850, after the 1800 ally hit: hp 20
    d.step(350, [])
    expect(d.metrics()).toEqual({ lastHits: 1, early: 0, missed: 0, units: 1 })
    expect(d.view().lastOutcome).toBe('last')
  })
  it('a shot landing with an ally hit lands first', () => {
    const d = createLastHit(half)
    d.step(1000, [P]) // lands at 1350 with hp 60 -> early (30), then the ally hit -> 10
    d.step(350, [])
    expect(d.metrics().early).toBe(1)
    expect(d.view().hp).toBe(10)
  })
  it('allies stealing the kill while the shot flies: missed, shot discarded', () => {
    const d = createLastHit(half)
    d.step(2000, [P]) // would land at 2350; allies kill at 2250
    d.step(400, [])
    expect(d.metrics()).toEqual({ lastHits: 0, early: 0, missed: 1, units: 1 })
    expect(d.view().shotInFlightMs).toBeNull()
  })
  it('the action key fires too', () => {
    const d = createLastHit(half)
    d.step(1500, [K])
    d.step(350, [])
    expect(d.metrics().lastHits).toBe(1)
  })
  it('a new unit comes 300 ms after a death', () => {
    const d = createLastHit(half)
    d.step(1500, [P])
    d.step(350, []) // dies at 1850
    expect(d.view().hp).toBe(0)
    d.step(299, [])
    expect(d.view().hp).toBe(0)
    d.step(1, [])
    expect(d.view().hp).toBe(100)
  })
  it('ends after 35 s; units still alive are not counted', () => {
    const d = createLastHit(half)
    d.step(34999, [])
    expect(d.done()).toBe(false)
    d.step(1, [])
    expect(d.done()).toBe(true)
    const m = d.metrics()
    expect(m.units).toBe(m.lastHits + m.missed)
    // 2250 ms to die + 300 ms gap = 2550 per unit -> 13 deaths in 35 s
    expect(m.units).toBe(13)
    d.step(10, [P])
    expect(d.metrics()).toEqual(m)
  })
})

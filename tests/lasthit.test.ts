import { describe, expect, it } from 'vitest'
import { createLastHit } from '../src/drills/lasthit'
import type { Press } from '../src/drills/types'

const P: Press = { x: 800, y: 450, source: 'pointer' }
const K: Press = { x: 0, y: 0, source: 'key' }
const zero = () => 0 // ally chunks of 8 hp every 400 ms

describe('Last Hit drill', () => {
  it('allies kill an untouched unit: missed', () => {
    const d = createLastHit(zero)
    d.step(5199, [])
    expect(d.view().hp).toBe(4)
    d.step(1, [])
    expect(d.metrics()).toEqual({ lastHits: 0, early: 0, missed: 1, units: 1 })
    expect(d.view().lastOutcome).toBe('missed')
  })
  it('an early shot takes 30 hp and starts an 800 ms cooldown when it lands', () => {
    const d = createLastHit(zero)
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
    const d = createLastHit(zero)
    d.step(3600, [P]) // 9 ally hits: hp 28 when the shot lands at 3950
    expect(d.view().hp).toBe(28)
    d.step(350, [])
    expect(d.metrics()).toEqual({ lastHits: 1, early: 0, missed: 0, units: 1 })
    expect(d.view().lastOutcome).toBe('last')
  })
  it('allies stealing the kill while the shot flies: missed, shot discarded', () => {
    const d = createLastHit(zero)
    d.step(5000, [P]) // hp 4 at 5000, allies kill at 5200, shot would land at 5350
    d.step(400, [])
    expect(d.metrics()).toEqual({ lastHits: 0, early: 0, missed: 1, units: 1 })
    expect(d.view().shotInFlightMs).toBeNull()
  })
  it('the action key fires too', () => {
    const d = createLastHit(zero)
    d.step(3600, [K])
    d.step(350, [])
    expect(d.metrics().lastHits).toBe(1)
  })
  it('a new unit comes 300 ms after a death', () => {
    const d = createLastHit(zero)
    d.step(3600, [P])
    d.step(350, []) // dies at 3950
    expect(d.view().hp).toBe(0)
    d.step(299, [])
    expect(d.view().hp).toBe(0)
    d.step(1, [])
    expect(d.view().hp).toBe(100)
  })
  it('ends after 35 s; units still alive are not counted', () => {
    const d = createLastHit(zero)
    d.step(34999, [])
    expect(d.done()).toBe(false)
    d.step(1, [])
    expect(d.done()).toBe(true)
    const m = d.metrics()
    expect(m.units).toBe(m.lastHits + m.missed)
    // 5200 ms to die + 300 ms gap = 5500 per unit -> 6 deaths in 35 s
    expect(m.units).toBe(6)
    d.step(10, [P])
    expect(d.metrics()).toEqual(m)
  })
})

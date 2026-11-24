import type { Rng } from '../rng'
import { fittsTp } from '../scoring'
import { PLAY_H, PLAY_W, type Drill, type DrillEvent } from './types'

export type FlickMetrics = { throughput: number; hits: number; misses: number }
export type Target = { x: number; y: number; r: number }
export type FlickView = { target: Target; remainingMs: number; lastHit: { x: number; y: number } | null }

export const FLICK_MS = 35000
const MIN_JUMP = 0.25 * PLAY_W // 400
const R0 = 0.04 * PLAY_H // 36
const R1 = 0.018 * PLAY_H // 16.2

/** Target radius for a target spawned at game time t. */
export function radiusAt(t: number): number {
  const k = Math.min(1, Math.max(0, t / FLICK_MS))
  return R0 + (R1 - R0) * k
}

export function createFlick(rng: Rng): Drill<FlickMetrics, FlickView> {
  let t = 0
  let hits = 0
  let misses = 0
  let tpSum = 0
  let lastHit: FlickView['lastHit'] = null
  let prev = { x: PLAY_W / 2, y: PLAY_H / 2 }
  let target = spawn(prev, 0)
  let spawnedAt = 0

  function spawn(from: { x: number; y: number }, now: number): Target {
    const r = radiusAt(now)
    for (let i = 0; i < 200; i++) {
      const x = r + rng() * (PLAY_W - 2 * r)
      const y = r + rng() * (PLAY_H - 2 * r)
      if (Math.hypot(x - from.x, y - from.y) >= MIN_JUMP) return { x, y, r }
    }
    // Fallback (practically unreachable): the corner farthest from `from`.
    const x = from.x < PLAY_W / 2 ? PLAY_W - r : r
    const y = from.y < PLAY_H / 2 ? PLAY_H - r : r
    return { x, y, r }
  }
  const done = () => t >= FLICK_MS

  return {
    name: 'flick',
    durationMs: FLICK_MS,
    step(dtMs, presses) {
      const events: DrillEvent[] = []
      if (done()) return events
      t = Math.min(FLICK_MS, t + dtMs)
      if (done()) return events
      for (const p of presses) {
        if (p.source !== 'pointer') continue
        if (Math.hypot(p.x - target.x, p.y - target.y) <= target.r) {
          const d = Math.hypot(target.x - prev.x, target.y - prev.y)
          tpSum += fittsTp(d, 2 * target.r, Math.max(1, t - spawnedAt))
          hits++
          lastHit = { x: p.x, y: p.y }
          events.push({ type: 'hit', x: target.x, y: target.y, r: target.r })
          prev = { x: target.x, y: target.y }
          target = spawn(prev, t)
          spawnedAt = t
        } else {
          misses++
          events.push({ type: 'miss', x: p.x, y: p.y })
        }
      }
      return events
    },
    done,
    metrics: () => ({ throughput: hits ? tpSum / hits : 0, hits, misses }),
    view: () => ({ target, remainingMs: Math.max(0, FLICK_MS - t), lastHit }),
  }
}

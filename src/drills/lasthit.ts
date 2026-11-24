import type { Rng } from '../rng'
import type { Drill, DrillEvent } from './types'

export type LastHitMetrics = { lastHits: number; early: number; missed: number; units: number }
export type LastHitView = {
  hp: number // 0-100; 0 while no unit is in the lane
  markHp: number // the player's damage: at or under this, a landing shot is a last hit
  shotInFlightMs: number | null // ms until the player's shot lands
  cooldownMs: number
  remainingMs: number
  lastOutcome: 'last' | 'early' | 'missed' | null
  unitId: number // increases with every new unit (for animation)
  unitAgeMs: number // ms since the current unit (or the gap) started
}

export const LASTHIT_MS = 35000
export const MARK_HP = 30
export const WINDUP_MS = 350
const COOLDOWN_MS = 800
const GAP_MS = 300

export function createLastHit(rng: Rng): Drill<LastHitMetrics, LastHitView> {
  let t = 0
  let hp = 100
  let alive = true
  let unitId = 1
  let unitStart = 0
  let nextAlly = allyInterval(0)
  let spawnAt = Infinity
  let shotAt: number | null = null
  let cooldownUntil = 0
  let lastOutcome: LastHitView['lastOutcome'] = null
  const m: LastHitMetrics = { lastHits: 0, early: 0, missed: 0, units: 0 }

  function allyInterval(from: number) {
    return from + 400 + rng() * 500
  }
  function die(at: number, outcome: 'last' | 'missed', events: DrillEvent[]) {
    alive = false
    hp = 0
    m.units++
    if (outcome === 'last') m.lastHits++
    else m.missed++
    lastOutcome = outcome
    shotAt = null
    spawnAt = at + GAP_MS
    unitStart = at
    events.push({ type: outcome })
  }
  const done = () => t >= LASTHIT_MS

  return {
    name: 'lasthit',
    durationMs: LASTHIT_MS,
    step(dtMs, presses) {
      const events: DrillEvent[] = []
      if (done()) return events
      const end = Math.min(LASTHIT_MS, t + dtMs)
      // Process timed events in order up to `end`. A landing shot goes before an ally hit at the same instant.
      for (;;) {
        const land = shotAt ?? Infinity
        const ally = alive ? nextAlly : Infinity
        const spawn = alive ? Infinity : spawnAt
        const next = Math.min(land, ally, spawn)
        if (next > end) break
        if (next === land && alive) {
          shotAt = null
          if (hp <= MARK_HP) die(land, 'last', events)
          else {
            hp -= MARK_HP
            m.early++
            lastOutcome = 'early'
            cooldownUntil = land + COOLDOWN_MS
            events.push({ type: 'early' })
          }
        } else if (next === ally) {
          hp -= 8 + rng() * 12
          if (hp <= 0) die(ally, 'missed', events)
          else nextAlly = allyInterval(ally)
        } else {
          alive = true
          hp = 100
          unitId++
          unitStart = spawn
          nextAlly = allyInterval(spawn)
          events.push({ type: 'spawn' })
        }
      }
      t = end
      if (done()) return events
      for (const _ of presses) {
        if (alive && shotAt === null && t >= cooldownUntil) {
          shotAt = t + WINDUP_MS
          events.push({ type: 'shoot' })
        }
      }
      return events
    },
    done,
    metrics: () => ({ ...m }),
    view: () => ({
      hp: Math.max(0, hp),
      markHp: MARK_HP,
      shotInFlightMs: shotAt === null ? null : shotAt - t,
      cooldownMs: Math.max(0, cooldownUntil - t),
      remainingMs: Math.max(0, LASTHIT_MS - t),
      lastOutcome,
      unitId,
      unitAgeMs: t - unitStart,
    }),
  }
}

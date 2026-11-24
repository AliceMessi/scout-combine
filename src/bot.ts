import type { FlickView } from './drills/flick'
import type { LastHitView } from './drills/lasthit'
import type { ReactionView } from './drills/reaction'
import type { DrillName, Press } from './drills/types'
import { mulberry32, type Rng } from './rng'
import { createRun, type Run, type RunResult } from './run'
import { TAG_LAYOUT } from './tag'

export type BotLevel = 'casual' | 'average' | 'sharp'

const LEVELS = {
  casual: { rtMean: 330, rtSd: 60, early: 0.1, tp: 3.0, miss: 0.15, timingSd: 150 },
  average: { rtMean: 260, rtSd: 40, early: 0.05, tp: 4.5, miss: 0.08, timingSd: 70 },
  sharp: { rtMean: 200, rtSd: 25, early: 0.02, tp: 6.0, miss: 0.03, timingSd: 30 },
}

const WINDUP = 350

export interface Bot {
  presses(drill: DrillName, view: ReactionView | FlickView | LastHitView, nowMs: number): Press[]
}

export function createBot(level: BotLevel, rng: Rng): Bot {
  const L = LEVELS[level]
  const gauss = () => {
    const u = Math.max(1e-9, rng())
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng())
  }
  // reaction state
  let rPhase = ''
  let pressAt: number | null = null
  // flick state
  let targetKey = ''
  let from = { x: 800, y: 450 }
  let flickAt = 0
  let willMiss = false
  // last hit state: the bot reads the ally rhythm from the health drops it sees
  let unit = -1
  let lastHp = 100
  let lastDrop = 0
  let interval = 550
  let chunk = 12
  let drops = 0
  let fireAt: number | null = null

  return {
    presses(drill, view, now) {
      const at = (x: number, y: number): Press[] => [{ x, y, source: 'pointer' }]
      if (drill === 'reaction') {
        const v = view as ReactionView
        if (v.phase !== rPhase) {
          rPhase = v.phase
          pressAt = null
          if (v.phase === 'wait' && rng() < L.early) pressAt = now + 300 + rng() * 700
          if (v.phase === 'signal') pressAt = now + Math.max(120, L.rtMean + gauss() * L.rtSd)
        }
        if (pressAt !== null && now >= pressAt) {
          pressAt = null
          return at(800, 470)
        }
        return []
      }
      if (drill === 'flick') {
        const v = view as FlickView
        const t = v.target
        const key = `${t.x},${t.y}`
        if (key !== targetKey) {
          targetKey = key
          const d = Math.hypot(t.x - from.x, t.y - from.y)
          const tp = Math.max(1, L.tp + gauss() * 0.4)
          // Solve the Fitts throughput for the movement time.
          flickAt = now + (Math.log2(d / (2 * t.r) + 1) / tp) * 1000
          willMiss = rng() < L.miss
        }
        if (now >= flickAt) {
          if (willMiss) {
            willMiss = false
            flickAt = now + 250
            return at(t.x + t.r + 12, t.y)
          }
          from = { x: t.x, y: t.y }
          return at(t.x, t.y)
        }
        return []
      }
      const v = view as LastHitView
      if (v.unitId !== unit) {
        unit = v.unitId
        lastHp = v.hp
        lastDrop = now
        drops = 0
        fireAt = null
      }
      if (v.hp < lastHp - 0.01) {
        const d = lastHp - v.hp
        if (d < 29.99 && v.hp > 0) { // an ally hit (not our 30 hp shot, not the death)
          if (drops > 0) interval = now - lastDrop
          chunk = d
          drops++
          lastDrop = now
          fireAt = null
        }
        lastHp = v.hp
      }
      if (v.hp <= 0 || v.shotInFlightMs !== null || v.cooldownMs > 0) return []
      if (fireAt === null) {
        const nextAlly = lastDrop + interval
        const after = v.hp - chunk
        let land: number
        if (v.hp <= v.markHp) land = after <= 0 ? Math.min(now + WINDUP, nextAlly - 40) : now + WINDUP
        else if (after <= v.markHp) land = nextAlly + 60
        else land = nextAlly + interval + 60 // wait for a later hit
        fireAt = land - WINDUP + gauss() * L.timingSd
      }
      if (now >= fireAt) {
        fireAt = null
        return at(1060, 560)
      }
      return []
    },
  }
}

/** Play one full run with a bot, no rendering, in 8 ms steps. Used by the balance check. */
export function playHeadless(level: BotLevel, seed: number): RunResult {
  const rng = mulberry32(seed)
  const bot = createBot(level, mulberry32(seed ^ 0x9e3779b9))
  const run = createRun(rng, 'BOT')
  run.step(8, [{ x: TAG_LAYOUT.go.x, y: TAG_LAYOUT.go.y, source: 'pointer' }], [])
  let now = 0
  for (let i = 0; i < 40000 && run.phase !== 'card'; i++) {
    now += 8
    const d = run.current()
    const presses = d && run.drill ? bot.presses(run.drill, d.view(), now) : []
    run.step(8, presses, [])
  }
  const r = run.result()
  if (!r) throw new Error(`headless run ended in phase ${run.phase}`)
  return r
}


const GO_PRESS: Press = { x: TAG_LAYOUT.go.x, y: TAG_LAYOUT.go.y, source: 'pointer' }

/** Presses a bot makes for a whole run: GO on the tag screen, the drills, and leaving the card after 2 s. */
export function autoPresses(run: Run, bot: Bot, now: number): Press[] {
  if (run.phase === 'tag') return [GO_PRESS]
  if (run.phase === 'card') return run.phaseMs >= 2000 ? [{ x: 800, y: 450, source: 'pointer' }] : []
  const d = run.current()
  return d && run.drill ? bot.presses(run.drill, d.view(), now) : []
}

import { createFlick, type FlickMetrics, type FlickView } from './drills/flick'
import { createLastHit, type LastHitMetrics, type LastHitView } from './drills/lasthit'
import { createReaction, type ReactionMetrics, type ReactionView } from './drills/reaction'
import type { Drill, DrillEvent, DrillName, Press } from './drills/types'
import type { Arrow } from './input'
import type { Rng } from './rng'
import { flickScore, lastHitScore, overallScore, reactionScore, roleOf, type Role, type Scores } from './scoring'
import { isAllowedTag, tagHitTest } from './tag'

export type RunPhase = 'tag' | 'rule' | 'drill' | 'card' | 'over' | 'abandoned'
export const RULE_MS = 2000
export const CARD_MS = 20000
export const CARD_GUARD_MS = 800
export const IDLE_MS = 15000
export const DRILL_ORDER: DrillName[] = ['reaction', 'flick', 'lasthit']

export type RunMetrics = { reaction: ReactionMetrics; flick: FlickMetrics; lastHit: LastHitMetrics }
export interface RunResult {
  tag: string
  scores: Scores & { overall: number }
  role: Role
  metrics: RunMetrics
}
export type AnyDrill =
  | Drill<ReactionMetrics, ReactionView>
  | Drill<FlickMetrics, FlickView>
  | Drill<LastHitMetrics, LastHitView>
export type TagState = { letters: string[]; cursor: number; invalid: boolean }

export interface Run {
  readonly phase: RunPhase
  readonly drill: DrillName | null
  readonly drillIndex: number
  readonly phaseMs: number
  readonly tag: TagState
  current(): AnyDrill | null
  step(dtMs: number, presses: Press[], arrows: Arrow[]): DrillEvent[]
  result(): RunResult | null
}

const A = 'A'.charCodeAt(0)
const shift = (ch: string, d: number) => String.fromCharCode(A + ((ch.charCodeAt(0) - A + d + 26) % 26))

export function createRun(rng: Rng, lastTag: string): Run {
  let phase: RunPhase = 'tag'
  let drillIndex = 0
  let phaseMs = 0
  let idleMs = 0
  let drill: AnyDrill | null = null
  const tag: TagState = { letters: (isAllowedTag(lastTag) ? lastTag : 'AAA').split(''), cursor: 0, invalid: false }
  const metrics: Partial<RunMetrics> = {}
  let result: RunResult | null = null

  function go(p: RunPhase, events: DrillEvent[]) {
    phase = p
    phaseMs = 0
    idleMs = 0
    events.push({ type: 'phase', phase: p, drill: p === 'rule' || p === 'drill' ? DRILL_ORDER[drillIndex] : null })
  }
  function makeDrill(name: DrillName): AnyDrill {
    return name === 'reaction' ? createReaction(rng) : name === 'flick' ? createFlick(rng) : createLastHit(rng)
  }
  function finish() {
    const m = metrics as RunMetrics
    const s: Scores = {
      reaction: reactionScore(m.reaction.medianMs, m.reaction.falseStarts),
      flick: flickScore(m.flick.throughput, m.flick.hits, m.flick.misses),
      lastHit: lastHitScore(m.lastHit.lastHits, m.lastHit.units),
    }
    result = { tag: tag.letters.join(''), scores: { ...s, overall: overallScore(s) }, role: roleOf(s), metrics: m }
  }

  return {
    get phase() { return phase },
    get drill() { return phase === 'rule' || phase === 'drill' ? DRILL_ORDER[drillIndex] : null },
    get drillIndex() { return drillIndex },
    get phaseMs() { return phaseMs },
    tag,
    current: () => (phase === 'drill' ? drill : null),
    result: () => result,
    step(dtMs, presses, arrows) {
      const events: DrillEvent[] = []
      phaseMs += dtMs
      idleMs = presses.length || arrows.length ? 0 : idleMs + dtMs
      switch (phase) {
        case 'tag': {
          for (const a of arrows) {
            if (a === 'left') tag.cursor = (tag.cursor + 2) % 3
            else if (a === 'right') tag.cursor = (tag.cursor + 1) % 3
            else tag.letters[tag.cursor] = shift(tag.letters[tag.cursor], a === 'up' ? 1 : -1)
            tag.invalid = false
          }
          for (const p of presses) {
            const hit = p.source === 'key' ? { kind: 'go' as const } : tagHitTest(p.x, p.y)
            if (!hit) continue
            if (hit.kind === 'go') {
              if (isAllowedTag(tag.letters.join(''))) {
                drillIndex = 0
                go('rule', events)
                return events
              }
              tag.invalid = true
              events.push({ type: 'refused' })
            } else {
              tag.cursor = hit.i
              tag.letters[hit.i] = shift(tag.letters[hit.i], hit.kind === 'up' ? 1 : -1)
              tag.invalid = false
              events.push({ type: 'tick' })
            }
          }
          if (idleMs >= IDLE_MS) go('abandoned', events)
          break
        }
        case 'rule':
          if (phaseMs >= RULE_MS) {
            drill = makeDrill(DRILL_ORDER[drillIndex])
            go('drill', events)
          }
          break
        case 'drill': {
          const d = drill!
          events.push(...d.step(dtMs, presses))
          if (d.done()) {
            if (d.name === 'reaction') metrics.reaction = d.metrics() as ReactionMetrics
            else if (d.name === 'flick') metrics.flick = d.metrics() as FlickMetrics
            else metrics.lastHit = d.metrics() as LastHitMetrics
            drill = null
            if (drillIndex < DRILL_ORDER.length - 1) {
              drillIndex++
              go('rule', events)
            } else {
              finish()
              go('card', events)
            }
          } else if (idleMs >= IDLE_MS) go('abandoned', events)
          break
        }
        case 'card':
          if (phaseMs >= CARD_MS || (presses.length > 0 && phaseMs >= CARD_GUARD_MS)) go('over', events)
          break
      }
      return events
    },
  }
}

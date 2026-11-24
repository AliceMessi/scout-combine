import type { Rng } from '../rng'
import { median } from '../scoring'
import type { Drill, DrillEvent } from './types'

export type ReactionMetrics = { medianMs: number | null; trials: number; falseStarts: number }
export type ReactionView = { phase: 'wait' | 'signal' | 'feedback'; lastMs: number | null; tooEarly: boolean; remainingMs: number }

export const REACTION_MS = 30000
const FEEDBACK_MS = 600
const MIN_VALID_MS = 100

export function createReaction(rng: Rng): Drill<ReactionMetrics, ReactionView> {
  let t = 0
  let phase: ReactionView['phase'] = 'wait'
  let phaseEnd = nextDelay() // wait: when the signal shows; feedback: when the next wait starts
  let signalAt = 0
  let lastMs: number | null = null
  let tooEarly = false
  let falseStarts = 0
  const times: number[] = []

  function nextDelay() {
    return 1000 + rng() * 2000
  }
  const done = () => t >= REACTION_MS

  return {
    name: 'reaction',
    durationMs: REACTION_MS,
    step(dtMs, presses) {
      const events: DrillEvent[] = []
      if (done()) return events
      t = Math.min(REACTION_MS, t + dtMs)
      // phase changes that happened during dt
      for (;;) {
        if (phase === 'wait' && t >= phaseEnd) {
          phase = 'signal'
          signalAt = phaseEnd
          events.push({ type: 'signal' })
        } else if (phase === 'feedback' && t >= phaseEnd) {
          phase = 'wait'
          phaseEnd = phaseEnd + nextDelay()
          tooEarly = false
        } else break
      }
      if (done()) return events
      for (const _ of presses) {
        if (phase === 'wait') {
          falseStarts++
          tooEarly = true
          phase = 'feedback'
          phaseEnd = t + FEEDBACK_MS
          events.push({ type: 'early' })
        } else if (phase === 'signal') {
          const ms = t - signalAt
          phase = 'feedback'
          phaseEnd = t + FEEDBACK_MS
          if (ms < MIN_VALID_MS) {
            falseStarts++
            tooEarly = true
            events.push({ type: 'early' })
          } else {
            times.push(ms)
            lastMs = ms
            events.push({ type: 'hit', ms })
          }
        }
        // presses during feedback are ignored
      }
      return events
    },
    done,
    metrics: () => ({ medianMs: median(times), trials: times.length, falseStarts }),
    view: () => ({ phase, lastMs, tooEarly, remainingMs: Math.max(0, REACTION_MS - t) }),
  }
}

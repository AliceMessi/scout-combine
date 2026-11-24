import type { RunResult } from './run'

export const TIPS = {
  reaction: "Don't guess the signal: every early press costs 5 points.",
  flick: 'Move first, then click: a miss costs more than a slow hit.',
  lastHit: 'Your shot takes 350 ms. Fire when the bar is one ally hit above your line.',
} as const

/** The tip for the weakest drill (ties: Reaction, then Flick, then Last Hit). */
export function tipFor(r: RunResult): string {
  const s = r.scores
  const worst = s.reaction <= s.flick && s.reaction <= s.lastHit ? 'reaction' : s.flick <= s.lastHit ? 'flick' : 'lastHit'
  return TIPS[worst]
}

/** The raw measurement behind each score, so the score is never a black box. */
export function metricLines(r: RunResult): { reaction: string; flick: string; lastHit: string } {
  const { reaction: re, flick: fl, lastHit: lh } = r.metrics
  const shots = fl.hits + fl.misses
  return {
    reaction:
      re.medianMs === null
        ? 'no valid reaction'
        : `median ${Math.round(re.medianMs)} ms` + (re.falseStarts ? ` · ${re.falseStarts} early` : ''),
    flick: shots === 0 ? 'no targets hit' : `${fl.throughput.toFixed(1)} bit/s at ${Math.round((100 * fl.hits) / shots)}% accuracy`,
    lastHit: `${lh.lastHits}/${lh.units} last hits`,
  }
}

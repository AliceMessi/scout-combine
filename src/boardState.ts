import type { LiveMsg } from './live'
import type { RunRecord } from './store'

function compareRuns(
  a: RunRecord,
  b: RunRecord,
  scoreGetter: (r: RunRecord) => number,
): number {
  const scoreDiff = scoreGetter(b) - scoreGetter(a)
  if (scoreDiff !== 0) return scoreDiff
  const timeDiff = a.endedAt - b.endedAt
  if (timeDiff !== 0) return timeDiff
  return a.id.localeCompare(b.id)
}

function drillLabel(drill: 'reaction' | 'flick' | 'lasthit'): string {
  switch (drill) {
    case 'reaction':
      return 'REACTION'
    case 'flick':
      return 'FLICK'
    case 'lasthit':
      return 'LAST HIT'
  }
}

export function boardState(
  today: RunRecord[],
  live: LiveMsg | null,
): {
  top: RunRecord[]
  best: { reaction: RunRecord | null; flick: RunRecord | null; lastHit: RunRecord | null }
  count: number
  nowPlaying: string | null
} {
  const sortedOverall = [...today].sort((a, b) =>
    compareRuns(a, b, r => r.scores.overall),
  )

  const top = sortedOverall.slice(0, 10)

  let bestReaction: RunRecord | null = null
  let bestFlick: RunRecord | null = null
  let bestLastHit: RunRecord | null = null

  if (today.length > 0) {
    bestReaction = [...today].sort((a, b) =>
      compareRuns(a, b, r => r.scores.reaction),
    )[0]
    bestFlick = [...today].sort((a, b) =>
      compareRuns(a, b, r => r.scores.flick),
    )[0]
    bestLastHit = [...today].sort((a, b) =>
      compareRuns(a, b, r => r.scores.lastHit),
    )[0]
  }

  let nowPlaying: string | null = null
  if (live) {
    if (live.type === 'drill') {
      nowPlaying = `${live.tag} \u2014 ${drillLabel(live.drill)}`
    } else if (live.type === 'run-start') {
      nowPlaying = live.tag
    } else if (live.type === 'run-end' || live.type === 'idle') {
      nowPlaying = null
    }
  }

  return {
    top,
    best: {
      reaction: bestReaction,
      flick: bestFlick,
      lastHit: bestLastHit,
    },
    count: today.length,
    nowPlaying,
  }
}

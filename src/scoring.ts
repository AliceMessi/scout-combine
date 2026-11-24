export type Scores = { reaction: number; flick: number; lastHit: number }
export type Role = 'Opener' | 'Marksman' | 'Finisher' | 'Flex'

const clamp100 = (v: number) => Math.min(100, Math.max(0, v))

/** Median 150 ms -> 100, 400 ms -> 0, minus 5 per false start. */
export function reactionScore(medianMs: number | null, falseStarts: number): number {
  if (medianMs === null) return 0
  const base = clamp100(((400 - medianMs) / 250) * 100)
  return Math.round(Math.max(0, base - 5 * falseStarts))
}

/** Mean throughput 2.5 bit/s -> 0, 6.5 bit/s -> 100, times accuracy. Fewer than 3 hits -> 0. */
export function flickScore(meanTp: number, hits: number, misses: number): number {
  if (hits < 3) return 0
  const base = clamp100(((meanTp - 2.5) / 4) * 100)
  return Math.round(base * (hits / (hits + misses)))
}

export function lastHitScore(lastHits: number, units: number): number {
  if (units <= 0) return 0
  return Math.round(clamp100((100 * lastHits) / units))
}

/** Fitts throughput (Shannon formulation), bits per second. */
export function fittsTp(distance: number, width: number, mtMs: number): number {
  return Math.log2(distance / width + 1) / (mtMs / 1000)
}

export function overallScore(s: Scores): number {
  return Math.round((s.reaction + s.flick + s.lastHit) / 3)
}

export function roleOf(s: Scores): Role {
  const order: [number, Role][] = [[s.reaction, 'Opener'], [s.flick, 'Marksman'], [s.lastHit, 'Finisher']]
  const values = order.map(([v]) => v)
  if (Math.max(...values) - Math.min(...values) <= 10) return 'Flex'
  let best = order[0]
  for (const o of order) if (o[0] > best[0]) best = o
  return best[1]
}

/** Share (0-100) of today's runs with a lower overall score; null with fewer than 5 runs. */
export function percentile(overall: number, today: number[]): number | null {
  if (today.length < 5) return null
  return Math.round((100 * today.filter(x => x < overall).length) / today.length)
}

export function median(xs: number[]): number | null {
  if (xs.length === 0) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

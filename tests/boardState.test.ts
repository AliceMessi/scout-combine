import { describe, expect, it } from 'vitest'
import { boardState, dataStatus } from '../src/boardState'
import type { LiveMsg } from '../src/live'
import type { RunRecord } from '../src/store'

const rec = (
  id: string,
  endedAt: number,
  scores: { reaction: number; flick: number; lastHit: number; overall: number },
  tag = 'ABC',
): RunRecord => ({
  id,
  day: '2026-11-24',
  endedAt,
  tag,
  role: 'Flex',
  scores,
  metrics: {
    reaction: { medianMs: 250, trials: 9, falseStarts: 0 },
    flick: { throughput: 4.5, hits: 20, misses: 1 },
    lastHit: { lastHits: 8, early: 2, missed: 4, units: 12 },
  },
})

describe('boardState', () => {
  it('top sorted by scores.overall descending', () => {
    const r1 = rec('1', 1000, { reaction: 40, flick: 50, lastHit: 60, overall: 50 }, 'AAA')
    const r2 = rec('2', 2000, { reaction: 70, flick: 80, lastHit: 90, overall: 80 }, 'BBB')
    const r3 = rec('3', 3000, { reaction: 50, flick: 60, lastHit: 70, overall: 60 }, 'CCC')

    const state = boardState([r1, r2, r3], null)
    expect(state.top.map(r => r.id)).toEqual(['2', '3', '1'])
    expect(state.count).toBe(3)
  })

  it('ties keep earlier run first: equal overall -> smaller endedAt first, then smaller id', () => {
    const r1 = rec('b', 2000, { reaction: 50, flick: 50, lastHit: 50, overall: 50 }, 'BBB')
    const r2 = rec('a', 1000, { reaction: 50, flick: 50, lastHit: 50, overall: 50 }, 'AAA')
    const r3 = rec('c', 2000, { reaction: 50, flick: 50, lastHit: 50, overall: 50 }, 'CCC')
    const r4 = rec('d', 1000, { reaction: 50, flick: 50, lastHit: 50, overall: 50 }, 'DDD')

    const state = boardState([r1, r2, r3, r4], null)
    // Between r2 and r4 (endedAt 1000): 'a' < 'd' -> r2, then r4
    // Between r1 and r3 (endedAt 2000): 'b' < 'c' -> r1, then r3
    expect(state.top.map(r => r.id)).toEqual(['a', 'd', 'b', 'c'])
  })

  it('top capped at 10 when there are 12 runs; count is 12', () => {
    const runs = Array.from({ length: 12 }, (_, i) =>
      rec(String(i + 1), 1000 + i * 100, { reaction: i, flick: i, lastHit: i, overall: i * 5 }),
    )

    const state = boardState(runs, null)
    expect(state.top.length).toBe(10)
    expect(state.count).toBe(12)
    expect(state.top[0].id).toBe('12')
    expect(state.top[9].id).toBe('3')
  })

  it('best per drill picks the highest drill score (same tie rule)', () => {
    const r1 = rec('1', 1000, { reaction: 90, flick: 40, lastHit: 50, overall: 60 })
    const r2 = rec('2', 2000, { reaction: 90, flick: 85, lastHit: 40, overall: 72 })
    const r3 = rec('3', 1500, { reaction: 70, flick: 85, lastHit: 95, overall: 83 })
    const r4 = rec('4', 1200, { reaction: 60, flick: 30, lastHit: 95, overall: 62 })

    const state = boardState([r1, r2, r3, r4], null)
    // Reaction: r1 (endedAt 1000, score 90) vs r2 (endedAt 2000, score 90) -> r1 wins tie
    expect(state.best.reaction?.id).toBe('1')
    // Flick: r2 (endedAt 2000, score 85) vs r3 (endedAt 1500, score 85) -> r3 wins tie
    expect(state.best.flick?.id).toBe('3')
    // Last Hit: r3 (endedAt 1500, score 95) vs r4 (endedAt 1200, score 95) -> r4 wins tie
    expect(state.best.lastHit?.id).toBe('4')
  })

  it('nowPlaying displays current drill or tag or null', () => {
    const drillFlick: LiveMsg = { type: 'drill', tag: 'ABC', drill: 'flick' }
    expect(boardState([], drillFlick).nowPlaying).toBe('ABC — FLICK')

    const drillReaction: LiveMsg = { type: 'drill', tag: 'XYZ', drill: 'reaction' }
    expect(boardState([], drillReaction).nowPlaying).toBe('XYZ — REACTION')

    const drillLastHit: LiveMsg = { type: 'drill', tag: 'TOP', drill: 'lasthit' }
    expect(boardState([], drillLastHit).nowPlaying).toBe('TOP — LAST HIT')

    const runStart: LiveMsg = { type: 'run-start', tag: 'ABC' }
    expect(boardState([], runStart).nowPlaying).toBe('ABC')

    const r = rec('1', 1000, { reaction: 50, flick: 50, lastHit: 50, overall: 50 })
    const runEnd: LiveMsg = { type: 'run-end', record: r }
    expect(boardState([], runEnd).nowPlaying).toBeNull()

    const idle: LiveMsg = { type: 'idle' }
    expect(boardState([], idle).nowPlaying).toBeNull()

    expect(boardState([], null).nowPlaying).toBeNull()
  })

  it('new day shows empty board', () => {
    const state = boardState([], null)
    expect(state.top).toEqual([])
    expect(state.count).toBe(0)
    expect(state.best.reaction).toBeNull()
    expect(state.best.flick).toBeNull()
    expect(state.best.lastHit).toBeNull()
    expect(state.nowPlaying).toBeNull()
  })
})

describe('dataStatus', () => {
  it('a failed read before any good read is "unavailable", never an empty board', () => {
    expect(dataStatus(false, true)).toBe('unavailable')
  })
  it('a failed read after a good one keeps the data and says it is stale', () => {
    expect(dataStatus(true, true)).toBe('stale')
  })
  it('loading until the first read, ok after a good one', () => {
    expect(dataStatus(false, false)).toBe('loading')
    expect(dataStatus(true, false)).toBe('ok')
  })
})

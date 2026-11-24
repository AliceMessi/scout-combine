import { IDBFactory } from 'fake-indexeddb'
import { describe, expect, it } from 'vitest'
import { openStore, toCsv, type RunRecord } from '../src/store'

const rec = (id: string, day: string, overall = 50, tag = 'ABC'): RunRecord => ({
  id, day, endedAt: 1000, tag, role: 'Flex',
  scores: { reaction: 40, flick: 50, lastHit: 60, overall },
  metrics: {
    reaction: { medianMs: 250, trials: 9, falseStarts: 0 },
    flick: { throughput: 4.5, hits: 20, misses: 1 },
    lastHit: { lastHits: 8, early: 2, missed: 4, units: 12 },
  },
})

describe('store', () => {
  it('saves runs and reads them back by day', async () => {
    const s = await openStore(new IDBFactory())
    await s.save(rec('a', '2026-11-24'))
    await s.save(rec('b', '2026-11-24', 70))
    await s.save(rec('c', '2026-11-23'))
    const today = await s.byDay('2026-11-24')
    expect(today.map(r => r.id).sort()).toEqual(['a', 'b'])
    expect((await s.all()).length).toBe(3)
  })
  it('clears one day only', async () => {
    const s = await openStore(new IDBFactory())
    await s.save(rec('a', '2026-11-24'))
    await s.save(rec('c', '2026-11-23'))
    await s.clearDay('2026-11-24')
    expect((await s.all()).map(r => r.id)).toEqual(['c'])
  })
  it('a failed read rejects instead of returning an empty list', async () => {
    const s = await openStore(new IDBFactory())
    s.close()
    await expect(s.byDay('2026-11-24')).rejects.toBeTruthy()
  })
  it('opening a broken database rejects', async () => {
    const broken = {
      open() {
        const req: { onerror?: (e: unknown) => void; error?: unknown } = {}
        setTimeout(() => req.onerror?.(new Error('blocked')))
        return req
      },
    } as unknown as IDBFactory
    await expect(openStore(broken)).rejects.toBeTruthy()
  })
  it('exports CSV', () => {
    const csv = toCsv([rec('a', '2026-11-24', 70, 'XYZ')])
    expect(csv.split('\n')).toEqual([
      'id,day,endedAt,tag,role,overall,reaction,flick,lastHit',
      'a,2026-11-24,1000,XYZ,Flex,70,40,50,60',
    ])
  })
})

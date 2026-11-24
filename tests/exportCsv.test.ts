import { describe, expect, it, vi } from 'vitest'
import { csvFileName, exportCsv } from '../src/exportCsv'
import type { RunRecord, Store } from '../src/store'

const rec = (id: string, day: string): RunRecord => ({
  id,
  day,
  endedAt: 1000,
  tag: 'ABC',
  role: 'Flex',
  scores: { reaction: 40, flick: 50, lastHit: 60, overall: 50 },
  metrics: {
    reaction: { medianMs: 250, trials: 9, falseStarts: 0 },
    flick: { throughput: 4.5, hits: 20, misses: 1 },
    lastHit: { lastHits: 8, early: 2, missed: 4, units: 12 },
  },
})

function fakeStore(runs: RunRecord[] | (() => Promise<RunRecord[]>)): Store {
  return {
    save: vi.fn(),
    byDay: vi.fn(),
    all: typeof runs === 'function' ? runs : vi.fn().mockResolvedValue(runs),
    clearDay: vi.fn(),
    close: vi.fn(),
  }
}

describe('exportCsv', () => {
  it('formats filename from local day', () => {
    expect(csvFileName(new Date(2027, 0, 5, 23, 59))).toBe('scout-combine-2027-01-05.csv')
  })

  it('downloads runs through blob URL and temporary anchor', async () => {
    const runs = [rec('r1', '2027-01-05'), rec('r2', '2027-01-05')]
    const store = fakeStore(runs)

    const createObjectURL = vi.fn().mockReturnValue('blob:test-url')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL })

    const clickSpy = vi.fn()
    const removeSpy = vi.fn()
    const anchor = {
      href: '',
      download: '',
      click: clickSpy,
      remove: removeSpy,
    } as unknown as HTMLAnchorElement

    const appendChildSpy = vi.fn()
    const createElementSpy = vi.fn().mockReturnValue(anchor)

    vi.stubGlobal('document', {
      createElement: createElementSpy,
      body: {
        appendChild: appendChildSpy,
      },
    })

    const msg = await exportCsv(store, new Date(2027, 0, 5, 12, 0))

    expect(msg).toBe('Exported 2 runs')
    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(anchor.href).toBe('blob:test-url')
    expect(anchor.download).toBe('scout-combine-2027-01-05.csv')
    expect(appendChildSpy).toHaveBeenCalledWith(anchor)
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(removeSpy).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test-url')

    vi.unstubAllGlobals()
  })

  it('returns singular message for 1 run', async () => {
    const runs = [rec('r1', '2027-01-05')]
    const store = fakeStore(runs)

    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn().mockReturnValue('blob:url'), revokeObjectURL: vi.fn() })
    vi.stubGlobal('document', {
      createElement: vi.fn().mockReturnValue({ click: vi.fn(), remove: vi.fn() }),
      body: { appendChild: vi.fn() },
    })

    const msg = await exportCsv(store, new Date(2027, 0, 5))
    expect(msg).toBe('Exported 1 run')

    vi.unstubAllGlobals()
  })

  it('rejects if store.all() rejects without downloading', async () => {
    const store = fakeStore(() => Promise.reject(new Error('store read failed')))

    const createObjectURL = vi.fn()
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL: vi.fn() })
    const createElement = vi.fn()
    vi.stubGlobal('document', { createElement, body: { appendChild: vi.fn() } })

    await expect(exportCsv(store)).rejects.toThrow('store read failed')
    expect(createObjectURL).not.toHaveBeenCalled()
    expect(createElement).not.toHaveBeenCalled()

    vi.unstubAllGlobals()
  })
})

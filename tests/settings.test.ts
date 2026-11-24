import { describe, expect, it } from 'vitest'
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from '../src/settings'

function memStorage(init: Record<string, string> = {}): Storage {
  const m = new Map(Object.entries(init))
  return {
    getItem: k => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, String(v)),
    removeItem: k => void m.delete(k),
    clear: () => m.clear(),
    key: i => [...m.keys()][i] ?? null,
    get length() { return m.size },
  }
}
const throwing = {
  getItem() { throw new Error('denied') },
  setItem() { throw new Error('denied') },
} as unknown as Storage

describe('settings', () => {
  it('defaults when storage throws', () => {
    expect(loadSettings(throwing)).toEqual(DEFAULT_SETTINGS)
    expect(() => saveSettings({ sound: false }, throwing)).not.toThrow()
  })
  it('defaults on junk', () => {
    expect(loadSettings(memStorage({ 'scout-combine:settings': '{bad' }))).toEqual(DEFAULT_SETTINGS)
    expect(loadSettings(memStorage({ 'scout-combine:settings': '{"sound":"yes"}' }))).toEqual(DEFAULT_SETTINGS)
  })
  it('round-trips', () => {
    const s = memStorage()
    saveSettings({ sound: false }, s)
    expect(loadSettings(s)).toEqual({ sound: false })
  })
})

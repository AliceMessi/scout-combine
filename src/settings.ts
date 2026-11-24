/** Booth settings that survive a reload. Storage failures never break the game. */
export type Settings = { sound: boolean }
export const DEFAULT_SETTINGS: Settings = { sound: true }
const KEY = 'scout-combine:settings'

export function loadSettings(ls: Storage = localStorage): Settings {
  try {
    const raw = ls.getItem(KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const v = JSON.parse(raw) as Partial<Settings>
    if (typeof v.sound !== 'boolean') return { ...DEFAULT_SETTINGS }
    return { sound: v.sound }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(s: Settings, ls: Storage = localStorage): void {
  try {
    ls.setItem(KEY, JSON.stringify(s))
  } catch {
    // private mode or quota: keep the in-memory value
  }
}

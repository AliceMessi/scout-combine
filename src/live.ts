import type { RunRecord } from './store'

export type LiveMsg =
  | { type: 'run-start'; tag: string }
  | { type: 'drill'; tag: string; drill: 'reaction' | 'flick' | 'lasthit' }
  | { type: 'run-end'; record: RunRecord }
  | { type: 'idle' }

export function createLive(
  name = 'scout-combine',
  BC: typeof BroadcastChannel = typeof BroadcastChannel !== 'undefined'
    ? BroadcastChannel
    : (undefined as unknown as typeof BroadcastChannel),
): { post(m: LiveMsg): void; on(cb: (m: LiveMsg) => void): void; close(): void } {
  let ch: BroadcastChannel | null = null
  try {
    if (BC) ch = new BC(name)
  } catch (err) {
    console.warn('Scout Combine: BroadcastChannel unavailable', err)
  }

  const listeners = new Set<(m: LiveMsg) => void>()
  const handler = (e: MessageEvent) => {
    const data = e.data as LiveMsg
    for (const l of listeners) {
      try {
        l(data)
      } catch (err) {
        console.error('Live message handler error', err)
      }
    }
  }

  if (ch) {
    ch.addEventListener('message', handler)
  }

  return {
    post(m: LiveMsg) {
      try {
        ch?.postMessage(m)
      } catch (err) {
        console.warn('Live post error', err)
      }
    },
    on(cb: (m: LiveMsg) => void) {
      listeners.add(cb)
    },
    close() {
      listeners.clear()
      if (ch) {
        try {
          ch.removeEventListener('message', handler)
          ch.close()
        } catch {}
        ch = null
      }
    },
  }
}

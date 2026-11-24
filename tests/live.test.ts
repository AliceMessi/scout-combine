import { describe, expect, it, vi } from 'vitest'
import { createLive, type LiveMsg } from '../src/live'

class FakeBroadcastChannel {
  private static channels = new Map<string, Set<FakeBroadcastChannel>>()
  readonly name: string
  private listeners = new Set<(e: MessageEvent) => void>()
  private closed = false

  constructor(name: string) {
    this.name = name
    let set = FakeBroadcastChannel.channels.get(name)
    if (!set) {
      set = new Set()
      FakeBroadcastChannel.channels.set(name, set)
    }
    set.add(this)
  }

  postMessage(data: unknown): void {
    if (this.closed) throw new Error('Channel closed')
    const set = FakeBroadcastChannel.channels.get(this.name)
    if (!set) return
    for (const ch of set) {
      if (ch !== this && !ch.closed) {
        const ev = { data } as MessageEvent
        for (const l of ch.listeners) {
          l(ev)
        }
      }
    }
  }

  addEventListener(type: string, listener: (e: MessageEvent) => void): void {
    if (type === 'message') {
      this.listeners.add(listener)
    }
  }

  removeEventListener(type: string, listener: (e: MessageEvent) => void): void {
    if (type === 'message') {
      this.listeners.delete(listener)
    }
  }

  close(): void {
    this.closed = true
    this.listeners.clear()
    const set = FakeBroadcastChannel.channels.get(this.name)
    if (set) {
      set.delete(this)
      if (set.size === 0) FakeBroadcastChannel.channels.delete(this.name)
    }
  }
}

describe('live', () => {
  it('delivers messages from one createLive instance to another', () => {
    const live1 = createLive('test-ch', FakeBroadcastChannel as unknown as typeof BroadcastChannel)
    const live2 = createLive('test-ch', FakeBroadcastChannel as unknown as typeof BroadcastChannel)

    const received: LiveMsg[] = []
    live2.on(m => received.push(m))

    live1.post({ type: 'run-start', tag: 'AAA' })
    live1.post({ type: 'drill', tag: 'AAA', drill: 'reaction' })
    live1.post({ type: 'idle' })

    expect(received).toEqual([
      { type: 'run-start', tag: 'AAA' },
      { type: 'drill', tag: 'AAA', drill: 'reaction' },
      { type: 'idle' },
    ])

    live1.close()
    live2.close()
  })

  it('close stops delivery', () => {
    const live1 = createLive('test-ch-2', FakeBroadcastChannel as unknown as typeof BroadcastChannel)
    const live2 = createLive('test-ch-2', FakeBroadcastChannel as unknown as typeof BroadcastChannel)

    const fn = vi.fn()
    live2.on(fn)
    live2.close()

    live1.post({ type: 'idle' })
    expect(fn).not.toHaveBeenCalled()

    live1.close()
  })
})

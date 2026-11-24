import { PLAY_H, PLAY_W, type Press } from './drills/types'

export type Arrow = 'up' | 'down' | 'left' | 'right'

/** Map a client (CSS px) position to the 1600 x 900 play area, letterboxed inside `rect`. */
export function toLogical(clientX: number, clientY: number, rect: DOMRect): { x: number; y: number } {
  const s = Math.min(rect.width / PLAY_W, rect.height / PLAY_H)
  const ox = (rect.width - PLAY_W * s) / 2
  const oy = (rect.height - PLAY_H * s) / 2
  return { x: (clientX - rect.left - ox) / s, y: (clientY - rect.top - oy) / s }
}

export interface InputSource {
  /** Everything pressed since the last call. */
  drain(): { presses: Press[]; arrows: Arrow[] }
  pointer(): { x: number; y: number }
}

const ARROWS: Record<string, Arrow> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }

/** Listens once for the whole session; never re-created per run. */
export function createInput(canvas: HTMLCanvasElement): InputSource {
  let presses: Press[] = []
  let arrows: Arrow[] = []
  let pos = { x: PLAY_W / 2, y: PLAY_H / 2 }
  canvas.addEventListener('pointermove', e => {
    pos = toLogical(e.clientX, e.clientY, canvas.getBoundingClientRect())
  })
  canvas.addEventListener('pointerdown', e => {
    if (e.button !== 0) return
    pos = toLogical(e.clientX, e.clientY, canvas.getBoundingClientRect())
    presses.push({ ...pos, source: 'pointer' })
    e.preventDefault()
  })
  canvas.addEventListener('contextmenu', e => e.preventDefault())
  window.addEventListener('keydown', e => {
    if (e.repeat || e.ctrlKey || e.altKey || e.metaKey) return
    if (e.code === 'Space' || e.code === 'Enter') {
      presses.push({ ...pos, source: 'key' })
      e.preventDefault()
    } else if (ARROWS[e.key]) {
      arrows.push(ARROWS[e.key])
      e.preventDefault()
    }
  })
  return {
    drain() {
      const out = { presses, arrows }
      presses = []
      arrows = []
      return out
    },
    pointer: () => pos,
  }
}

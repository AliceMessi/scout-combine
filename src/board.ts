import { boardState } from './boardState'
import { localDay } from './day'
import { PLAY_H, PLAY_W } from './drills/types'
import { createLive, type LiveMsg } from './live'
import { drawBoard } from './render/board'
import { C, drawSky } from './render/theme'
import { openStore, type RunRecord, type Store } from './store'

const canvas = document.getElementById('board') as HTMLCanvasElement
const ctx = canvas.getContext('2d')!
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches

let runs: RunRecord[] = []
let liveMsg: LiveMsg | null = null
let offlineError = false
let needsRedraw = true
let lastAmbient = 0

const storeReady: Promise<Store | null> = openStore().catch(err => {
  console.error('Scout Combine Board: storage unavailable', err)
  offlineError = true
  needsRedraw = true
  return null
})

async function reload() {
  const store = await storeReady
  if (!store) {
    offlineError = true
    needsRedraw = true
    return
  }
  try {
    const today = localDay(new Date())
    runs = await store.byDay(today)
    offlineError = false
    needsRedraw = true
  } catch (err) {
    console.error('Scout Combine Board: could not read store', err)
    offlineError = true
    needsRedraw = true
  }
}

const live = createLive()
live.on(msg => {
  liveMsg = msg
  needsRedraw = true
  if (msg.type === 'run-end') {
    void reload()
  }
})

// Midnight rollover & periodic sync (once a minute)
setInterval(() => {
  void reload()
}, 60_000)

void reload()

let view = { s: 1, ox: 0, oy: 0, dpr: 1 }

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const w = window.innerWidth
  const h = window.innerHeight
  canvas.width = Math.round(w * dpr)
  canvas.height = Math.round(h * dpr)
  const s = Math.min(w / PLAY_W, h / PLAY_H)
  view = { s, ox: (w - PLAY_W * s) / 2, oy: (h - PLAY_H * s) / 2, dpr }
  needsRedraw = true
}
window.addEventListener('resize', resize)
resize()

let hidden = document.hidden
document.addEventListener('visibilitychange', () => {
  hidden = document.hidden
  if (!hidden) {
    needsRedraw = true
    void reload()
  }
})

function draw(now: number) {
  const state = boardState(runs, liveMsg)
  const { s, ox, oy, dpr } = view
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.setTransform(s * dpr, 0, 0, s * dpr, ox * dpr, oy * dpr)
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, PLAY_W, PLAY_H)
  ctx.clip()
  drawSky(ctx, now, reducedMotion, true)
  drawBoard(ctx, state, offlineError)
  ctx.restore()
}

function frame(now: number) {
  if (!hidden) {
    // Ambient redraw at most 2 times a second (every 500ms) or when data changes
    if (now - lastAmbient >= 500) {
      lastAmbient = now
      needsRedraw = true
    }
    if (needsRedraw) {
      needsRedraw = false
      draw(now)
    }
  }
  requestAnimationFrame(frame)
}

requestAnimationFrame(t => {
  lastAmbient = t
  frame(t)
})

// Read-only hook for testing
;(window as unknown as { __board: object }).__board = {
  runs: () => runs,
  liveMsg: () => liveMsg,
  offlineError: () => offlineError,
}

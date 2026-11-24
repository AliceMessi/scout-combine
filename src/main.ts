import { createAudio, type Sound } from './audio'
import { createClock } from './clock'
import type { FlickMetrics, FlickView } from './drills/flick'
import type { LastHitMetrics, LastHitView } from './drills/lasthit'
import type { ReactionMetrics, ReactionView } from './drills/reaction'
import type { DrillEvent, DrillName } from './drills/types'
import { PLAY_H, PLAY_W } from './drills/types'
import { createInput } from './input'
import { createDrillRenderer } from './render/drills'
import { createFx } from './render/fx'
import { drawAttract, drawCard, drawHud, drawRule, drawTag } from './render/screens'
import { C, drawSky } from './render/theme'
import { mulberry32 } from './rng'
import { createRun, type Run } from './run'

const canvas = document.getElementById('game') as HTMLCanvasElement
const ctx = canvas.getContext('2d')!
const params = new URLSearchParams(location.search)
const speed = Math.max(0.1, Number(params.get('speed')) || 1)
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches

const clock = createClock({ scale: speed })
const rng = mulberry32((Math.random() * 2 ** 32) >>> 0)
const input = createInput(canvas)
const audio = createAudio()
const fx = createFx(reducedMotion)
const drills = createDrillRenderer(fx)

let run: Run | null = null
let lastTag = 'AAA'
let gameMs = 0
let last = performance.now()
let view = { s: 1, ox: 0, oy: 0, dpr: 1 }

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const w = window.innerWidth, h = window.innerHeight
  canvas.width = Math.round(w * dpr)
  canvas.height = Math.round(h * dpr)
  const s = Math.min(w / PLAY_W, h / PLAY_H)
  view = { s, ox: (w - PLAY_W * s) / 2, oy: (h - PLAY_H * s) / 2, dpr }
}
window.addEventListener('resize', resize)
resize()

const DRILL_SOUND: Record<string, Sound | undefined> = {
  hit: 'hit', miss: 'miss', early: 'early', signal: 'signal', shoot: 'shoot', last: 'last', missed: 'missed',
}

function handle(events: DrillEvent[], drill: DrillName | null) {
  for (const e of events) {
    if (e.type === 'phase') {
      if (e.phase === 'rule') audio.play('drill')
      if (e.phase === 'drill') drills.reset()
      if (e.phase === 'card') audio.play('card')
      continue
    }
    if (e.type === 'tick') audio.play('tick')
    else if (e.type === 'refused') audio.play('refused')
    else if (drill) {
      const s = DRILL_SOUND[e.type]
      if (s) audio.play(s)
      drills.onEvent(drill, e)
    }
  }
}

function update(realDt: number) {
  const steps = clock.tick(realDt)
  if (steps.length === 0) return
  const { presses, arrows } = input.drain()
  if (presses.length || arrows.length) audio.unlock()
  steps.forEach((dt, i) => {
    const p = i === 0 ? presses : []
    const a = i === 0 ? arrows : []
    gameMs += dt
    if (!run) {
      if (p.length) {
        run = createRun(rng, lastTag)
        audio.play('go')
      }
      return
    }
    const drill = run.drill
    handle(run.step(dt, p, a), drill)
    if (run.phase === 'over' || run.phase === 'abandoned') {
      if (run.phase === 'over') lastTag = run.tag.letters.join('')
      run = null
      fx.clear()
    }
  })
  fx.update(steps.reduce((x, y) => x + y, 0))
}

function draw() {
  const { s, ox, oy, dpr } = view
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  const sh = fx.offset()
  ctx.setTransform(s * dpr, 0, 0, s * dpr, (ox + sh.x * s) * dpr, (oy + sh.y * s) * dpr)
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, PLAY_W, PLAY_H)
  ctx.clip()
  drawSky(ctx, gameMs, reducedMotion, run?.phase === 'drill')
  if (!run) drawAttract(ctx, gameMs, false)
  else {
    switch (run.phase) {
      case 'tag': drawTag(ctx, run, gameMs); break
      case 'rule': drawRule(ctx, run); break
      case 'drill': {
        const d = run.current()!
        if (d.name === 'reaction') {
          const v = d.view() as ReactionView
          drills.reaction(ctx, v, d.metrics() as ReactionMetrics, gameMs)
          drawHud(ctx, run, v.remainingMs, d.durationMs, '')
        } else if (d.name === 'flick') {
          const v = d.view() as FlickView
          drills.flick(ctx, v, d.metrics() as FlickMetrics, input.pointer(), gameMs)
          drawHud(ctx, run, v.remainingMs, d.durationMs, '')
        } else {
          const v = d.view() as LastHitView
          drills.lasthit(ctx, v, d.metrics() as LastHitMetrics, gameMs)
          drawHud(ctx, run, v.remainingMs, d.durationMs, '')
        }
        break
      }
      case 'card': drawCard(ctx, run.result()!, run.phaseMs, 'PERCENTILE  —'); break
    }
  }
  fx.draw(ctx)
  ctx.restore()
}

// Read-only hook for end-to-end tests and the soak test.
;(window as unknown as { __scout: object }).__scout = {
  phase: () => (run ? run.phase : 'attract'),
  drill: () => run?.drill ?? null,
}

function frame(now: number) {
  update(now - last)
  last = now
  draw()
  requestAnimationFrame(frame)
}
requestAnimationFrame(t => {
  last = t
  frame(t)
})

import { createAudio, type Sound } from './audio'
import { autoPresses, createBot, type Bot, type BotLevel } from './bot'
import { createClock } from './clock'
import type { FlickMetrics, FlickView } from './drills/flick'
import type { LastHitMetrics, LastHitView } from './drills/lasthit'
import type { ReactionMetrics, ReactionView } from './drills/reaction'
import type { DrillEvent, DrillName, Press } from './drills/types'
import { PLAY_H, PLAY_W } from './drills/types'
import { createInput } from './input'
import { createDrillRenderer } from './render/drills'
import { createFx } from './render/fx'
import { drawAttract, drawCard, drawHud, drawRule, drawTag } from './render/screens'
import { C, drawSky } from './render/theme'
import { mulberry32 } from './rng'
import { createRun, type Run, type RunResult } from './run'
import { localDay } from './day'
import { percentile } from './scoring'
import { openStore, type RunRecord, type Store } from './store'
import { createOperatorMenu } from './operator'
import { loadSettings, saveSettings } from './settings'

const canvas = document.getElementById('game') as HTMLCanvasElement
const ctx = canvas.getContext('2d')!
const params = new URLSearchParams(location.search)
const speed = Math.max(0.1, Number(params.get('speed')) || 1)
const levelParam = params.get('autoplay')
/** URL `?autoplay=casual|average|sharp`: a bot plays real runs (e2e tests, soak test, demos). */
const autoplay: BotLevel | null = levelParam === 'casual' || levelParam === 'average' || levelParam === 'sharp' ? levelParam : null
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches

const clock = createClock({ scale: speed })
const rng = mulberry32((Math.random() * 2 ** 32) >>> 0)
const input = createInput(canvas)
const audio = createAudio()
const fx = createFx(reducedMotion)
const drills = createDrillRenderer(fx)
const settings = loadSettings()
audio.setEnabled(settings.sound)
/** Uncaught errors since start-up, shown in the operator menu. */
let errorCount = 0
window.addEventListener('error', () => void errorCount++)
window.addEventListener('unhandledrejection', () => void errorCount++)

let run: Run | null = null
let runBot: Bot | null = null
/** The attract screen plays a silent demo run with a sharp bot behind the title. */
let demo: { run: Run; bot: Bot } | null = null
let lastTag = 'AAA'
/** The line under the overall score on the card; updated once the run is saved. */
let cardLine = ''
let savedRuns = 0
const storeReady: Promise<Store | null> = openStore().catch(err => {
  console.error('Scout Combine: storage unavailable', err)
  return null
})

async function saveRun(r: RunResult) {
  cardLine = 'SAVING…'
  const rec: RunRecord = { id: crypto.randomUUID(), day: localDay(new Date()), endedAt: Date.now(), ...r }
  const store = await storeReady
  try {
    if (!store) throw new Error('no storage')
    await store.save(rec)
    savedRuns++
  } catch (err) {
    console.error('Scout Combine: run not saved', err)
    cardLine = 'NOT SAVED — TELL THE BOOTH STAFF'
    return
  }
  try {
    const today = await store.byDay(rec.day)
    const p = percentile(rec.scores.overall, today.map(x => x.scores.overall))
    cardLine = p === null ? 'EARLY BIRD — NOT ENOUGH PLAYERS YET' : `BETTER THAN ${p}% OF TODAY'S PLAYERS`
  } catch (err) {
    console.error('Scout Combine: could not read today', err)
    cardLine = 'SAVED'
  }
}
const operator = createOperatorMenu({
  sound: () => settings.sound,
  setSound(on) {
    settings.sound = on
    saveSettings(settings)
    audio.setEnabled(on)
  },
  async clearToday() {
    const store = await storeReady
    if (!store) throw new Error('storage unavailable')
    const day = localDay(new Date())
    const n = (await store.byDay(day)).length
    await store.clearDay(day)
    return n
  },
  errors: () => errorCount,
  savedRuns: () => savedRuns,
})

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

function handle(events: DrillEvent[], drill: DrillName | null, silent: boolean) {
  const play = (s: Sound) => {
    if (!silent) audio.play(s)
  }
  for (const e of events) {
    if (e.type === 'phase') {
      if (e.phase === 'rule') play('drill')
      if (e.phase === 'drill') drills.reset()
      if (e.phase === 'card') play('card')
      continue
    }
    if (e.type === 'tick') play('tick')
    else if (e.type === 'refused') play('refused')
    else if (drill) {
      const s = DRILL_SOUND[e.type]
      if (s) play(s)
      if (!silent) drills.onEvent(drill, e)
    }
  }
}

function startRun() {
  demo = null
  fx.clear()
  drills.reset()
  run = createRun(rng, lastTag)
  runBot = autoplay ? createBot(autoplay, rng) : null
  audio.play('go')
}

function stepDemo(dt: number) {
  if (!demo || demo.run.phase === 'over' || demo.run.phase === 'abandoned' || demo.run.phase === 'card') {
    demo = { run: createRun(rng, 'BOT'), bot: createBot('sharp', rng) }
    drills.reset()
  }
  const d = demo.run
  const drill = d.drill
  handle(d.step(dt, autoPresses(d, demo.bot, gameMs), []), drill, true)
}

function update(realDt: number) {
  const steps = clock.tick(realDt)
  if (steps.length === 0) return
  const { presses, arrows } = input.drain()
  if (presses.length || arrows.length) audio.unlock()
  steps.forEach((dt, i) => {
    const p: Press[] = i === 0 ? presses : []
    const a = i === 0 ? arrows : []
    gameMs += dt
    if (!run) {
      if (p.length || autoplay) startRun()
      else stepDemo(dt)
      return
    }
    const all = runBot ? [...p, ...autoPresses(run, runBot, gameMs)] : p
    const drill = run.drill
    const events = run.step(dt, all, a)
    handle(events, drill, false)
    if (events.some(e => e.type === 'phase' && e.phase === 'card')) void saveRun(run.result()!)
    if (run.phase === 'over' || run.phase === 'abandoned') {
      if (run.phase === 'over') lastTag = run.tag.letters.join('')
      run = null
      runBot = null
      fx.clear()
    }
  })
  fx.update(steps.reduce((x, y) => x + y, 0))
}

function drawDrill(r: Run) {
  const d = r.current()!
  if (d.name === 'reaction') {
    const v = d.view() as ReactionView
    drills.reaction(ctx, v, d.metrics() as ReactionMetrics, gameMs)
    drawHud(ctx, r, v.remainingMs, d.durationMs, '')
  } else if (d.name === 'flick') {
    const v = d.view() as FlickView
    drills.flick(ctx, v, d.metrics() as FlickMetrics, r === run ? input.pointer() : { x: -100, y: -100 }, gameMs)
    drawHud(ctx, r, v.remainingMs, d.durationMs, '')
  } else {
    const v = d.view() as LastHitView
    drills.lasthit(ctx, v, d.metrics() as LastHitMetrics, gameMs)
    drawHud(ctx, r, v.remainingMs, d.durationMs, '')
  }
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
  if (!run) {
    if (demo?.run.phase === 'drill') drawDrill(demo.run)
    drawAttract(ctx, gameMs, true)
  } else {
    switch (run.phase) {
      case 'tag': drawTag(ctx, run, gameMs); break
      case 'rule': drawRule(ctx, run); break
      case 'drill': drawDrill(run); break
      case 'card': drawCard(ctx, run.result()!, run.phaseMs, cardLine); break
    }
  }
  fx.draw(ctx)
  ctx.restore()
}

// Read-only hook for end-to-end tests and the soak test.
;(window as unknown as { __scout: object }).__scout = {
  phase: () => (run ? run.phase : 'attract'),
  drill: () => run?.drill ?? null,
  runs: () => savedRuns,
}

// The loop sleeps while the tab is hidden and while the operator menu is open: no game time passes.
let hidden = document.hidden
document.addEventListener('visibilitychange', () => {
  hidden = document.hidden
  last = performance.now()
})

function frame(now: number) {
  if (!hidden && !operator.isOpen()) update(now - last)
  else input.drain()
  last = now
  draw()
  requestAnimationFrame(frame)
}
requestAnimationFrame(t => {
  last = t
  frame(t)
})

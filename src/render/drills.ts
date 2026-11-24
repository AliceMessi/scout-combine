import type { FlickMetrics, FlickView } from '../drills/flick'
import { WINDUP_MS, type LastHitMetrics, type LastHitView } from '../drills/lasthit'
import type { ReactionMetrics, ReactionView } from '../drills/reaction'
import type { DrillEvent, DrillName } from '../drills/types'
import type { Fx } from './fx'
import { C, panel, roundRect, text } from './theme'

const TURRET = { x: 250, y: 610 }
const UNIT = { x: 1060, y: 610 }
const BAR = { x: 1060 - 240, y: 330, w: 480, h: 46 }
const ALLIES = [{ x: 520, y: 470 }, { x: 600, y: 560 }, { x: 520, y: 650 }]
let allyShot = 0
let ally = 0

export interface DrillRenderer {
  reaction(ctx: CanvasRenderingContext2D, v: ReactionView, m: ReactionMetrics, tMs: number): void
  flick(ctx: CanvasRenderingContext2D, v: FlickView, m: FlickMetrics, pointer: { x: number; y: number }, tMs: number): void
  lasthit(ctx: CanvasRenderingContext2D, v: LastHitView, m: LastHitMetrics, tMs: number): void
  onEvent(drill: DrillName, e: DrillEvent): void
  reset(): void
}

export function createDrillRenderer(fx: Fx): DrillRenderer {
  let targetBorn = 0
  let lastTargetKey = ''
  let prevHp = 100
  let prevUnit = -1
  let flash = 0 // ms of hit flash left on the unit
  let now = 0

  return {
    reset() {
      lastTargetKey = ''
      prevHp = 100
      prevUnit = -1
      flash = 0
    },

    reaction(ctx, v, m, t) {
      now = t
      const cx = 800, cy = 470
      if (v.phase === 'signal') {
        ctx.save()
        ctx.shadowColor = C.green
        ctx.shadowBlur = 60
        ctx.fillStyle = C.green
        ctx.beginPath()
        ctx.moveTo(cx, cy - 190); ctx.lineTo(cx + 190, cy); ctx.lineTo(cx, cy + 190); ctx.lineTo(cx - 190, cy)
        ctx.closePath()
        ctx.fill()
        ctx.restore()
        text(ctx, 'NOW!', cx, cy + 4, 96, C.bg, { weight: 900 })
      } else {
        ctx.beginPath()
        ctx.arc(cx, cy, 170, 0, Math.PI * 2)
        ctx.fillStyle = v.phase === 'feedback' && v.tooEarly ? 'rgba(255,159,67,0.25)' : 'rgba(79,195,247,0.12)'
        ctx.fill()
        ctx.lineWidth = 8
        ctx.strokeStyle = v.phase === 'feedback' && v.tooEarly ? C.orange : C.cyanDim
        ctx.stroke()
        if (v.phase === 'feedback') {
          if (v.tooEarly) text(ctx, 'TOO EARLY', cx, cy, 64, C.orange, { weight: 900 })
          else if (v.lastMs !== null) {
            text(ctx, `${Math.round(v.lastMs)} ms`, cx, cy - 18, 84, C.white, { weight: 900 })
            text(ctx, grade(v.lastMs), cx, cy + 52, 32, C.gold, { weight: 800, spacing: 4 })
          }
        } else text(ctx, 'WAIT…', cx, cy, 64, C.dim, { weight: 800, spacing: 6 })
      }
      const best = m.medianMs === null ? '—' : `${Math.round(m.medianMs)} ms`
      text(ctx, `TRIALS ${m.trials}   ·   MEDIAN ${best}   ·   EARLY ${m.falseStarts}`, 800, 800, 28, C.dim, { weight: 700, spacing: 2 })
    },

    flick(ctx, v, m, p, t) {
      now = t
      const key = `${v.target.x.toFixed(1)},${v.target.y.toFixed(1)}`
      if (key !== lastTargetKey) {
        lastTargetKey = key
        targetBorn = t
      }
      const pop = Math.min(1, (t - targetBorn) / 120)
      const r = v.target.r * (0.6 + 0.4 * pop)
      ctx.save()
      ctx.shadowColor = C.cyan
      ctx.shadowBlur = 30
      for (const [k, col] of [[1, C.cyan], [0.66, C.white], [0.33, C.cyan]] as const) {
        ctx.beginPath()
        ctx.arc(v.target.x, v.target.y, r * k, 0, Math.PI * 2)
        ctx.fillStyle = col
        ctx.fill()
      }
      ctx.restore()
      // reticle
      ctx.strokeStyle = C.white
      ctx.lineWidth = 3
      ctx.beginPath()
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        ctx.moveTo(p.x + dx * 8, p.y + dy * 8)
        ctx.lineTo(p.x + dx * 22, p.y + dy * 22)
      }
      ctx.stroke()
      const shots = m.hits + m.misses
      const acc = shots ? Math.round((100 * m.hits) / shots) : 100
      text(ctx, `HITS ${m.hits}   ·   ACCURACY ${acc}%`, 800, 860, 28, C.dim, { weight: 700, spacing: 2 })
    },

    lasthit(ctx, v, m, t) {
      const dt = t - now
      now = t
      flash = Math.max(0, flash - dt)
      if (v.unitId !== prevUnit) {
        prevUnit = v.unitId
        prevHp = v.hp
      }
      if (v.hp < prevHp - 0.01 && v.hp > 0) {
        const own = prevHp - v.hp >= 29.99 // the player's early shot, not an ally
        fx.burst(UNIT.x + (Math.random() - 0.5) * 80, UNIT.y - 60, own ? C.gold : C.cyan, own ? 14 : 6, 260)
        flash = 90
        if (!own) {
          allyShot = 110
          ally = (ally + 1) % ALLIES.length
        }
      }
      allyShot = Math.max(0, allyShot - dt)
      prevHp = v.hp
      // ground
      ctx.fillStyle = 'rgba(79,195,247,0.10)'
      ctx.fillRect(0, 700, 1600, 200)
      ctx.strokeStyle = 'rgba(79,195,247,0.35)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(0, 700); ctx.lineTo(1600, 700)
      ctx.stroke()
      // turret (the player)
      ctx.fillStyle = C.gold
      hexagon(ctx, TURRET.x, TURRET.y, 70)
      ctx.fillRect(TURRET.x + 40, TURRET.y - 16, 90, 32)
      text(ctx, 'YOU', TURRET.x, TURRET.y + 120, 26, C.gold, { weight: 800, spacing: 4 })
      // allied drones: they wear the unit down at random
      ALLIES.forEach((a, i) => {
        const hover = Math.sin(t / 240 + i * 2) * 8
        ctx.fillStyle = C.cyan
        ctx.beginPath()
        ctx.arc(a.x, a.y + hover, 22, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = C.bg
        ctx.beginPath()
        ctx.arc(a.x + 6, a.y + hover, 8, 0, Math.PI * 2)
        ctx.fill()
        if (allyShot > 0 && i === ally && v.hp > 0) {
          ctx.strokeStyle = C.cyan
          ctx.globalAlpha = allyShot / 110
          ctx.lineWidth = 5
          ctx.beginPath()
          ctx.moveTo(a.x + 22, a.y + hover)
          ctx.lineTo(UNIT.x - 60, UNIT.y - 60)
          ctx.stroke()
          ctx.globalAlpha = 1
        }
      })
      // unit
      if (v.hp > 0) {
        const enter = Math.min(1, v.unitAgeMs / 260)
        const ux = UNIT.x + (1 - enter) * 500
        const bob = Math.sin(t / 180) * 6
        const body = flash > 0 ? C.white : '#4b5fa3'
        // feet
        ctx.fillStyle = '#2d3c6e'
        roundRect(ctx, ux - 70, UNIT.y + 22, 50, 40, 14)
        ctx.fill()
        roundRect(ctx, ux + 20, UNIT.y + 22, 50, 40, 14)
        ctx.fill()
        // antenna
        ctx.strokeStyle = body
        ctx.lineWidth = 6
        ctx.beginPath()
        ctx.moveTo(ux, UNIT.y - 150 + bob)
        ctx.lineTo(ux + 18, UNIT.y - 190 + bob)
        ctx.stroke()
        ctx.fillStyle = C.red
        ctx.beginPath()
        ctx.arc(ux + 18, UNIT.y - 194 + bob, 9, 0, Math.PI * 2)
        ctx.fill()
        roundRect(ctx, ux - 85, UNIT.y - 150 + bob, 170, 190, 50)
        ctx.fillStyle = body
        ctx.fill()
        ctx.save()
        ctx.shadowColor = C.red
        ctx.shadowBlur = 20
        ctx.beginPath()
        ctx.arc(ux - 16, UNIT.y - 75 + bob, 28, 0, Math.PI * 2)
        ctx.fillStyle = C.red
        ctx.fill()
        ctx.restore()
        ctx.beginPath()
        ctx.arc(ux - 24, UNIT.y - 75 + bob, 10, 0, Math.PI * 2)
        ctx.fillStyle = C.white
        ctx.fill()
        // health bar
        panel(ctx, BAR.x - 8, BAR.y - 8, BAR.w + 16, BAR.h + 16)
        const k = v.hp / 100
        ctx.fillStyle = v.hp <= v.markHp ? C.gold : C.green
        roundRect(ctx, BAR.x, BAR.y, BAR.w * k, BAR.h, 10)
        ctx.fill()
        const mx = BAR.x + (BAR.w * v.markHp) / 100
        ctx.fillStyle = C.white
        ctx.fillRect(mx - 3, BAR.y - 22, 6, BAR.h + 44)
        text(ctx, 'YOUR SHOT KILLS BELOW THIS LINE', mx, BAR.y - 44, 22, C.white, { weight: 700, align: 'left' })
      }
      // shot in flight
      if (v.shotInFlightMs !== null) {
        const k = 1 - v.shotInFlightMs / WINDUP_MS
        const x = TURRET.x + 130 + (UNIT.x - 90 - TURRET.x - 130) * k
        ctx.save()
        ctx.shadowColor = C.gold
        ctx.shadowBlur = 24
        ctx.fillStyle = C.gold
        ctx.beginPath()
        ctx.arc(x, TURRET.y, 16, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
      if (v.cooldownMs > 0) text(ctx, 'RELOADING', TURRET.x, TURRET.y - 110, 26, C.orange, { weight: 800 })
      text(ctx, `LAST HITS ${m.lastHits}   ·   MISSED ${m.missed}   ·   EARLY ${m.early}`, 800, 820, 28, C.dim, { weight: 700, spacing: 2 })
    },

    onEvent(drill, e) {
      if (drill === 'flick') {
        if (e.type === 'hit') {
          fx.burst(e.x as number, e.y as number, C.cyan, 22)
          fx.ring(e.x as number, e.y as number, C.white, e.r as number)
        } else if (e.type === 'miss') {
          fx.float('×', e.x as number, e.y as number, C.red, 40)
          fx.shake(5)
        }
      } else if (drill === 'reaction') {
        if (e.type === 'hit') fx.burst(800, 470, C.green, 30, 520)
        else if (e.type === 'early') fx.shake(10)
      } else if (drill === 'lasthit') {
        if (e.type === 'last') {
          fx.burst(UNIT.x, UNIT.y - 60, C.gold, 40, 560)
          fx.float('LAST HIT', UNIT.x, UNIT.y - 230, C.gold, 54)
        } else if (e.type === 'missed') {
          fx.burst(UNIT.x, UNIT.y - 60, C.red, 24)
          fx.float('MISSED', UNIT.x, UNIT.y - 230, C.red, 48)
        } else if (e.type === 'early') {
          fx.float('TOO EARLY', UNIT.x, UNIT.y - 230, C.orange, 44)
          fx.shake(6)
        }
      }
    },
  }
}

function grade(ms: number) {
  return ms <= 200 ? 'LIGHTNING' : ms <= 250 ? 'SHARP' : ms <= 300 ? 'GOOD' : 'KEEP GOING'
}

function hexagon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath()
  for (let i = 0; i < 6; i++) ctx.lineTo(x + Math.cos((i * Math.PI) / 3) * r, y + Math.sin((i * Math.PI) / 3) * r)
  ctx.closePath()
  ctx.fill()
}

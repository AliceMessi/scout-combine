import { metricLines, tipFor } from '../cardText'
import { CARD_MS, DRILL_ORDER, RULE_MS, type Run, type RunResult } from '../run'
import { TAG_LAYOUT } from '../tag'
import { C, panel, roundRect, text } from './theme'

export const DRILL_TITLE = { reaction: 'REACTION', flick: 'FLICK', lasthit: 'LAST HIT' } as const
export const DRILL_RULE = {
  reaction: 'CLICK WHEN IT TURNS GREEN',
  flick: 'CLICK THE TARGETS',
  lasthit: 'SHOOT WHEN HEALTH IS UNDER THE LINE — YOUR SHOT TAKES A MOMENT',
} as const

export function drawAttract(ctx: CanvasRenderingContext2D, tMs: number, demo: boolean) {
  const s = tMs / 1000
  ctx.fillStyle = demo ? 'rgba(11, 21, 48, 0.55)' : 'rgba(0,0,0,0)'
  ctx.fillRect(0, 0, 1600, 900)
  text(ctx, 'SCOUT', 800, 250, 150, C.white, { weight: 900, glow: C.cyan, spacing: 12 })
  text(ctx, 'COMBINE', 800, 380, 150, C.cyan, { weight: 900, glow: C.cyan, spacing: 12 })
  text(ctx, '3 DRILLS  ·  2 MINUTES  ·  GET SCOUTED', 800, 490, 34, C.dim, { weight: 700, spacing: 4 })
  const names = ['REACTION', 'FLICK', 'LAST HIT']
  names.forEach((n, i) => {
    const x = 800 + (i - 1) * 300
    panel(ctx, x - 125, 560, 250, 76)
    text(ctx, n, x, 598, 30, C.white, { weight: 800 })
  })
  const pulse = 0.55 + 0.45 * Math.sin(s * 3)
  text(ctx, 'CLICK TO START', 800, 760, 64, C.gold, { weight: 900, alpha: pulse, glow: C.gold, spacing: 6 })
}

export function drawTag(ctx: CanvasRenderingContext2D, run: Run, tMs: number) {
  text(ctx, 'ENTER YOUR TAG', 800, 150, 64, C.white, { weight: 900, spacing: 6 })
  const { letters, arrowW, go } = TAG_LAYOUT
  letters.forEach((l, i) => {
    const active = run.tag.cursor === i
    panel(ctx, l.x - 80, l.y - 95, 160, 190, active ? C.cyan : C.cyanDim)
    text(ctx, run.tag.letters[i], l.x, l.y + 6, 140, active ? C.white : C.dim, { weight: 900 })
    for (const [y, dir] of [[l.upY, -1], [l.downY, 1]] as const) {
      ctx.fillStyle = active ? C.cyan : C.cyanDim
      ctx.beginPath()
      ctx.moveTo(l.x - arrowW * 0.28, y - dir * 18)
      ctx.lineTo(l.x + arrowW * 0.28, y - dir * 18)
      ctx.lineTo(l.x, y + dir * 26)
      ctx.closePath()
      ctx.fill()
    }
  })
  ctx.save()
  ctx.shadowColor = C.gold
  ctx.shadowBlur = 18 + 14 * Math.sin(tMs / 260)
  roundRect(ctx, go.x - go.w / 2, go.y - go.h / 2, go.w, go.h, 28)
  ctx.fillStyle = C.gold
  ctx.fill()
  ctx.restore()
  text(ctx, 'GO', go.x, go.y + 3, 64, C.bg, { weight: 900, spacing: 8 })
  if (run.tag.invalid) text(ctx, 'PICK ANOTHER TAG', 800, 690, 34, C.red, { weight: 800 })
  else text(ctx, 'ARROW KEYS AND SPACE WORK TOO', 800, 690, 24, C.dim, { weight: 600, spacing: 3 })
}

export function drawRule(ctx: CanvasRenderingContext2D, run: Run) {
  const d = DRILL_ORDER[run.drillIndex]
  const k = Math.min(1, run.phaseMs / RULE_MS)
  const ease = 1 - Math.pow(1 - Math.min(1, run.phaseMs / 260), 3)
  text(ctx, `DRILL ${run.drillIndex + 1} / 3`, 800, 270, 40, C.cyan, { weight: 800, spacing: 8 })
  text(ctx, DRILL_TITLE[d], 800, 400, 150 * (0.8 + 0.2 * ease), C.white, { weight: 900, glow: C.cyan, spacing: 6 })
  text(ctx, DRILL_RULE[d], 800, 530, d === 'lasthit' ? 38 : 50, C.gold, { weight: 800 })
  roundRect(ctx, 500, 640, 600, 14, 7)
  ctx.fillStyle = 'rgba(79,195,247,0.2)'
  ctx.fill()
  roundRect(ctx, 500, 640, 600 * k, 14, 7)
  ctx.fillStyle = C.cyan
  ctx.fill()
}

/** Thin bar with the drill name and time left. */
export function drawHud(ctx: CanvasRenderingContext2D, run: Run, remainingMs: number, totalMs: number, right: string) {
  const d = DRILL_ORDER[run.drillIndex]
  text(ctx, `${run.drillIndex + 1}/3  ${DRILL_TITLE[d]}`, 40, 44, 30, C.white, { align: 'left', weight: 800, spacing: 3 })
  text(ctx, right, 1560, 44, 28, C.dim, { align: 'right', weight: 700 })
  const k = Math.max(0, remainingMs / totalMs)
  ctx.fillStyle = 'rgba(79,195,247,0.18)'
  ctx.fillRect(0, 0, 1600, 8)
  ctx.fillStyle = remainingMs < 5000 ? C.orange : C.cyan
  ctx.fillRect(0, 0, 1600 * k, 8)
  text(ctx, `${Math.ceil(remainingMs / 1000)}`, 800, 48, 40, remainingMs < 5000 ? C.orange : C.white, { weight: 900 })
}

const ROLE_LINE = {
  Opener: 'Fast hands. You start the fight.',
  Marksman: 'Clean aim. You take the long shots.',
  Finisher: 'Perfect timing. You close it out.',
  Flex: 'Balanced. You fit any role.',
} as const

export function drawCard(ctx: CanvasRenderingContext2D, r: RunResult, phaseMs: number, percentileLine: string) {
  const appear = Math.min(1, phaseMs / 400)
  ctx.save()
  ctx.globalAlpha = appear
  ctx.translate(0, (1 - appear) * 40)
  panel(ctx, 90, 70, 1420, 760, C.cyan)
  text(ctx, 'SCOUTING REPORT', 150, 130, 30, C.cyan, { align: 'left', weight: 800, spacing: 6 })
  text(ctx, r.tag, 150, 240, 150, C.white, { align: 'left', weight: 900, spacing: 10 })
  // role badge
  roundRect(ctx, 150, 330, 360, 70, 35)
  ctx.fillStyle = C.gold
  ctx.fill()
  text(ctx, r.role.toUpperCase(), 330, 367, 40, C.bg, { weight: 900, spacing: 6 })
  text(ctx, ROLE_LINE[r.role], 150, 440, 28, C.dim, { align: 'left', weight: 600 })
  text(ctx, 'OVERALL', 150, 510, 28, C.dim, { align: 'left', weight: 800, spacing: 4 })
  text(ctx, `${r.scores.overall}`, 150, 600, 140, C.gold, { align: 'left', weight: 900, glow: C.gold })
  text(ctx, percentileLine, 150, 690, 28, C.white, { align: 'left', weight: 700 })

  radar(ctx, 1110, 315, 150, [r.scores.reaction, r.scores.flick, r.scores.lastHit])

  const lines = metricLines(r)
  const rows: [string, number, string][] = [
    ['REACTION', r.scores.reaction, lines.reaction],
    ['FLICK', r.scores.flick, lines.flick],
    ['LAST HIT', r.scores.lastHit, lines.lastHit],
  ]
  rows.forEach(([name, score, line], i) => {
    const y = 545 + i * 70
    text(ctx, name, 790, y, 26, C.white, { align: 'left', weight: 800 })
    text(ctx, line, 790, y + 28, 20, C.dim, { align: 'left', weight: 600 })
    roundRect(ctx, 1040, y - 10, 330, 20, 10)
    ctx.fillStyle = 'rgba(79,195,247,0.18)'
    ctx.fill()
    roundRect(ctx, 1040, y - 10, 3.3 * score * appear, 20, 10)
    ctx.fillStyle = C.cyan
    ctx.fill()
    text(ctx, `${score}`, 1440, y, 34, C.white, { align: 'right', weight: 900 })
  })
  text(ctx, `TIP  ${tipFor(r)}`, 150, 770, 24, C.gold, { align: 'left', weight: 700 })
  const left = Math.ceil((CARD_MS - phaseMs) / 1000)
  text(ctx, `CLICK TO FINISH  ·  ${left}`, 1450, 790, 22, C.dim, { align: 'right', weight: 700, spacing: 2 })
  ctx.restore()
}

function radar(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, values: number[]) {
  const labels = ['REACTION', 'FLICK', 'LAST HIT']
  const ang = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / 3
  ctx.lineWidth = 2
  for (const f of [0.25, 0.5, 0.75, 1]) {
    ctx.beginPath()
    for (let i = 0; i < 3; i++) ctx.lineTo(cx + Math.cos(ang(i)) * R * f, cy + Math.sin(ang(i)) * R * f)
    ctx.closePath()
    ctx.strokeStyle = 'rgba(79,195,247,0.25)'
    ctx.stroke()
  }
  ctx.beginPath()
  values.forEach((v, i) => {
    const r = (R * Math.max(4, v)) / 100
    ctx.lineTo(cx + Math.cos(ang(i)) * r, cy + Math.sin(ang(i)) * r)
  })
  ctx.closePath()
  ctx.fillStyle = 'rgba(255,201,77,0.35)'
  ctx.fill()
  ctx.strokeStyle = C.gold
  ctx.lineWidth = 4
  ctx.stroke()
  labels.forEach((l, i) => {
    const x = cx + Math.cos(ang(i)) * (R + 48)
    const y = cy + Math.sin(ang(i)) * (R + 30)
    text(ctx, l, x, y, 24, C.white, { weight: 800 })
  })
}

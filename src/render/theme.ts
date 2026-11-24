import { mulberry32 } from '../rng'

export const C = {
  bg: '#0b1530',
  bgLow: '#16306a',
  cyan: '#4fc3f7',
  cyanDim: '#2a6f96',
  white: '#f4f8ff',
  dim: '#8fa3c7',
  gold: '#ffc94d',
  green: '#3ee08f',
  red: '#ff5a6e',
  orange: '#ff9f43',
  panel: 'rgba(12, 26, 60, 0.82)',
}

const FAMILY = 'system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
export const font = (px: number, weight = 800) => `${weight} ${px}px ${FAMILY}`

type TextOpts = { align?: CanvasTextAlign; weight?: number; alpha?: number; glow?: string; baseline?: CanvasTextBaseline; spacing?: number }

export function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, px: number, color: string, o: TextOpts = {}) {
  ctx.save()
  ctx.font = font(px, o.weight ?? 800)
  ctx.textAlign = o.align ?? 'center'
  ctx.textBaseline = o.baseline ?? 'middle'
  ctx.globalAlpha = o.alpha ?? 1
  if (o.spacing) ctx.letterSpacing = `${o.spacing}px`
  if (o.glow) {
    ctx.shadowColor = o.glow
    ctx.shadowBlur = px * 0.45
  }
  ctx.fillStyle = color
  ctx.fillText(s, x, y)
  ctx.restore()
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

export function panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, stroke = C.cyanDim) {
  roundRect(ctx, x, y, w, h, 22)
  ctx.fillStyle = C.panel
  ctx.fill()
  ctx.lineWidth = 3
  ctx.strokeStyle = stroke
  ctx.stroke()
}

// ---- the sky: a gradient, a few stars and slow procedural clouds ----

type Cloud = { x: number; y: number; speed: number; puffs: { dx: number; dy: number; r: number }[]; alpha: number }
const rnd = mulberry32(9)
const clouds: Cloud[] = Array.from({ length: 9 }, (_, i) => {
  const depth = i / 8
  return {
    x: rnd() * 1900 - 150,
    y: 520 + depth * 300 + rnd() * 60,
    speed: 4 + depth * 14,
    alpha: 0.05 + depth * 0.08,
    puffs: Array.from({ length: 6 }, () => ({ dx: (rnd() - 0.5) * 320, dy: (rnd() - 0.5) * 50, r: 50 + rnd() * 70 })),
  }
})
const stars = Array.from({ length: 70 }, () => ({ x: rnd() * 1600, y: rnd() * 420, r: 0.6 + rnd() * 1.6, p: rnd() * 6 }))

export function drawSky(ctx: CanvasRenderingContext2D, tMs: number, calm = false, dim = false) {
  const g = ctx.createLinearGradient(0, 0, 0, 900)
  g.addColorStop(0, C.bg)
  g.addColorStop(1, C.bgLow)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 1600, 900)
  const s = tMs / 1000
  ctx.fillStyle = C.white
  for (const st of stars) {
    ctx.globalAlpha = calm ? 0.35 : 0.25 + 0.25 * Math.sin(s * 0.8 + st.p)
    ctx.beginPath()
    ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2)
    ctx.fill()
  }
  for (const c of clouds) {
    const x = ((c.x + s * c.speed) % 1900) - 150
    ctx.globalAlpha = dim ? c.alpha * 0.35 : c.alpha * 0.7
    ctx.fillStyle = '#cfe6ff'
    ctx.beginPath()
    for (const p of c.puffs) {
      ctx.moveTo(x + p.dx + p.r, c.y + p.dy)
      ctx.arc(x + p.dx, c.y + p.dy, p.r, 0, Math.PI * 2)
    }
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

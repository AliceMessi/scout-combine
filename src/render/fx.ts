import { font } from './theme'

/** Fixed-size pools: nothing is allocated per hit, so long booth sessions stay flat in memory. */
const MAX_P = 320
const MAX_T = 16

export interface Fx {
  burst(x: number, y: number, color: string, count: number, speed?: number): void
  ring(x: number, y: number, color: string, r: number): void
  float(s: string, x: number, y: number, color: string, px?: number): void
  shake(amount: number): void
  update(dtMs: number): void
  draw(ctx: CanvasRenderingContext2D): void
  offset(): { x: number; y: number }
  clear(): void
}

export function createFx(reducedMotion: boolean): Fx {
  const px = new Float32Array(MAX_P), py = new Float32Array(MAX_P), vx = new Float32Array(MAX_P), vy = new Float32Array(MAX_P)
  const life = new Float32Array(MAX_P), max = new Float32Array(MAX_P), size = new Float32Array(MAX_P)
  const color: string[] = new Array(MAX_P).fill('#fff')
  let next = 0
  const rings = Array.from({ length: 12 }, () => ({ x: 0, y: 0, r: 0, life: 0, color: '#fff' }))
  let ringNext = 0
  const texts = Array.from({ length: MAX_T }, () => ({ s: '', x: 0, y: 0, color: '#fff', px: 40, life: 0 }))
  let textNext = 0
  let shakeAmt = 0
  let shakeT = 0

  return {
    burst(x, y, c, count, speed = 420) {
      const n = reducedMotion ? Math.ceil(count / 3) : count
      for (let i = 0; i < n; i++) {
        const k = next++ % MAX_P
        const a = Math.random() * Math.PI * 2
        const v = speed * (0.35 + Math.random() * 0.65)
        px[k] = x; py[k] = y; vx[k] = Math.cos(a) * v; vy[k] = Math.sin(a) * v
        max[k] = life[k] = 350 + Math.random() * 350
        size[k] = 2 + Math.random() * 4
        color[k] = c
      }
    },
    ring(x, y, c, r) {
      const o = rings[ringNext++ % rings.length]
      o.x = x; o.y = y; o.r = r; o.life = 380; o.color = c
    },
    float(s, x, y, c, size = 44) {
      const o = texts[textNext++ % MAX_T]
      o.s = s; o.x = x; o.y = y; o.color = c; o.px = size; o.life = 900
    },
    shake(amount) {
      if (!reducedMotion) shakeAmt = Math.max(shakeAmt, amount)
    },
    update(dt) {
      const s = dt / 1000
      for (let k = 0; k < MAX_P; k++) {
        if (life[k] <= 0) continue
        life[k] -= dt
        px[k] += vx[k] * s; py[k] += vy[k] * s
        vx[k] *= 0.92; vy[k] = vy[k] * 0.92 + 600 * s
      }
      for (const r of rings) if (r.life > 0) r.life -= dt
      for (const t of texts) if (t.life > 0) { t.life -= dt; t.y -= 50 * s }
      shakeAmt = Math.max(0, shakeAmt - dt * 0.06)
      shakeT += dt
    },
    draw(ctx) {
      for (let k = 0; k < MAX_P; k++) {
        if (life[k] <= 0) continue
        ctx.globalAlpha = life[k] / max[k]
        ctx.fillStyle = color[k]
        ctx.fillRect(px[k] - size[k] / 2, py[k] - size[k] / 2, size[k], size[k])
      }
      for (const r of rings) {
        if (r.life <= 0) continue
        const k = 1 - r.life / 380
        ctx.globalAlpha = 1 - k
        ctx.strokeStyle = r.color
        ctx.lineWidth = 6 * (1 - k) + 1
        ctx.beginPath()
        ctx.arc(r.x, r.y, r.r * (1 + k * 1.4), 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      for (const t of texts) {
        if (t.life <= 0) continue
        ctx.globalAlpha = Math.min(1, t.life / 300)
        ctx.font = font(t.px, 900)
        ctx.fillStyle = t.color
        ctx.fillText(t.s, t.x, t.y)
      }
      ctx.globalAlpha = 1
    },
    offset() {
      if (shakeAmt <= 0) return { x: 0, y: 0 }
      return { x: Math.sin(shakeT * 0.11) * shakeAmt, y: Math.cos(shakeT * 0.13) * shakeAmt }
    },
    clear() {
      life.fill(0)
      for (const r of rings) r.life = 0
      for (const t of texts) t.life = 0
      shakeAmt = 0
    },
  }
}

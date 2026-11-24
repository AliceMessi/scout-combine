import type { RunRecord } from '../store'
import { C, panel, text } from './theme'

export interface BoardViewState {
  top: RunRecord[]
  best: { reaction: RunRecord | null; flick: RunRecord | null; lastHit: RunRecord | null }
  count: number
  nowPlaying: string | null
}

function drawDrillCard(
  ctx: CanvasRenderingContext2D,
  title: string,
  record: RunRecord | null,
  score: number | null,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  panel(ctx, x, y, w, h)
  text(ctx, title, x + 24, y + 36, 22, C.cyan, { align: 'left', spacing: 1 })

  if (record && score !== null) {
    text(ctx, record.tag, x + 24, y + 105, 42, C.white, { align: 'left', glow: C.cyan })
    text(ctx, record.role, x + 24, y + 155, 22, C.dim, { align: 'left' })
    text(ctx, String(score), x + w - 30, y + 115, 56, C.gold, { align: 'right', glow: C.gold })
  } else {
    text(ctx, '—', x + w / 2, y + h / 2 + 10, 48, C.dim)
  }
}

export function drawBoard(
  ctx: CanvasRenderingContext2D,
  state: BoardViewState,
  offlineError: boolean,
) {
  // Title top left
  text(ctx, "TODAY'S SCOUTS", 70, 58, 44, C.cyan, { align: 'left', glow: C.cyan })

  if (offlineError) {
    text(ctx, 'OFFLINE DATA — CHECK THE GAME WINDOW', 480, 60, 18, C.orange, {
      align: 'left',
      weight: 700,
    })
  }

  // Left 2/3: Top-10 Table
  const tableX = 70
  const tableY = 100
  const tableW = 960
  const tableH = 710
  panel(ctx, tableX, tableY, tableW, tableH)

  // Table Headers
  text(ctx, 'RANK', tableX + 40, tableY + 35, 18, C.dim, { align: 'left' })
  text(ctx, 'TAG', tableX + 160, tableY + 35, 18, C.dim, { align: 'left' })
  text(ctx, 'ROLE', tableX + 400, tableY + 35, 18, C.dim, { align: 'left' })
  text(ctx, 'OVERALL', tableX + tableW - 40, tableY + 35, 18, C.dim, { align: 'right' })

  // Header separator line
  ctx.save()
  ctx.strokeStyle = C.cyanDim
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(tableX + 30, tableY + 60)
  ctx.lineTo(tableX + tableW - 30, tableY + 60)
  ctx.stroke()
  ctx.restore()

  if (state.top.length === 0) {
    text(
      ctx,
      'NO SCOUTS YET TODAY — BE THE FIRST',
      tableX + tableW / 2,
      tableY + tableH / 2,
      32,
      C.dim,
    )
  } else {
    // Row 1: Large readable from 3m (at least 48px logical)
    const r1 = state.top[0]
    const row1Y = tableY + 115

    text(ctx, '#1', tableX + 40, row1Y, 48, C.gold, { align: 'left', glow: C.gold })
    text(ctx, r1.tag, tableX + 160, row1Y, 48, C.white, { align: 'left', glow: C.cyan })
    text(ctx, r1.role, tableX + 400, row1Y, 32, C.cyan, { align: 'left' })
    text(ctx, String(r1.scores.overall), tableX + tableW - 40, row1Y, 52, C.gold, {
      align: 'right',
      glow: C.gold,
    })

    // Rows 2-10
    for (let i = 1; i < state.top.length; i++) {
      const r = state.top[i]
      const rowY = tableY + 185 + (i - 1) * 55
      const rankColor = i < 3 ? C.gold : C.dim
      const scoreColor = i < 3 ? C.gold : C.white

      text(ctx, `#${i + 1}`, tableX + 40, rowY, 28, rankColor, { align: 'left' })
      text(ctx, r.tag, tableX + 160, rowY, 32, C.white, { align: 'left' })
      text(ctx, r.role, tableX + 400, rowY, 24, C.dim, { align: 'left' })
      text(ctx, String(r.scores.overall), tableX + tableW - 40, rowY, 34, scoreColor, {
        align: 'right',
      })
    }
  }

  // Right 1/3: Best cards
  const cardX = 1060
  const cardW = 470
  const cardH = 220

  drawDrillCard(
    ctx,
    'BEST REACTION',
    state.best.reaction,
    state.best.reaction?.scores.reaction ?? null,
    cardX,
    100,
    cardW,
    cardH,
  )

  drawDrillCard(
    ctx,
    'BEST FLICK',
    state.best.flick,
    state.best.flick?.scores.flick ?? null,
    cardX,
    345,
    cardW,
    cardH,
  )

  drawDrillCard(
    ctx,
    'BEST LAST HIT',
    state.best.lastHit,
    state.best.lastHit?.scores.lastHit ?? null,
    cardX,
    590,
    cardW,
    cardH,
  )

  // Bottom row: Runs today and Now Playing
  text(ctx, `RUNS TODAY: ${state.count}`, 70, 855, 24, C.dim, {
    align: 'left',
    weight: 700,
  })

  if (state.nowPlaying) {
    text(ctx, `NOW PLAYING: ${state.nowPlaying}`, 1530, 855, 24, C.green, {
      align: 'right',
      glow: C.green,
    })
  } else {
    text(ctx, 'NOW PLAYING: —', 1530, 855, 24, C.dim, { align: 'right' })
  }
}

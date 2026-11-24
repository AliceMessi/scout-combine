const BLOCKED = new Set([
  'ASS', 'FUK', 'FUC', 'FCK', 'FKU', 'SEX', 'CUM', 'TIT', 'DIK', 'DIC', 'COK', 'KKK', 'NIG', 'NGR', 'FAG', 'CNT', 'VAG', 'PNS',
])

export function isAllowedTag(tag: string): boolean {
  return /^[A-Z]{3}$/.test(tag) && !BLOCKED.has(tag)
}

/** Positions on the 1600 x 900 play area, shared by hit-testing and drawing. */
export const TAG_LAYOUT = {
  letters: [0, 1, 2].map(i => ({ x: 800 + (i - 1) * 190, y: 450, upY: 300, downY: 600 })),
  arrowW: 150,
  arrowH: 100,
  go: { x: 800, y: 775, w: 340, h: 104 },
}

export type TagHit = { kind: 'up' | 'down'; i: number } | { kind: 'go' } | null

export function tagHitTest(x: number, y: number): TagHit {
  const { letters, arrowW, arrowH, go } = TAG_LAYOUT
  for (let i = 0; i < 3; i++) {
    const l = letters[i]
    if (Math.abs(x - l.x) <= arrowW / 2) {
      if (Math.abs(y - l.upY) <= arrowH / 2) return { kind: 'up', i }
      if (Math.abs(y - l.downY) <= arrowH / 2) return { kind: 'down', i }
    }
  }
  if (Math.abs(x - go.x) <= go.w / 2 && Math.abs(y - go.y) <= go.h / 2) return { kind: 'go' }
  return null
}

/** Longest simulation sub-step, in game ms. Keeps drills exact whatever the clock scale. */
export const MAX_STEP_MS = 8

export interface Clock {
  /** Advance by one real frame; returns the game-time sub-steps to simulate, each <= MAX_STEP_MS. */
  tick(realDtMs: number): number[]
  /** Game ms elapsed since creation. */
  now(): number
}

export function createClock(opts: { scale: number; maxFrameMs?: number }): Clock {
  const maxFrame = opts.maxFrameMs ?? 250
  let t = 0
  return {
    tick(realDtMs) {
      if (!(realDtMs > 0)) return []
      let left = Math.min(realDtMs, maxFrame) * opts.scale
      t += left
      const steps: number[] = []
      while (left > 1e-9) {
        const s = Math.min(MAX_STEP_MS, left)
        steps.push(s)
        left -= s
      }
      return steps
    },
    now: () => t,
  }
}

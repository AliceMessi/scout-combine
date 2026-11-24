/** One action press, in logical play-area coordinates (1600 x 900). Key presses carry the pointer position. */
export type Press = { x: number; y: number; source: 'pointer' | 'key' }

export type DrillName = 'reaction' | 'flick' | 'lasthit'

/** Something worth a sound or an effect. Purely informative. */
export type DrillEvent = { type: string; [k: string]: unknown }

/**
 * A drill is a pure state machine on game time. `step` first advances time by `dtMs`,
 * then applies the presses as happening at the new time.
 */
export interface Drill<M, V> {
  readonly name: DrillName
  readonly durationMs: number
  step(dtMs: number, presses: Press[]): DrillEvent[]
  done(): boolean
  metrics(): M
  view(): V
}

export const PLAY_W = 1600
export const PLAY_H = 900

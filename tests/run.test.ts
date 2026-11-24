import { describe, expect, it } from 'vitest'
import { createRun, type Run } from '../src/run'
import { mulberry32 } from '../src/rng'
import { TAG_LAYOUT } from '../src/tag'
import type { Press } from '../src/drills/types'

const GO: Press = { x: TAG_LAYOUT.go.x, y: TAG_LAYOUT.go.y, source: 'pointer' }
const K: Press = { x: 0, y: 0, source: 'key' }

function playDrill(r: Run) {
  const name = r.drill
  for (let i = 0; i < 100 && r.phase === 'drill' && r.drill === name; i++) r.step(1000, [K], [])
}

describe('run flow', () => {
  it('goes tag -> rule -> drills -> card -> over', () => {
    const r = createRun(mulberry32(1), 'BOB')
    expect(r.phase).toBe('tag')
    expect(r.tag.letters.join('')).toBe('BOB')
    r.step(16, [GO], [])
    expect([r.phase, r.drill]).toEqual(['rule', 'reaction'])
    r.step(1999, [K], [])
    expect(r.phase).toBe('rule')
    r.step(1, [], [])
    expect([r.phase, r.drill]).toEqual(['drill', 'reaction'])
    playDrill(r)
    expect([r.phase, r.drill]).toEqual(['rule', 'flick'])
    r.step(2000, [], [])
    playDrill(r)
    expect([r.phase, r.drill]).toEqual(['rule', 'lasthit'])
    r.step(2000, [], [])
    playDrill(r)
    expect(r.phase).toBe('card')
    const res = r.result()!
    expect(res.tag).toBe('BOB')
    expect(res.scores.overall).toBe(Math.round((res.scores.reaction + res.scores.flick + res.scores.lastHit) / 3))
    expect(['Opener', 'Marksman', 'Finisher', 'Flex']).toContain(res.role)
    r.step(19999, [], [])
    expect(r.phase).toBe('card')
    r.step(1, [], [])
    expect(r.phase).toBe('over')
  })
  it('a press on the card ends it early (after a short guard)', () => {
    const r = toCard()
    r.step(500, [K], [])
    expect(r.phase).toBe('card')
    r.step(500, [K], [])
    expect(r.phase).toBe('over')
  })
  it('no input for 15 s during a drill abandons the run', () => {
    const r = createRun(mulberry32(2), 'AAA')
    r.step(16, [GO], [])
    r.step(2000, [], [])
    r.step(14999, [], [])
    expect(r.phase).toBe('drill')
    r.step(1, [], [])
    expect(r.phase).toBe('abandoned')
    expect(r.result()).toBeNull()
  })
  it('no input for 15 s on the tag screen abandons the run', () => {
    const r = createRun(mulberry32(2), 'AAA')
    r.step(15000, [], [])
    expect(r.phase).toBe('abandoned')
  })
  it('arrows edit the tag; a blocked tag is refused', () => {
    const r = createRun(mulberry32(3), 'ASR')
    r.step(16, [], ['right', 'right', 'up']) // ASR -> ASS
    expect(r.tag.letters.join('')).toBe('ASS')
    r.step(16, [GO], [])
    expect(r.phase).toBe('tag')
    expect(r.tag.invalid).toBe(true)
    r.step(16, [], ['down', 'down']) // ASS -> ASQ
    r.step(16, [K], []) // action key confirms
    expect(r.phase).toBe('rule')
  })
  it('letters wrap around and a bad last tag falls back to AAA', () => {
    const r = createRun(mulberry32(3), 'x1')
    expect(r.tag.letters.join('')).toBe('AAA')
    r.step(16, [], ['down'])
    expect(r.tag.letters.join('')).toBe('ZAA')
  })
})

function toCard(): Run {
  const r = createRun(mulberry32(4), 'AAA')
  r.step(16, [GO], [])
  for (let d = 0; d < 3; d++) {
    r.step(2000, [], [])
    playDrill(r)
  }
  expect(r.phase).toBe('card')
  return r
}

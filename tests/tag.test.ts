import { describe, expect, it } from 'vitest'
import { isAllowedTag, tagHitTest, TAG_LAYOUT } from '../src/tag'

describe('tags', () => {
  it('accepts three capital letters only', () => {
    expect(isAllowedTag('ABC')).toBe(true)
    expect(isAllowedTag('AB1')).toBe(false)
    expect(isAllowedTag('abc')).toBe(false)
    expect(isAllowedTag('ABCD')).toBe(false)
  })
  it('rejects blocklisted tags', () => {
    expect(isAllowedTag('ASS')).toBe(false)
    expect(isAllowedTag('KKK')).toBe(false)
  })
  it('hit-tests arrows and GO', () => {
    const { letters, go } = TAG_LAYOUT
    expect(tagHitTest(letters[0].x, letters[0].upY)).toEqual({ kind: 'up', i: 0 })
    expect(tagHitTest(letters[2].x, letters[2].downY)).toEqual({ kind: 'down', i: 2 })
    expect(tagHitTest(go.x, go.y)).toEqual({ kind: 'go' })
    expect(tagHitTest(5, 5)).toBeNull()
  })
})

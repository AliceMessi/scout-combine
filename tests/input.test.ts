import { describe, expect, it } from 'vitest'
import { toLogical } from '../src/input'

const rect = (w: number, h: number, left = 0, top = 0) => ({ left, top, width: w, height: h }) as DOMRect

describe('toLogical', () => {
  it('toLogical maps letterboxed pointer', () => {
    expect(toLogical(960, 600, rect(1920, 1200))).toEqual({ x: 800, y: 450 })
  })
  it('handles pillarbox and an offset canvas', () => {
    // 2000 x 900 window: scale 1, 200 px bars left and right
    expect(toLogical(200 + 10, 900, rect(2000, 900))).toEqual({ x: 10, y: 900 })
    expect(toLogical(110, 70, rect(800, 450, 100, 50))).toEqual({ x: 20, y: 40 })
  })
})

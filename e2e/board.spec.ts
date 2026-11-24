import { expect, test } from '@playwright/test'
import { collectErrors, scout } from './helpers'

type BoardHook = { runs(): { tag: string }[]; liveMsg(): { type: string } | null; offlineError(): boolean }
const board = (page: import('@playwright/test').Page) => ({
  tags: () => page.evaluate(() => (window as unknown as { __board: BoardHook }).__board.runs().map(r => r.tag)),
  live: () => page.evaluate(() => (window as unknown as { __board: BoardHook }).__board.liveMsg()?.type ?? null),
})

test('the board window shows the run live and lists it when it ends', async ({ context }) => {
  const boardPage = await context.newPage()
  const boardErrors = collectErrors(boardPage)
  await boardPage.goto('/board.html')
  expect(await board(boardPage).tags()).toEqual([])

  const game = await context.newPage()
  const gameErrors = collectErrors(game)
  await game.goto('/?autoplay=sharp&speed=20')
  await expect.poll(() => board(boardPage).live(), { timeout: 30_000 }).toBe('drill')
  await expect.poll(() => scout(game).runs(), { timeout: 30_000 }).toBe(1)
  await expect.poll(() => board(boardPage).tags(), { timeout: 10_000 }).toEqual(['AAA'])
  expect(boardErrors).toEqual([])
  expect(gameErrors).toEqual([])
})

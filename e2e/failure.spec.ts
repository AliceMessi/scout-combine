import { expect, test } from '@playwright/test'
import { waitPhase } from './helpers'

test('with storage broken the run still plays and the operator menu counts the errors', async ({ page }) => {
  await page.addInitScript(() => {
    indexedDB.open = () => {
      throw new DOMException('blocked for the test', 'UnknownError')
    }
  })
  await page.goto('/?autoplay=sharp&speed=20')
  await waitPhase(page, 'card')
  await page.keyboard.press('Control+Shift+O')
  const info = await page.locator('#operator p').first().textContent()
  const errors = Number(/Errors: (\d+)/.exec(info ?? '')?.[1])
  expect(errors).toBeGreaterThanOrEqual(2) // storage could not open + the run was not saved
})

test('a board that cannot read storage says so instead of showing an empty board', async ({ page }) => {
  await page.addInitScript(() => {
    indexedDB.open = () => {
      throw new DOMException('blocked for the test', 'UnknownError')
    }
  })
  await page.goto('/board.html')
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __board: { status(): string } }).__board.status()))
    .toBe('unavailable')
  await page.screenshot({ path: 'test-results/board-unavailable.png' })
})

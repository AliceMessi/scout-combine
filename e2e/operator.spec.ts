import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { collectErrors, scout } from './helpers'

test('operator menu exports the saved runs as a CSV download', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/?autoplay=sharp&speed=20')
  await expect.poll(() => scout(page).runs(), { timeout: 30_000 }).toBe(1)
  await page.keyboard.press('Control+Shift+O')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export CSV' }).click(),
  ])
  expect(download.suggestedFilename()).toMatch(/^scout-combine-\d{4}-\d{2}-\d{2}\.csv$/)
  const lines = readFileSync(await download.path(), 'utf-8').trim().split('\n')
  expect(lines[0]).toBe('id,day,endedAt,tag,role,overall,reaction,flick,lastHit')
  expect(lines.length).toBeGreaterThanOrEqual(2)
  expect(lines[1].split(',')[3]).toBe('BOT')
  await expect(page.locator('#operator .status')).toHaveText(/^Exported \d+ runs?$/)
  expect(errors).toEqual([])
})

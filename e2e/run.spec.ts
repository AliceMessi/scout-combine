import { expect, test } from '@playwright/test'
import { collectErrors, scout, waitPhase } from './helpers'

test('a click on the attract screen opens the tag screen', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/')
  await expect.poll(() => scout(page).phase()).toBe('attract')
  await page.mouse.click(800, 450)
  await expect.poll(() => scout(page).phase()).toBe('tag')
  expect(errors).toEqual([])
})

test('a bot run goes from tag to card, is saved, and the next run starts clean', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/?autoplay=sharp&speed=20')
  const s = scout(page)
  await waitPhase(page, 'drill')
  await waitPhase(page, 'card')
  await expect.poll(s.runs, { timeout: 10_000 }).toBe(1)
  // The card ends, the run is dropped and autoplay starts a fresh one.
  await waitPhase(page, 'drill')
  expect(await s.runs()).toBe(1)
  expect(errors).toEqual([])
})

import { expect, test } from '@playwright/test'
import { collectErrors, scout } from './helpers'

test('after one visit the game loads with the network off', async ({ page, context }) => {
  const errors = collectErrors(page)
  await page.goto('/')
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
    if (!navigator.serviceWorker.controller)
      await new Promise(r => navigator.serviceWorker.addEventListener('controllerchange', r, { once: true }))
  })
  await context.setOffline(true)
  await page.reload()
  await expect.poll(() => scout(page).phase()).toBe('attract')
  await page.mouse.click(800, 450)
  await expect.poll(() => scout(page).phase()).toBe('tag')
  await context.setOffline(false)
  expect(errors).toEqual([])
})

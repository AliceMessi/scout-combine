import type { Page } from '@playwright/test'

/** Collects console errors and uncaught exceptions of a page. */
export function collectErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', m => {
    if (m.type() === 'error') errors.push(m.text())
  })
  page.on('pageerror', e => errors.push(String(e)))
  return errors
}

type Hook = { phase(): string; drill(): string | null; runs(): number }
export const scout = (page: Page) => ({
  phase: () => page.evaluate(() => (window as unknown as { __scout: Hook }).__scout.phase()),
  runs: () => page.evaluate(() => (window as unknown as { __scout: Hook }).__scout.runs()),
})

/** Waits, checking every animation frame inside the page, until the game reaches `phase` (short phases can't be missed). */
export function waitPhase(page: Page, phase: string, timeoutMs = 30_000) {
  return page.evaluate(
    ([want, ms]) =>
      new Promise<void>((resolve, reject) => {
        const end = performance.now() + Number(ms)
        const check = () => {
          if ((window as unknown as { __scout: Hook }).__scout.phase() === want) resolve()
          else if (performance.now() > end) reject(new Error(`phase ${want} not reached`))
          else requestAnimationFrame(check)
        }
        check()
      }),
    [phase, timeoutMs] as const,
  )
}

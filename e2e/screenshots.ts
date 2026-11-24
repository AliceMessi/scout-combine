/**
 * README screenshots of the production build: npx tsx e2e/screenshots.ts [baseUrl]
 * (needs `npx vite preview --port 5180` running). Writes docs/media/*.png.
 */
import { chromium, type Page } from '@playwright/test'

const BASE = process.argv[2] ?? 'http://localhost:5180/'
const out = (n: string) => new URL(`../docs/media/${n}.png`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
type Hook = { phase(): string; drill(): string | null; runs(): number }

async function until(page: Page, f: (h: Hook) => boolean, ms = 120_000) {
  await page.waitForFunction(
    src => new Function('h', `return (${src})(h)`)((window as unknown as { __scout: Hook }).__scout),
    f.toString(),
    { timeout: ms, polling: 'raf' },
  )
}

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } })
const game = await ctx.newPage()
await game.goto(BASE)
await game.waitForTimeout(2500)
await game.screenshot({ path: out('attract') })
await game.mouse.click(800, 450)
await until(game, h => h.phase() === 'tag')
await game.waitForTimeout(400)
await game.screenshot({ path: out('tag') })

// A sharp bot plays the drills; shots are taken a few seconds into each one.
const bot = await ctx.newPage()
await bot.goto(new URL('?autoplay=sharp', BASE).toString())
for (const d of ['reaction', 'flick', 'lasthit']) {
  await until(bot, new Function('h', `return h.phase() === 'drill' && h.drill() === '${d}'`) as (h: Hook) => boolean)
  await bot.waitForTimeout(d === 'reaction' ? 9000 : 6000)
  await bot.screenshot({ path: out(d) })
}
await until(bot, h => h.phase() === 'card')
await bot.waitForTimeout(1200)
await bot.screenshot({ path: out('card') })

const board = await ctx.newPage()
await board.goto(new URL('board.html', BASE).toString())
await board.waitForTimeout(1500)
await board.screenshot({ path: out('board') })
await browser.close()
console.log('screenshots written to docs/media')

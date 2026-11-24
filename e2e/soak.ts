/**
 * Booth soak test: 2000 bot runs at 200x speed, then 10 minutes of real-time play.
 * Usage: npm run build && npx vite preview --port 5180 --strictPort (in another shell), then
 *   npx tsx e2e/soak.ts [baseUrl] [runs] [minutes]
 * Writes docs/SOAK.md.
 */
import { chromium, type Page } from '@playwright/test'
import { writeFileSync } from 'node:fs'
import os from 'node:os'

const BASE = process.argv[2] ?? 'http://localhost:5180/'
const RUNS = Number(process.argv[3] ?? 2000)
const MINUTES = Number(process.argv[4] ?? 10)
const MB = 1024 * 1024

const errors: string[] = []

function watch(page: Page) {
  page.on('console', m => {
    if (m.type() === 'error') errors.push(m.text())
  })
  page.on('pageerror', e => errors.push(String(e)))
}

async function snapshot(page: Page) {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('HeapProfiler.enable')
  await cdp.send('HeapProfiler.collectGarbage')
  await cdp.detach()
  return page.evaluate(() => ({
    heap: (performance as unknown as { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize,
    dom: document.getElementsByTagName('*').length,
  }))
}

async function waitRuns(page: Page, n: number) {
  const t0 = Date.now()
  let last = -1
  for (;;) {
    const r = await page.evaluate(() => (window as unknown as { __scout: { runs(): number } }).__scout.runs())
    if (r >= n) return
    if (r !== last && r % 100 === 0) console.log(`runs ${r} after ${Math.round((Date.now() - t0) / 1000)} s`)
    last = r
    if (Date.now() - t0 > 3 * 3600_000) throw new Error(`timed out at ${r} runs`)
    await page.waitForTimeout(2000)
  }
}

function stats(xs: number[]) {
  const s = [...xs].sort((a, b) => a - b)
  const q = (p: number) => s[Math.min(s.length - 1, Math.floor(p * s.length))]
  return { n: s.length, p50: q(0.5), p95: q(0.95), p99: q(0.99), max: s[s.length - 1] }
}

const browser = await chromium.launch({ args: ['--enable-precise-memory-info'] })
const context = await browser.newContext({ viewport: { width: 1600, height: 900 } })
// Time every animation frame callback (the game's update + draw) and the gap between frames.
await context.addInitScript(() => {
  const w = window as unknown as { __work: number[]; __gap: number[] }
  w.__work = []
  w.__gap = []
  const orig = window.requestAnimationFrame.bind(window)
  let prev = 0
  window.requestAnimationFrame = cb =>
    orig(t => {
      if (prev) w.__gap.push(t - prev)
      prev = t
      const s = performance.now()
      cb(t)
      w.__work.push(performance.now() - s)
      if (w.__work.length > 200_000) {
        w.__work.length = 0
        w.__gap.length = 0
      }
    })
})

const page = await context.newPage()
watch(page)
const fast = new URL('?autoplay=average&speed=200', BASE).toString()
console.log(`soak: ${RUNS} runs at ${fast}`)
const started = Date.now()
await page.goto(fast)
await waitRuns(page, Math.min(100, RUNS))
const at100 = await snapshot(page)
console.log('at 100', at100)
await waitRuns(page, RUNS)
const atEnd = await snapshot(page)
console.log(`at ${RUNS}`, atEnd)
const fastMinutes = (Date.now() - started) / 60000

const real = new URL('?autoplay=average', BASE).toString()
console.log(`real time: ${MINUTES} min at ${real}`)
await page.goto(real)
await page.waitForTimeout(MINUTES * 60_000)
const frames = await page.evaluate(() => {
  const w = window as unknown as { __work: number[]; __gap: number[]; __scout: { runs(): number } }
  return { work: w.__work.slice(10), gap: w.__gap.slice(10), runs: w.__scout.runs() }
})
const version = browser.version()
await browser.close()

const work = stats(frames.work)
const gap = stats(frames.gap)
const heapOk = atEnd.heap <= at100.heap + 5 * MB
const domOk = atEnd.dom === at100.dom
const frameOk = work.p95 < 16.7
const errOk = errors.length === 0
const f = (x: number) => x.toFixed(2)
const pass = (b: boolean) => (b ? 'PASS' : '**FAIL**')
const cpu = os.cpus()[0]?.model.trim() ?? 'unknown'

const md = `# Soak test

Run on ${new Date().toISOString().slice(0, 10)} with \`npx tsx e2e/soak.ts\` against the production build (\`vite preview\`).

**Machine:** ${cpu}, ${os.cpus().length} threads, ${Math.round(os.totalmem() / 1024 ** 3)} GB RAM, ${os.platform()} ${os.release()}.
**Browser:** Playwright Chromium ${version}, headless, viewport 1600 x 900. Headless canvas drawing runs in software (no GPU), so frame times here are a pessimistic bound for the booth PC.

## Part 1: ${RUNS} runs back to back

\`?autoplay=average&speed=200\`: a bot plays complete runs (tag, three drills, card, back to attract) at 200x game speed. Every run is saved to IndexedDB. Took ${fastMinutes.toFixed(1)} minutes.

| Check | After 100 runs | After ${RUNS} runs | Criterion | Result |
|---|---|---|---|---|
| JS heap after forced GC | ${f(at100.heap / MB)} MB | ${f(atEnd.heap / MB)} MB | at most +5 MB | ${pass(heapOk)} |
| DOM elements | ${at100.dom} | ${atEnd.dom} | equal | ${pass(domOk)} |

## Part 2: ${MINUTES} minutes in real time

\`?autoplay=average\` at normal speed: ${frames.runs} runs saved.

| Per frame | Frames | p50 | p95 | p99 | max | Criterion | Result |
|---|---|---|---|---|---|---|---|
| Game work (update + draw) | ${work.n} | ${f(work.p50)} ms | ${f(work.p95)} ms | ${f(work.p99)} ms | ${f(work.max)} ms | p95 < 16.7 ms | ${pass(frameOk)} |
| Gap between frames | ${gap.n} | ${f(gap.p50)} ms | ${f(gap.p95)} ms | ${f(gap.p99)} ms | ${f(gap.max)} ms | (for reference) | |

## Console errors

${errOk ? 'None in either part: **PASS**.' : `**FAIL**: ${errors.length} errors.\n\n${errors.slice(0, 20).map(e => `- \`${e.replace(/`/g, "'")}\``).join('\n')}`}
`
writeFileSync(new URL('../docs/SOAK.md', import.meta.url), md)
console.log(md)
process.exit(heapOk && domOk && frameOk && errOk ? 0 : 1)

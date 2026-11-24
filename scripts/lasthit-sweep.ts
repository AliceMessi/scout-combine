import { createBot, type BotLevel } from '../src/bot'
import { createLastHit, LASTHIT_TUNING } from '../src/drills/lasthit'
import { mulberry32 } from '../src/rng'
import { lastHitScore } from '../src/scoring'

function play(level: BotLevel, seed: number, tuning: typeof LASTHIT_TUNING) {
  const d = createLastHit(mulberry32(seed), tuning)
  const bot = createBot(level, mulberry32(seed * 7 + 1))
  let now = 0
  while (!d.done()) { now += 8; d.step(8, bot.presses('lasthit', d.view(), now)) }
  const m = d.metrics()
  return lastHitScore(m.lastHits, m.units)
}
const med = (xs: number[]) => xs.sort((a, b) => a - b)[xs.length >> 1]
for (const chunkMin of [10, 14, 18, 22]) for (const intervalMin of [350, 450, 550]) {
  const t = { ...LASTHIT_TUNING, chunkMin, intervalMin }
  const r = (['casual', 'average', 'sharp'] as BotLevel[]).map(l => med(Array.from({ length: 120 }, (_, i) => play(l, 900 + i, t))))
  console.log(`chunk ${chunkMin} int ${intervalMin}: casual ${r[0]} average ${r[1]} sharp ${r[2]}`)
}

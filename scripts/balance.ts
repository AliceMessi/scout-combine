// Balance report: 200 headless runs per bot level -> docs/BALANCE.md
import { writeFileSync } from 'node:fs'
import { playHeadless, type BotLevel } from '../src/bot'

const N = 200
const q = (xs: number[], p: number) => {
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.min(s.length - 1, Math.floor(p * s.length))]
}
const rows: string[] = []
for (const level of ['casual', 'average', 'sharp'] as BotLevel[]) {
  const runs = Array.from({ length: N }, (_, i) => playHeadless(level, 50000 + i))
  for (const key of ['reaction', 'flick', 'lastHit', 'overall'] as const) {
    const xs = runs.map(r => r.scores[key])
    rows.push(`| ${level} | ${key} | ${q(xs, 0.1)} | ${q(xs, 0.5)} | ${q(xs, 0.9)} |`)
  }
}
const md = `# Balance check

${N} headless runs per bot level (\`npx tsx scripts/balance.ts\`), same drill and scoring code as the game, 8 ms steps.
The bots model three kinds of player (see \`src/bot.ts\`): reaction time mean/sd 330/60, 260/40, 200/25 ms; Flick throughput 3.0, 4.5, 6.0 bit/s with 15%, 8%, 3% misses; Last Hit reads the ally rhythm from the health bar and times its shot with an error sd of 150, 70, 30 ms.

What we want: the three levels clearly separated, and scores spread over most of the 0-100 range so a booth leaderboard means something.

| Bot | Drill | p10 | median | p90 |
|---|---|---|---|---|
${rows.join('\n')}

Generated ${new Date().toISOString().slice(0, 10)}.
`
writeFileSync('docs/BALANCE.md', md)
console.log(md)

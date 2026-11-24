# Balance check

200 headless runs per bot level (`npx tsx scripts/balance.ts`), same drill and scoring code as the game, 8 ms steps.
The bots model three kinds of player (see `src/bot.ts`): reaction time mean/sd 330/60, 260/40, 200/25 ms; Flick throughput 3.0, 4.5, 6.0 bit/s with 15%, 8%, 3% misses; Last Hit reads the ally rhythm from the health bar and times its shot with an error sd of 150, 70, 30 ms.

What we want: the three levels clearly separated, and scores spread over most of the 0-100 range so a booth leaderboard means something.

| Bot | Drill | p10 | median | p90 |
|---|---|---|---|---|
| casual | reaction | 5 | 19 | 29 |
| casual | flick | 6 | 9 | 12 |
| casual | lastHit | 38 | 50 | 63 |
| casual | overall | 19 | 26 | 32 |
| average | reaction | 38 | 48 | 55 |
| average | flick | 40 | 43 | 47 |
| average | lastHit | 56 | 69 | 81 |
| average | overall | 48 | 54 | 59 |
| sharp | reaction | 67 | 73 | 77 |
| sharp | flick | 77 | 81 | 85 |
| sharp | lastHit | 75 | 88 | 94 |
| sharp | overall | 75 | 80 | 84 |

Generated 2026-11-24.

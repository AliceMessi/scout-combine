# Project rules for Junie (Scout Combine)

Scout Combine is a booth mini game: three skill drills (Reaction, Flick, Last Hit) and a scouting card, with an offline leaderboard on a second window. The design is in `docs/specs/2026-11-24-scout-combine-design.md`; the task list is in `docs/plans/2026-11-24-scout-combine.md`. Follow them exactly.

- TypeScript, Vite, Canvas 2D, Web Audio. No image, sound or font files: draw and synthesise everything in code.
- Logical play area 1600 x 900. Drill coordinates are logical.
- `src/drills/*` and `src/scoring.ts` are pure: no DOM, no timers, no `Math.random`. Randomness comes from an injected `Rng`.
- Scores are integers 0-100.
- Tests first with Vitest (`npm test`). Every change keeps `npm run typecheck` and `npm test` green.
- All UI text in English. No Riot, Cloud9 or JetBrains names or logos inside the game.
- Pin dependencies to exact versions released at least 14 days ago.
- Never read or print `.env` files or anything that looks like a key or token.

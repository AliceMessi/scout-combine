# Junie task 9: live board on the second monitor

Read first: `.junie/guidelines.md`, section 5 of `docs/specs/2026-11-24-scout-combine-design.md`, and "Task 9" in `docs/plans/2026-11-24-scout-combine.md`. This brief adds the details the plan leaves open.

## What to build

A second page, `board.html`, that booth staff open in another window and drag to the second monitor. It shows today's leaderboard and what is being played right now. No server and no network: data comes from the same IndexedDB as the game (`src/store.ts`), live updates from a `BroadcastChannel`.

## Files

- Create `src/live.ts`, `src/boardState.ts`, `src/board.ts`, `src/render/board.ts`, `board.html`.
- Create `tests/live.test.ts`, `tests/boardState.test.ts`.
- Modify `vite.config.ts` (two inputs: `index.html` and `board.html`) and `src/main.ts` (post live messages).

## Interfaces (exact)

```ts
// src/live.ts
export type LiveMsg =
  | { type: 'run-start'; tag: string }
  | { type: 'drill'; tag: string; drill: 'reaction' | 'flick' | 'lasthit' }
  | { type: 'run-end'; record: RunRecord }
  | { type: 'idle' }
export function createLive(name?: string /* 'scout-combine' */, BC?: typeof BroadcastChannel):
  { post(m: LiveMsg): void; on(cb: (m: LiveMsg) => void): void; close(): void }

// src/boardState.ts (pure: no DOM, no Date.now)
export function boardState(today: RunRecord[], live: LiveMsg | null): {
  top: RunRecord[]          // at most 10, overall desc
  best: { reaction: RunRecord | null; flick: RunRecord | null; lastHit: RunRecord | null }
  count: number             // runs today
  nowPlaying: string | null // e.g. "ABC — FLICK"
}
```

## Tests first (watch each fail before writing the code)

`tests/boardState.test.ts`:
- `top` sorted by `scores.overall` descending.
- **ties keep earlier run first**: equal overall → smaller `endedAt` first, then smaller `id`.
- `top` capped at 10 when there are 12 runs; `count` is 12.
- `best` per drill picks the highest drill score (same tie rule).
- `nowPlaying` is `"ABC — FLICK"` after `{type:'drill', tag:'ABC', drill:'flick'}` (`LAST HIT` for `lasthit`), `"ABC"` after `run-start`, and `null` after `run-end`, `idle` or `null`.
- **new day shows empty board**: `boardState([], null)` → empty `top`, `count` 0, all `best` null, no throw.

`tests/live.test.ts`: with a fake BroadcastChannel class (two instances on the same name share listeners), a message posted by one `createLive` reaches `on` of another; `close()` stops delivery.

## Behaviour

- `board.ts` opens the store, loads `byDay(localDay(new Date()))`, renders, and reloads on every `run-end` message and once a minute (so the board empties itself at midnight).
- **A failed read is never an empty board.** If `byDay` rejects, keep showing the last good data and draw a small "OFFLINE DATA — CHECK THE GAME WINDOW" line. Never write to the store from the board.
- `main.ts` posts: `run-start` with the tag and then `drill` when a run leaves the tag screen (first `phase: 'rule'` event); `drill` at each later `phase: 'rule'`; `run-end` with the saved `RunRecord` only after `store.save` succeeds; `idle` when a run ends or is abandoned. The attract-screen demo run never posts.
- Rendering: canvas, logical 1600 x 900, letterboxed like the game; reuse `src/render/theme.ts` (`C`, `font`, `text`, `panel`, `drawSky` with `dim = true`). Readable from 3 m: the #1 row is at least 48 px logical. Layout: title "TODAY'S SCOUTS" top left, top-10 table (rank, tag, role, overall) on the left two-thirds, "BEST REACTION / BEST FLICK / BEST LAST HIT" cards on the right, "RUNS TODAY: N" and the "NOW PLAYING" line at the bottom. Empty board text: "NO SCOUTS YET TODAY — BE THE FIRST".
- No infinite work: redraw only when data or the now-playing line changes, plus a slow ambient redraw at most 2 times a second; pause while `document.hidden`; respect `prefers-reduced-motion`.

## Done when

`npm run typecheck` and `npm test` are green, `npm run build` emits both pages, and opening `/board.html` next to `/?autoplay=sharp&speed=20` on `npm run preview` shows the bot's tag in the table after one run. Do not commit; the maintainer reviews and commits.

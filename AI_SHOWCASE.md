# AI-powered workflow (JetBrains tools)

How Scout Combine was built with JetBrains WebStorm and Junie, task by task, and where Claude Code did the work instead. Each row says what the tool produced, what we changed afterwards and which tests prove it. The method behind it (spec, plan, tests first, review) is in [`docs/METHODOLOGY.md`](docs/METHODOLOGY.md).

## In short

- **WebStorm 2026.3** is the project IDE. The scripts run from its shared run configurations (`dev`, `test`, `e2e`, `soak`, `balance`), committed in `.idea/runConfigurations` together with the project files WebStorm created when the project was opened.
- **Junie CLI** built two complete features headless from written briefs, with their tests: the live leaderboard for the second monitor (9 files) and the CSV export. Each took a few minutes and well under a dollar of AI credits. We reviewed both, changed nothing in Junie's code, and added end-to-end tests around them.
- **Claude Code** wrote the spec and the plan, most of the game, the bots, the soak test and the reviews.
- **Rules for every agent:** `.junie/guidelines.md` (pure drill code, injected randomness, tests first, no asset files, no trademarks, pinned dependencies). The Junie briefs are kept in `.junie/tasks/`.

## How we checked Junie's work

1. Read every changed file against the brief and the spec.
2. Broke the code on purpose to see the tests fail: inverting the tie rule of the board made 2 of Junie's tests fail.
3. Ran the full suite ourselves (unit, type check, build), then added Playwright tests that drive the real feature in Chromium: the board updating while a bot plays, the board loading offline, the CSV download read back from disk.
4. Looked at the result: screenshots of the board empty and full.

## Task by task

| # | Task | Tool | What it produced | What we changed | Tests |
|---|---|---|---|---|---|
| 1 | Project scaffold, WebStorm run configurations (`.idea/runConfigurations`) | Claude Code (configurations written for WebStorm) | Vite + TypeScript + Vitest project, `dev` and `test` run configurations | — | `npm test` green |
| 2–4 | Game clock with sub-steps; scoring; Reaction and Flick drills as pure state machines | Claude Code | `src/clock.ts`, `src/scoring.ts`, `src/drills/reaction.ts`, `src/drills/flick.ts`, tests first | Flick targets moved clear of the timer and stats line after playtesting showed overlap; spec updated and a test pins the zone | clock, scoring, reaction, flick tests |
| 5 | Last Hit drill state machine | Claude Code (done without Junie: the Junie CLI was not set up yet) | `src/drills/lasthit.ts` from spec 3.3, tests first | — | 7 tests in `tests/lasthit.test.ts` |
| 6 | Playable run: tag screen, rule cards, card, drawing, sound | Claude Code | Canvas renderer, synthesised audio, the run sequence, the scouting card | Played and approved by the team at a checkpoint before going further | run, tag, input, cardText tests |
| 7 | Bots at three skill levels, attract mode, balance check | Claude Code | `src/bot.ts`, `scripts/balance.ts`, [`docs/BALANCE.md`](docs/BALANCE.md) | The balance check showed Last Hit did not separate skill (all bots median 50): allies changed to a steady rhythm, 12 tunings swept, spec updated | bot tests, 600 headless runs |
| 8 | Saving runs, percentile on the card | Claude Code | `src/store.ts` (IndexedDB), `src/day.ts`, card line | — | store tests on fake-indexeddb |
| 9 | Live board on the second monitor (`board.html`, `src/live.ts`, `src/boardState.ts`, `src/board.ts`, `src/render/board.ts`, live messages in `src/main.ts`) | Junie CLI 3959.5, headless (`junie --task`), brief in `.junie/tasks/09-live-board.md` | All 9 files and 8 tests (ties, top 10, best per drill, now playing, new day, BroadcastChannel); it also moved the Vitest config into `vite.config.ts` so the Playwright files stay out of unit tests. About 6 minutes, 106 model calls, about US$0.26 of AI credits | Nothing in the code. We checked it: broke the tie rule on purpose (2 of Junie's tests failed), added the Playwright tests `e2e/board.spec.ts` and the board half of `e2e/offline.spec.ts`, and looked at the board empty and full | 85 unit tests, 5 e2e |
| 10 | Operator menu and booth hardening | Claude Code | `src/operator.ts`, `src/settings.ts`, pause when hidden or while the menu is open, error count | — | settings and operator tests, checked by hand in Chrome |
| 10b | Export CSV in the operator menu (`src/exportCsv.ts`, button wired in `src/main.ts`) | Junie CLI 3959.5, headless, brief in `.junie/tasks/10-export-csv.md` | The module and 4 tests (file name from the local day, Blob download through a temporary link, singular message, nothing downloaded when the read fails). About 2 minutes, 60 model calls, about US$0.09 of AI credits | Nothing in the code. We added `e2e/operator.spec.ts`: plays one run, opens the menu with Ctrl+Shift+O, clicks Export CSV and reads the real download in Chromium | 89 unit tests, 6 e2e |
| 11 | Offline service worker, end-to-end tests | Claude Code | `vite-plugin-pwa` setup, Playwright tests | A test showed the first visit was not under the service worker's control: fixed with `clientsClaim` | 6 Playwright tests |
| 12 | Soak test | Claude Code | `e2e/soak.ts`, [`docs/SOAK.md`](docs/SOAK.md): 2,000 runs, then 10 minutes in real time | — | all four pass criteria met |
| 13 | README, methodology, this file, security check | Claude Code | Docs; Gitleaks, OSV-Scanner and Semgrep on the repo | Minimum package age added to `.npmrc` after the Semgrep check | — |

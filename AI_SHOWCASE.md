# AI-powered workflow (JetBrains tools)

How the build used JetBrains WebStorm and Junie, task by task. Each entry says what the tool did and what we changed afterwards. Claude Code was also used for planning, review and scripting; it is named where it did the work.

| # | Task | Tool | What it produced | What we changed | Tests |
|---|---|---|---|---|---|
| 1 | Project scaffold, WebStorm run configurations (`.idea/runConfigurations`) | WebStorm + Claude Code | Vite + TypeScript + Vitest project, `dev` and `test` run configurations | — | `npm test` green |
| 5 | Last Hit drill state machine | Claude Code (done without Junie: the Junie CLI was not set up yet) | `src/drills/lasthit.ts` from spec 3.3, tests first | — | 7 tests in `tests/lasthit.test.ts` |
| 9 | Live board on the second monitor (`board.html`, `src/live.ts`, `src/boardState.ts`, `src/board.ts`, `src/render/board.ts`, live messages in `src/main.ts`) | Junie CLI 3959.5, headless (`junie --task`), brief in `.junie/tasks/09-live-board.md` | All 9 files and 8 tests (ties, top 10, best per drill, now playing, new day, BroadcastChannel); it also moved the Vitest config into `vite.config.ts` so the Playwright files stay out of unit tests. About 6 minutes, 106 model calls, about US$0.26 of AI credits | Nothing in the code. We checked it: broke the tie rule on purpose (2 of Junie's tests failed), added the Playwright tests `e2e/board.spec.ts` and the board half of `e2e/offline.spec.ts`, and looked at the board empty and full | 85 unit tests, 5 e2e |

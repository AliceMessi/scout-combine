# AI-powered workflow (JetBrains tools)

How the build used JetBrains WebStorm and Junie, task by task. Each entry says what the tool did and what we changed afterwards. Claude Code was also used for planning, review and scripting; it is named where it did the work.

| # | Task | Tool | What it produced | What we changed | Tests |
|---|---|---|---|---|---|
| 1 | Project scaffold, WebStorm run configurations (`.idea/runConfigurations`) | WebStorm + Claude Code | Vite + TypeScript + Vitest project, `dev` and `test` run configurations | — | `npm test` green |
| 5 | Last Hit drill state machine | Claude Code (done without Junie: the Junie CLI was not set up yet) | `src/drills/lasthit.ts` from spec 3.3, tests first | — | 7 tests in `tests/lasthit.test.ts` |

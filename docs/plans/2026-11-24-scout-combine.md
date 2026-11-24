# Scout Combine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A booth mini game (three skill drills → scouting card) with an offline second-screen leaderboard and a measured soak test, for Cloud9 × JetBrains Category 3.

**Architecture:** Pure, clock-driven drill state machines and scoring functions (fully unit-tested) under a thin Canvas 2D / Web Audio shell. A bot drives the same input path for attract mode, balance checks, e2e and the soak test. IndexedDB + BroadcastChannel connect the game window to the board window with no server.

**Tech Stack:** TypeScript, Vite, Vitest, fake-indexeddb, Playwright (Chromium), vite-plugin-pwa. Node 24, npm 10.

**Spec:** `docs/specs/2026-11-24-scout-combine-design.md`

**Order:** Tasks 1–6 produce a playable, good-looking slice of the whole run (no saving yet). **Task 6 ends with a user checkpoint**: the user plays it in the browser and says whether it looks good and is fun; their notes are applied before Task 7. Storage, board, offline and soak come after.

## Global Constraints

- Logical play area 1600 × 900; the renderer scales it to the window (letterboxed). All drill coordinates are logical.
- No image, sound or font files: everything drawn/synthesised in code; system font stack.
- All UI text in English. No Riot, Cloud9 or JetBrains logos or names in the game (JetBrains named only in docs).
- Every dependency pinned to an exact version at least 14 days old (`npm i -E`).
- Randomness only through an injected `Rng = () => number` (seeded `mulberry32` in `src/rng.ts`); `Math.random` only to seed it in `main.ts`.
- All scores are integers 0–100 (`Math.round` after clamping).
- Simulation advances in sub-steps of at most 8 ms, whatever the clock scale.
- `localStorage`/IndexedDB access always inside try/catch; a failed read is never treated as empty and never followed by a write.
- MIT `LICENSE` at the repo root. Commit `.idea/` shared files and `.junie/guidelines.md`; never `.idea/workspace.xml`.
- Commits: `git -c user.name=AliceMessi -c user.email=175329919+AliceMessi@users.noreply.github.com commit` with the trailers `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_012Tw2ZKPeKarATSuxYrmJb6`. Never force-push.
- **Junie tasks** (marked 🤖): run with Junie (CLI headless if the user's token is set up, otherwise prepared as a prompt the user starts in WebStorm). Log each in `AI_SHOWCASE.md`: prompt, what Junie produced, what we changed, test result. If Junie is unavailable, implement normally and log "done without Junie" — never claim Junie did it.

## Review Focus

1. A player who clicks frantically during the Reaction wait: every press must count as a false start once per trial, not many times. → Task 3 test `mashing counts one false start per trial`.
2. Window resized or moved to another monitor mid-run: pointer → logical coordinate mapping must stay right. → Task 6 test `toLogical maps letterboxed pointer`.
3. Tab hidden for minutes (staff alt-tabs), then shown: the run must not jump through a huge `dt`. → Task 2 test `clock clamps a long gap`.
4. Two runs ending within the same millisecond on the board, or equal scores: stable order. → Task 9 test `ties keep earlier run first`.
5. Board window opened before any run today, or after midnight: empty board for the new day, no crash. → Task 9 test `new day shows empty board`.

---

### Task 1: Project scaffold and JetBrains setup

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.ts` (placeholder canvas), `src/rng.ts`, `tests/rng.test.ts`, `LICENSE` (MIT, "Hoken Tech S.R.L."), `.gitignore`, `.junie/guidelines.md`, `.idea/runConfigurations/{dev,test}.xml`

**Interfaces:**
- Produces: `type Rng = () => number`; `mulberry32(seed: number): Rng`. npm scripts `dev`, `build`, `preview`, `test` (vitest run), `typecheck` (tsc --noEmit).

- [ ] **Step 1:** `npm create vite@latest . -- --template vanilla-ts` content written by hand (no generator prompts), then `npm i -D -E vitest typescript vite`.
- [ ] **Step 2: Failing test** `tests/rng.test.ts`: `mulberry32(42)` returns the same first 3 values on two instances; all values in [0,1).
- [ ] **Step 3:** Run `npm test` → FAIL (module missing). Implement `src/rng.ts`. Run → PASS.
- [ ] **Step 4:** `.junie/guidelines.md`: project rules for Junie (copy Global Constraints, "pure drills, no DOM in src/drills or src/scoring.ts", "tests first with Vitest").
- [ ] **Step 5:** `npm run typecheck && npm test && npm run build` → all succeed. Commit `chore: scaffold Vite + TS + Vitest`.

### Task 2: Game clock

**Files:** Create `src/clock.ts`; Test `tests/clock.test.ts`

**Interfaces:**
- Produces: `createClock(opts: { scale: number; maxFrameMs?: number /* default 250 */ }): Clock` with `Clock.tick(realDtMs: number): number[]` returning sub-step durations (each ≤ 8 ms, summing to `min(realDtMs, maxFrameMs) × scale`), and `Clock.now(): number` (game ms elapsed).

- [ ] **Step 1: Failing tests:** `tick(16)` at scale 1 → `[8, 8]`; `tick(20)` → `[8, 8, 4]`; scale 10, `tick(16)` → 20 sub-steps summing 160; **`clock clamps a long gap`**: `tick(600000)` at scale 1 sums to 250.
- [ ] **Step 2:** Run → FAIL. Implement. Run → PASS. Commit `feat: game clock with sub-steps`.

### Task 3: Scoring and the Reaction drill

**Files:** Create `src/scoring.ts`, `src/drills/types.ts`, `src/drills/reaction.ts`; Test `tests/scoring.test.ts`, `tests/reaction.test.ts`

**Interfaces:**
- Produces (`src/drills/types.ts`):
  - `type Press = { x: number; y: number; source: 'pointer' | 'key' }`
  - `interface Drill<M, V> { readonly name: 'reaction' | 'flick' | 'lasthit'; readonly durationMs: number; step(dtMs: number, presses: Press[]): DrillEvent[]; done(): boolean; metrics(): M; view(): V }`
  - `type DrillEvent = { type: string; [k: string]: unknown }` (used only for sound/juice)
- Produces (`src/scoring.ts`): `reactionScore(medianMs: number | null, falseStarts: number): number`, `flickScore(meanTp: number, hits: number, misses: number): number`, `lastHitScore(lastHits: number, units: number): number`, `fittsTp(distance: number, width: number, mtMs: number): number`, `overallScore(s: Scores): number`, `roleOf(s: Scores): Role`, `percentile(overall: number, today: number[]): number | null`; `type Scores = { reaction: number; flick: number; lastHit: number }`; `type Role = 'Opener' | 'Marksman' | 'Finisher' | 'Flex'`.
- Produces (`src/drills/reaction.ts`): `createReaction(rng: Rng): Drill<ReactionMetrics, ReactionView>`; `ReactionMetrics = { medianMs: number | null; trials: number; falseStarts: number }`; `ReactionView = { phase: 'wait' | 'signal' | 'feedback'; lastMs: number | null; tooEarly: boolean; remainingMs: number }`.

- [ ] **Step 1: Failing scoring tests:** `reactionScore(150,0)=100`, `(400,0)=0`, `(275,0)=50`, `(275,2)=40`, `(100,0)=100`, `(500,0)=0`, `(null,0)=0`, `(390,3)=0`; `flickScore(6.5,10,0)=100`, `(2.5,10,0)=0`, `(4.5,9,1)=45`, `(6.5,2,0)=0`; `lastHitScore(14,19)=74`, `(0,0)=0`; `fittsTp(600,60,1000)≈3.459`; `overallScore({80,60,70})=70`; `roleOf({90,60,70})='Opener'`, `({70,75,79})='Flex'`, ties pick Reaction > Flick > Last Hit; `percentile(70,[50,60,70,80,90])=40`, `percentile(70,[50,60,70,80])=null`.
- [ ] **Step 2: Failing Reaction tests** (rng always 0.5 → delay 2000 ms; feedback lasts 600 ms then a new trial): press at 1500 ms → `falseStarts=1`, view `tooEarly`; press 50 ms after signal → false start; press 250 ms after signal → `lastMs=250`, `trials=1`; **`mashing counts one false start per trial`**: 10 presses inside one wait → `falseStarts=1`; after 30000 ms `done()` is true and presses are ignored; `medianMs` of [200, 300, 250] is 250.
- [ ] **Step 3:** Run → FAIL. Implement (delay `1000 + rng()*2000`; feedback phase 600 ms). Run → PASS. Commit `feat: scoring and Reaction drill`.

### Task 4: Flick drill

**Files:** Create `src/drills/flick.ts`; Test `tests/flick.test.ts`

**Interfaces:**
- Produces: `createFlick(rng: Rng): Drill<FlickMetrics, FlickView>`; `FlickMetrics = { throughput: number; hits: number; misses: number }`; `FlickView = { target: { x: number; y: number; r: number }; remainingMs: number; lastHit: { x: number; y: number } | null }`.

- [ ] **Step 1: Failing tests:** first target's distance measured from (800, 450); every new target ≥ 400 from the previous one (1000 spawns with a seeded rng) and fully inside the play area; radius 36 at t=0 and 16.2 at t=35000 (linear); a pointer press inside → `hits+1` and a new target; outside → `misses+1`, same target; `source:'key'` presses are ignored; `throughput` = mean of `fittsTp(D, 2r, mt)` over hits; done after 35000 ms.
- [ ] **Step 2:** Run → FAIL. Implement (rejection sampling for spawn). Run → PASS. Commit `feat: Flick drill`.

### Task 5: Last Hit drill 🤖

**Files:** Create `src/drills/lasthit.ts`; Test `tests/lasthit.test.ts`

**Interfaces:**
- Produces: `createLastHit(rng: Rng): Drill<LastHitMetrics, LastHitView>`; `LastHitMetrics = { lastHits: number; early: number; missed: number; units: number }`; `LastHitView = { hp: number /* 0-100 */; markHp: 30; shotInFlightMs: number | null; cooldownMs: number; remainingMs: number; lastOutcome: 'last' | 'early' | 'missed' | null }`.

- [ ] **Step 1: Failing tests** (rng always 0 → ally chunk 8, interval 400 ms; max hp 100; player damage 30; shot lands 350 ms after the press; 800 ms cooldown starting when an early shot lands; next unit 300 ms after a death): no presses → unit dies at 5200 ms, `missed=1, units=1`; press at 0 → at 350 hp 70, `early=1`, a press at 900 is ignored (cooldown until 1150); press at 3600 (hp 28 at landing 3950) → `lastHits=1`; a shot in flight when allies kill the unit → `missed`, shot discarded; presses from pointer and key both fire; done after 35000 ms; units alive at the end are not counted.
- [ ] **Step 2:** Run → FAIL. Implement. Run → PASS. Log in `AI_SHOWCASE.md`. Commit `feat: Last Hit drill`.

### Task 6: Playable slice — input, run flow, look and sound

**Files:** Create `src/input.ts`, `src/run.ts`, `src/render/{theme,attract,tag,rule,reaction,flick,lasthit,card,hud}.ts`, `src/audio.ts`, `src/tag.ts`; Modify `src/main.ts`; Test `tests/run.test.ts`, `tests/input.test.ts`, `tests/tag.test.ts`

**Interfaces:**
- Consumes: Tasks 2–5.
- Produces: `toLogical(clientX: number, clientY: number, rect: DOMRect): { x: number; y: number }`; `createRun(rng: Rng, lastTag: string): Run` with `Run.step(dtMs, presses: Press[], arrows: ('up'|'down'|'left'|'right')[]): void`, `Run.phase: 'tag' | 'rule' | 'drill' | 'card' | 'over' | 'abandoned'`, `Run.drill: 'reaction' | 'flick' | 'lasthit' | null`, `Run.result(): { tag: string; scores: Scores & { overall: number }; role: Role; metrics: {...} } | null`; `isAllowedTag(tag: string): boolean`.
- Look: navy `#0b1530` background with a slow procedural sky gradient, cyan `#4fc3f7` for interactive things, white text, gold `#ffc94d` for last hits and records; big bold system font; hit pops, short screen shake (off with `prefers-reduced-motion`), synthesised clicks/chimes. Rule cards: Reaction "CLICK WHEN IT TURNS GREEN", Flick "CLICK THE TARGETS", Last Hit "SHOOT WHEN HEALTH IS UNDER THE LINE — YOUR SHOT TAKES A MOMENT". Signal change = colour **and** shape (circle → diamond). Card (spec 4): tag, role, overall, radar of the three scores, the raw metric under each score ("median 231 ms", "4.8 bit/s at 92% accuracy", "14/19 last hits"), one tip for the weakest drill from a fixed list of three in `src/render/card.ts`; percentile line shows "—" until Task 8.

- [ ] **Step 1: Failing tests:** `toLogical maps letterboxed pointer` (window 1920×1200 → 1600×900 scaled 1.2 with 60 px bars: client (960,600) → (800,450)); `isAllowedTag('ABC')` true, `'AB1'` false, a blocklisted tag false; run goes tag → rule(2000 ms) → reaction → rule → flick → rule → lasthit → card(20000 ms) → over; a press on the card ends it early; no press for 15000 ms during a drill → `abandoned` and `result()` null.
- [ ] **Step 2:** Run → FAIL. Implement logic, then rendering and audio (attract screen shows the title and "CLICK TO START"; bot comes in Task 7). Run → PASS; `npm run build` succeeds.
- [ ] **Step 3: Play it.** `npx vite preview --port 5180`, play three full runs in Chrome at 1600×900 and at a phone-sized window; screenshot each screen to `docs/shots/`. Fix anything unreadable or broken.
- [ ] **Step 4:** Commit `feat: playable run with drills, card, look and sound`.
- [ ] **Step 5: USER CHECKPOINT.** Open the game for the user; ask (Italian) whether it looks good and is fun, drill by drill. Write their notes to the ledger; apply agreed changes (each with a test if it changes a rule or a number) before Task 7. Update the spec if a number changes.

### Task 7: Bot, attract mode and balance check

**Files:** Create `src/bot.ts`, `scripts/balance.ts`, `docs/BALANCE.md`; Modify `src/main.ts`, `src/render/attract.ts`; Test `tests/bot.test.ts`

**Interfaces:**
- Produces: `createBot(level: 'casual' | 'average' | 'sharp', rng: Rng): Bot`; `Bot.presses(drill: 'reaction' | 'flick' | 'lasthit', view: ReactionView | FlickView | LastHitView, nowMs: number): Press[]`. Levels: reaction mean/sd 330/60, 260/40, 200/25 ms; flick throughput 3.0/4.5/6.0 bit/s, miss rate 15/8/3%; last hit aim error sd 9/5/2 hp. URL params read in `main.ts`: `autoplay=<level>` (bot plays every phase, picks tag "BOT", skips the card after 2 s) and `speed=<n>` (clock scale).

- [ ] **Step 1: Failing test:** 50 headless runs per level with seeded rngs: median overall casual < average < sharp; sharp median ≥ 60; casual median ≤ 45.
- [ ] **Step 2:** Run → FAIL. Implement. Run → PASS.
- [ ] **Step 3:** `npx tsx scripts/balance.ts` (200 runs per level) writes `docs/BALANCE.md` (median, p10, p90 per drill and overall). If ranges are poor, tune drill constants only with the user's checkpoint notes in mind and update the spec.
- [ ] **Step 4:** Attract mode runs the bot ("sharp") at speed 1 behind the title. Commit `feat: bot, attract mode, balance report`.

### Task 8: Saving runs

**Files:** Create `src/store.ts`, `src/day.ts`; Modify `src/run.ts`, `src/render/card.ts`, `src/main.ts`; Test `tests/store.test.ts`, `tests/day.test.ts`

**Interfaces:**
- Produces: `localDay(d: Date): string` (YYYY-MM-DD, local time); `openStore(idb?: IDBFactory): Promise<Store>`; `Store.save(r: RunRecord): Promise<void>`; `Store.byDay(day: string): Promise<RunRecord[]>` (rejects on failure, never resolves `[]` for a failure); `Store.all(): Promise<RunRecord[]>`; `Store.clearDay(day: string): Promise<void>`; `toCsv(rs: RunRecord[]): string`. `RunRecord` exactly as spec section 7.
- Card: percentile from `byDay(today)` including the just-saved run; "Early bird — not enough players yet" when `null`; "Not saved — tell the booth staff" when `save` rejects.

- [ ] **Step 1: Failing tests** (fake-indexeddb): save then `byDay` returns it; other days excluded; `byDay` on a broken factory rejects; `toCsv` header `id,day,endedAt,tag,role,overall,reaction,flick,lastHit` and one line per run with a tag containing no commas; `localDay(new Date(2026,0,5,23,59))='2026-01-05'`.
- [ ] **Step 2:** Run → FAIL. Implement; `npm i -D -E fake-indexeddb`. Run → PASS. Commit `feat: save runs, percentile on the card`.

### Task 9: Live board on the second monitor 🤖

**Files:** Create `board.html`, `src/board.ts`, `src/boardState.ts`, `src/live.ts`, `src/render/board.ts`; Modify `vite.config.ts` (two inputs), `src/main.ts`; Test `tests/boardState.test.ts`, `tests/live.test.ts`

**Interfaces:**
- Produces: `type LiveMsg = { type: 'run-start'; tag: string } | { type: 'drill'; tag: string; drill: 'reaction' | 'flick' | 'lasthit' } | { type: 'run-end'; record: RunRecord } | { type: 'idle' }`; `createLive(name = 'scout-combine', BC = BroadcastChannel): { post(m: LiveMsg): void; on(cb: (m: LiveMsg) => void): void; close(): void }`; `boardState(today: RunRecord[], live: LiveMsg | null): { top: RunRecord[] /* ≤10 */; best: { reaction: RunRecord | null; flick: RunRecord | null; lastHit: RunRecord | null }; count: number; nowPlaying: string | null }`.

- [ ] **Step 1: Failing tests:** top sorted by overall desc; **`ties keep earlier run first`** (equal overall → smaller `endedAt` first, then `id`); top capped at 10; best per drill; `nowPlaying` "ABC — FLICK" after a `drill` message and null after `run-end`/`idle`; **`new day shows empty board`** (records only from yesterday → empty top, count 0, no throw); `createLive` with a fake BroadcastChannel delivers messages.
- [ ] **Step 2:** Run → FAIL. Implement; board reloads `byDay(localDay(now))` on every `run-end` and once a minute (day change). Board styling matches the game, readable from 3 m (top row ≥ 48 px logical). Run → PASS. Log in `AI_SHOWCASE.md`. Commit `feat: live board on a second window`.

### Task 10: Operator menu and booth hardening

**Files:** Create `src/operator.ts`, `src/settings.ts`; Modify `src/main.ts`; Test `tests/settings.test.ts`

**Interfaces:**
- Produces: `loadSettings(ls?: Storage): Settings`, `saveSettings(s: Settings, ls?: Storage): void`; `Settings = { sound: boolean }`; default `{ sound: true }` when storage throws or holds junk. Menu on `Ctrl+Shift+O`: Export CSV (🤖 download via Blob URL), Clear today (two confirmations in-page, no `window.confirm`), Sound, Fullscreen, error count.
- Hardening in `main.ts`: loop pauses on `visibilitychange` hidden; one set of listeners created at start-up; `window.onerror`/`unhandledrejection` increment the error count.

- [ ] **Step 1: Failing tests:** `loadSettings` with a throwing storage → defaults; with `'{bad'` → defaults; round-trip save/load.
- [ ] **Step 2:** Run → FAIL. Implement. Run → PASS. Manually check the menu in Chrome. Commit `feat: operator menu and booth hardening`.

### Task 11: Offline and end-to-end tests

**Files:** Modify `vite.config.ts` (vite-plugin-pwa, precache all build output, both pages); Create `playwright.config.ts`, `e2e/run.spec.ts`, `e2e/board.spec.ts`, `e2e/offline.spec.ts`

**Interfaces:**
- Consumes: `autoplay`, `speed` URL params (Task 7); `window.__runs: number` incremented on every saved run (set in `main.ts`).

- [ ] **Step 1:** `npm i -D -E @playwright/test vite-plugin-pwa`; `npx playwright install chromium`.
- [ ] **Step 2: Tests:** `run.spec` — `index.html?autoplay=sharp&speed=20` reaches the card and returns to attract, `__runs` becomes 1, no console errors; `board.spec` — board page in a second page of the same context shows the bot's tag in the top list after one run; `offline.spec` — load once, `context.setOffline(true)`, reload both pages, they render.
- [ ] **Step 3:** `npm run build && npx playwright test` → all pass. Commit `test: e2e run, board and offline`.

### Task 12: Soak test (booth proof)

**Files:** Create `e2e/soak.ts`, `docs/SOAK.md`

- [ ] **Step 1:** `e2e/soak.ts` (run with `npx tsx`): Chromium with `--enable-precise-memory-info`, `index.html?autoplay=average&speed=200`; after a forced GC (CDP `HeapProfiler.collectGarbage`) record `performance.memory.usedJSHeapSize` and `document.getElementsByTagName('*').length` at run 100 and run 2000; collect console errors; then reload at `speed=1` for 10 minutes and record per-frame times from `requestAnimationFrame` (p50/p95/max).
- [ ] **Step 2:** Run it. Pass criteria (spec 8): 0 console errors; heap at 2000 ≤ heap at 100 + 5 MB; DOM count equal; p95 frame < 16.7 ms. Write all numbers, the machine (CPU, GPU, Chrome version) and the date to `docs/SOAK.md`. If a criterion fails, fix the leak/slowdown (test first where it is logic) and rerun.
- [ ] **Step 3:** Commit `test: soak test, 2000 runs`.

### Task 13: Delivery docs and deploy

**Files:** Create `README.md`, `AI_SHOWCASE.md` (complete), `docs/METHODOLOGY.md`; Modify `.idea/runConfigurations` (add soak, e2e)

- [ ] **Step 1:** README: what it is, how to run at a booth (two windows, F11, operator menu), "For judges" table mapping each brief item to proof (tests, BALANCE.md, SOAK.md, screenshots), tooling explanation per JetBrains tool, limits.
- [ ] **Step 2:** Run the security preflight (`agentprize/scripts/security-preflight.ps1`) on the repo; fix findings.
- [ ] **Step 3:** **Ask the user** before creating the public GitHub repo `AliceMessi/scout-combine` and before the first Cloudflare Pages deploy (`npx wrangler pages deploy dist --project-name scout-combine-hoken-tech`). Then push and deploy; check the live URL offline after first load.
- [ ] **Step 4:** Commit `docs: README, methodology, AI showcase`.

(Video, Devpost text and the bonus write-up are prepared after this plan, with the video kit.)

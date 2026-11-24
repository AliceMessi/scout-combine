# Scout Combine — design

Date: 24/11/2026. Status: draft for review.
Event: Cloud9 × JetBrains "Sky's The Limit" 2026, Category 3 (Event Mini Game). Deadline 12/01/2027 20:00 CET.

## 1. Goal

A booth mini game that a fan finishes in about two minutes with a mouse or a single button and no tutorial. It measures three real competitive-gaming skills and ends with a "scouting card", the same kind of report Cloud9 coaches build for pros. It is built for a real booth: it resets cleanly between players, runs for hours without slowing down, and shows a live leaderboard on a second monitor with no Wi-Fi.

What the judges asked for, and where this design answers it:

| Brief | Section |
|---|---|
| Under 3 minutes, high replayability | 2 (≈ 2:00 per run, scores comparable across runs) |
| Mouse / arrow keys / one button, no tutorial | 2, 3 (mouse only; Reaction and Last Hit also take the action key; each drill shows its one rule for 2 s) |
| Resets cleanly, responsive under sustained use | 6, 8 (soak test with measured results) |
| A useful gamer skill | 3 (reaction, flick aim, last-hit timing) |
| Local live leaderboard on a separate monitor, works offline | 5 |
| Complete loop start → play → score screen | 2 |
| JetBrains tools actually used | 9 |

## 2. The run (about 2:00)

1. **Attract screen.** A bot plays the drills in the background. Text: "CLICK TO START". Any click or the action key starts.
2. **Tag.** Three arcade letters, chosen with the mouse (click a letter's up/down arrows) or arrow keys; "GO" confirms. Default tag is the last one used, so a queue of friends can go fast. No free text, no personal data. A small blocklist rejects offensive three-letter combinations.
3. **Drill 1, Reaction (30 s).**
4. **Drill 2, Flick (35 s).**
5. **Drill 3, Last Hit (35 s).**
6. **Scouting card (20 s, or a click to skip).** Then back to the attract screen.

Before each drill a 2-second card shows its single rule in one line ("Click when it turns green"). No other instructions exist.

A run abandoned for 15 s (no input during a drill) ends, is not saved, and returns to the attract screen.

## 3. Drills

All timings use the game clock (section 7), so tests and the bot can run faster than real time.

### 3.1 Reaction (30 s)

- Each trial: a neutral panel, then after a random delay of 1.0–3.0 s it switches to the signal (colour change **and** a shape change, so colour-blind players are not penalised). The player clicks or presses the action key.
- A press before the signal, or less than 100 ms after it, is a **false start**: "TOO EARLY", the trial restarts and the false start is counted.
- Trials repeat until 30 s have passed (typically 9–12 trials).
- **Metric:** median reaction time of valid trials (ms). **Score:** 150 ms → 100, 400 ms → 0, linear, clamped to 0–100, then minus 5 points per false start (min 0). No valid trial → 0.

### 3.2 Flick (35 s)

- One circular target at a time. Each new target appears at least 25% of the play-area width away from the previous one, so every hit is a flick. Targets stay between y = 100 and y = 820, clear of the timer and the stats line.
- The target radius starts at 4% of the play-area height and shrinks linearly to 1.8% by the end of the drill.
- Click inside: hit, next target. Click outside: miss (counted, target stays).
- **Metric:** Fitts throughput per hit, `TP = log2(D / W + 1) / MT` (D distance from the previous target, W target diameter, MT time from target appearance to hit, in seconds), averaged over hits; and accuracy `hits / (hits + misses)`.
- **Score:** mean TP 2.5 bit/s → 0, 6.5 bit/s → 100, linear and clamped, multiplied by accuracy. Fewer than 3 hits → 0.

### 3.3 Last Hit (35 s)

The farming skill of lane-based games, with original art and names.

- Units walk in a single lane, one "front" unit at a time. Allied attacks take chunks of 8–20% of its health at random intervals of 0.4–0.9 s.
- The player has a fixed damage shown as a marker on the health bar (30% of max health). A press (click anywhere or the action key) fires a shot that lands **350 ms later** (the attack wind-up), so the player must predict, not react.
- When the shot lands: health ≤ the player's damage → **last hit** (gold). Health above it → **early**: the shot removes the player's damage (30% of max health) but the unit survives, and the player cannot shoot for 0.8 s. If allied attacks kill the unit before the player's shot lands → **missed**.
- **Metric:** last hits, early hits, missed units.
- **Score:** `100 × lastHits / units`, where `units` is the number of units that died during the drill. No unit died → 0.

### 3.4 Overall and role

- **Overall** = mean of the three drill scores, rounded to an integer.
- **Role** on the card, from the best drill: Reaction → "Opener", Flick → "Marksman", Last Hit → "Finisher". If the three scores are within 10 points of each other → "Flex". Original names, no game trademarks.
- **Percentile:** the share of today's saved runs with a lower overall score. With fewer than 5 runs today the card says "Early bird — not enough players yet" instead.

## 4. Scouting card

A full-screen card in the style of a coach's report:
- tag, role, overall score, percentile;
- a three-axis radar chart (Reaction, Flick, Last Hit);
- the raw metric behind each score ("median 231 ms", "4.8 bit/s at 92% accuracy", "14/19 last hits") so the score is never a black box;
- one tip for the weakest drill, from a fixed list (e.g. "Wind-up is 350 ms: shoot when the bar is one ally hit above your mark").

No QR code or sharing link: that would need the internet at the booth.

## 5. Booth leaderboard (second monitor, offline)

- A second page, `board.html`, opened in another browser window on the same PC and dragged to the second monitor.
- **Storage:** IndexedDB on that PC (shared by both windows, same origin). **Live updates:** a `BroadcastChannel` message when a run starts, changes drill and ends. No server, no network.
- Shows: today's top 10 by overall score (tag, role, score), today's best per drill, number of runs today, and a "NOW PLAYING" line with the current tag and drill.
- **Day** = the PC's local calendar date. A new day starts an empty board; older runs stay stored for export.
- **Offline:** a service worker caches every file on first load, so after one online visit (or from a local static server) both pages work with the network unplugged.

## 6. Operator controls and robustness

- **Operator menu:** `Ctrl+Shift+O`, never shown to players. Options: export all runs as CSV (download), clear today's board (asks twice), sound on/off, fullscreen. Settings persist in `localStorage`.
- **Clean reset:** every run is a fresh `Run` object built from the attract screen. Input listeners, the animation loop, audio nodes and object pools are created once at start-up and reused; nothing is added per run.
- **No infinite work:** when the tab is hidden the loop pauses; `prefers-reduced-motion` turns off screen shake and particles.
- **Failure handling:** if IndexedDB fails (quota, private mode), the run still plays and the card shows the scores, with "Not saved — tell the booth staff"; a failed read is never treated as an empty board and never triggers a write. Errors are logged to the console and counted on the operator menu.

## 7. Architecture

TypeScript, Vite, Canvas 2D, Web Audio. No image, sound or font files: everything is drawn and synthesised in code (fonts from the system stack).

| Unit | Responsibility |
|---|---|
| `clock.ts` | Game clock: real time, or scaled/stepped time for tests and the bot |
| `input.ts` | One normalised input stream: pointer position, action press (mouse button or action key), arrows |
| `drills/reaction.ts`, `drills/flick.ts`, `drills/lasthit.ts` | Pure state machines: `step(dt, input) → events`; no drawing |
| `scoring.ts` | Pure functions from drill metrics to 0–100 scores, overall, role, percentile |
| `run.ts` | Sequence of a run (tag → drills → card), abandonment timer |
| `render/*.ts` | Canvas drawing per screen; reads state, never changes it |
| `audio.ts` | Synthesised sounds |
| `store.ts` | IndexedDB runs store, CSV export, day filter |
| `live.ts` | BroadcastChannel messages between game and board |
| `bot.ts` | Plays the drills through `input.ts` at a configurable skill level (attract mode, balance tests, soak test) |
| `main.ts`, `board.ts` | Entry points of `index.html` and `board.html` |

Run record saved in IndexedDB:

```ts
interface RunRecord {
  id: string            // random UUID
  day: string           // local date, YYYY-MM-DD
  endedAt: number       // epoch ms
  tag: string           // 3 letters A-Z
  scores: { reaction: number; flick: number; lastHit: number; overall: number }
  metrics: {
    reaction: { medianMs: number | null; trials: number; falseStarts: number }
    flick: { throughput: number; hits: number; misses: number }
    lastHit: { lastHits: number; early: number; missed: number; units: number }
  }
  role: 'Opener' | 'Marksman' | 'Finisher' | 'Flex'
}
```

## 8. Testing and proof

- **Unit tests (Vitest):** scoring at the boundaries listed in section 3; each drill state machine on a stepped clock (false start, too-fast press, flick miss, early / last hit / missed in Last Hit); role and percentile; store with `fake-indexeddb`, including the failed-read case.
- **End-to-end (Playwright, Chromium):** a full run from the attract screen to the card and back; the board window updates when a run ends; reload with the network off still works.
- **Balance check:** the bot at three skill levels (casual, average, sharp) plays 200 runs each; the score distributions must be ordered and spread over most of the 0–100 range. Results go to `docs/BALANCE.md`.
- **Soak test (the booth proof):** Playwright drives 2,000 consecutive runs with the bot on an accelerated clock, then 10 minutes in real time. Pass criteria: no console errors; JS heap after run 2,000 within 5 MB of the heap after run 100; DOM node count constant; p95 frame time under 16.7 ms during the real-time part. Results, with the machine used, go to `docs/SOAK.md` and are quoted in the submission.

## 9. JetBrains tools (Stage 1 is pass/fail on this)

- **WebStorm** is the project IDE: run configurations for dev server, tests and soak test are committed in `.idea/` (shared files only, never `workspace.xml`).
- **Junie** (CLI headless and in the IDE) does real, scoped tasks, for example: the Last Hit state machine from this spec, the board page, the CSV export, test cases from section 8. Each task, its prompt, what it produced and what we changed afterwards are logged in `AI_SHOWCASE.md` (bonus prize entry). `.junie/guidelines.md` holds the project rules for Junie and is committed.
- Claude Code is also used (planning, review, tooling); the write-up says so plainly. The rules allow other editors alongside JetBrains tools.

## 10. Delivery

- Public GitHub repo, MIT `LICENSE` at the root, README with run instructions and a "For judges" section mapping the brief to the proof.
- Live build on Cloudflare Pages (`scout-combine-hoken-tech.pages.dev`), usable offline after the first visit.
- Video under 3 minutes in English (uploaded unlisted, the user's decision of 23/11, accepting the risk against "public").
- Devpost text: features, tooling explanation per JetBrains tool, methodology write-up, link to `AI_SHOWCASE.md`.
- Entered as Hoken Tech S.R.L. (organisation), with Alfredo de Candia as representative.

## 11. Out of scope

A one-button mode (Flick needs aiming), online or global leaderboards, accounts, QR sharing, GRID data, multiplayer, Riot names or art, any paid service.

## 12. Open points

- Junie CLI needs a token from junie.jetbrains.com/cli, created by the user and kept in the local keys folder; confirm that AI Ultimate credits cover it.
- Whether Junie's IDE plugin writes a task history we can commit as extra evidence.

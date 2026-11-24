# How we built Scout Combine

A small team, a booth game and AI agents doing most of the typing. This is the method that kept it honest.

## 1. Brief → spec

We started from the category 3 brief (under 3 minutes, mouse or one button, no tutorial, clean reset, a real gamer skill, an offline leaderboard on a second monitor) and wrote a design spec before any code: [`docs/specs/2026-11-24-scout-combine-design.md`](specs/2026-11-24-scout-combine-design.md). It fixes the three drills, the exact scoring formulas, the run record, the booth rules and the pass criteria of the tests. The spec has a table mapping every line of the brief to the section that answers it. When something changed later, the spec was updated in the same commit, with the reason.

## 2. Spec → plan

The plan ([`docs/plans/2026-11-24-scout-combine.md`](plans/2026-11-24-scout-combine.md)) cut the work into 13 tasks. Each task names its files, the exact interfaces it produces for later tasks, the tests to write first and the command that proves it. Tasks marked 🤖 were reserved for Junie. The plan was ordered so that a **playable, good-looking slice of all three drills came at task 6**: the team played it and approved the look before we spent time on storage, the board and the soak test.

The plan also lists a "Review focus": inputs the tests might miss, such as button mashing, clicks in the letterbox bars, a long hidden-tab gap, leaderboard ties and the day changing at midnight.

## 3. Tests first, every task

Every task followed red → green: write the test, watch it fail for the right reason, write the code, watch it pass, run the whole suite. The drills are pure state machines with an injected random generator and a game clock, so a 35-second drill runs in a test in milliseconds, exactly as in the game.

When a test or a measurement disagreed with the plan, we did not bend the test. We recorded a ruling (what we decided, why, what it costs if wrong) in a progress ledger and moved on. Examples:

- Flick targets overlapped the timer text: the test failed first, then the play zone moved.
- The service worker did not control the first visit: the offline test failed first, then `clientsClaim` fixed it.
- An end-to-end test was flaky because the card lasts 0.1 s at 20x speed: we changed how the test watches the game (every animation frame), not the game.

## 4. Bots instead of guesses

Balance and robustness were measured with bots that play the real game code at three skill levels (casual, average, sharp), modelled on reaction time, Fitts throughput and timing error.

- **Balance check** ([`docs/BALANCE.md`](BALANCE.md)): 200 runs per level. The first version showed that Last Hit gave every level the same median (50): it rewarded luck, not skill. We made the allied drones hit with a steady rhythm a player can read, swept 12 tunings with the bots, and picked the one with the clearest separation (Last Hit medians 50 / 69 / 88; overall 26 / 54 / 80).
- **Soak test** ([`docs/SOAK.md`](SOAK.md)): 2,000 complete runs back to back on an accelerated clock, then 10 minutes in real time. Pass criteria fixed in the spec before the run: no console errors, heap within 5 MB, constant DOM, frame work under 16.7 ms at p95. All passed.
- **End-to-end tests** drive the production build in Chromium: a full run, the board updating in a second window, both pages loading with the network off, the CSV download.

## 5. Working with Junie

Junie got the two features that are self-contained and easy to specify: the live board and the CSV export. For each we wrote a brief in `.junie/tasks/` with the exact interfaces, the tests to write first, the behaviour that matters at a booth ("a failed read is never an empty board", "never write from the board", "no endless animation") and a definition of done. Junie ran headless (`junie --task`) in the project, followed `.junie/guidelines.md`, and was told not to commit, so every change came to us as a working tree to review.

We reviewed it like a colleague's pull request: read the diff, broke the code on purpose to check the tests could catch a bug, ran everything ourselves, added end-to-end tests around the feature, and looked at the screen. Then we committed it with Junie named in the commit message. Details and numbers: [`AI_SHOWCASE.md`](../AI_SHOWCASE.md).

## 6. Booth-first engineering

Choices made because this runs for hours on one PC at a noisy event:

- No network, no accounts, no personal data: a three-letter tag, IndexedDB on the PC, BroadcastChannel between the two windows, a service worker for offline reloads.
- No asset files: shapes, effects and sounds are generated in code, so nothing can fail to load.
- Everything created once at start-up (input listeners, audio graph, particle pools); each run is a fresh object, so a run cannot leak into the next.
- The loop pauses when the tab is hidden or the operator menu is open; the reduced-motion setting turns off screen shake and cuts particles to a third.
- Failures are visible, not silent: an unsaved run says so on the card, a board that cannot read the data keeps the last good data with a warning, and the operator menu counts errors.

## 7. Security and dependencies

Before publishing: Gitleaks on the whole git history and the build output, OSV-Scanner on the lockfile with offline databases, Semgrep on the source. Dependencies are pinned to exact versions released at least 14 days earlier. The two remaining OSV findings are in build-time tooling of the service-worker plugin (never shipped to players); their fixes are major versions the plugin has not adopted yet.

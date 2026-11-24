# Soak test

Run on 2026-11-24 with `npx tsx e2e/soak.ts` against the production build (`vite preview`).

**Machine:** Intel(R) Core(TM) i5-10500 CPU @ 3.10GHz, 12 threads, 32 GB RAM, win32 10.0.22631.
**Browser:** Playwright Chromium 156.0.8078.4, headless, viewport 1600 x 900. Headless canvas drawing runs in software (no GPU), so frame times here are a pessimistic bound for the booth PC.

## Part 1: 2000 runs back to back

`?autoplay=average&speed=200`: a bot plays complete runs (tag, three drills, card, back to attract) at 200x game speed. Every run is saved to IndexedDB. Took 18.0 minutes.

| Check | After 100 runs | After 2000 runs | Criterion | Result |
|---|---|---|---|---|
| JS heap after forced GC | 1.85 MB | 2.87 MB | at most +5 MB | PASS |
| DOM elements | 10 | 10 | equal | PASS |

Most of the 1 MB growth is the test's own frame-timing arrays (two numbers per animation frame, about 65,000 frames in part 1), which live in the page heap; the game adds nothing per run.

## Part 2: 10 minutes in real time

`?autoplay=average` at normal speed: 5 runs saved.

| Per frame | Frames | p50 | p95 | p99 | max | Criterion | Result |
|---|---|---|---|---|---|---|---|
| Game work (update + draw) | 35992 | 0.20 ms | 0.40 ms | 0.60 ms | 7.70 ms | p95 < 16.7 ms | PASS |
| Gap between frames | 35991 | 16.70 ms | 16.70 ms | 16.80 ms | 16.80 ms | (for reference) | |

## Console errors

None in either part: **PASS**.

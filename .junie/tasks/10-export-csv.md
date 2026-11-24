# Junie task 10b: Export CSV in the operator menu

Read first: `.junie/guidelines.md`, section 6 of `docs/specs/2026-11-24-scout-combine-design.md`, `src/store.ts` (`toCsv`, `Store.all`) and `src/operator.ts` (the `extra` buttons of `createOperatorMenu`).

## What to build

Booth staff press "Export CSV" in the operator menu (Ctrl+Shift+O) and the browser downloads every stored run, all days, as a CSV file. Offline, no network.

## Interfaces (exact)

```ts
// src/exportCsv.ts
export function csvFileName(d: Date): string // "scout-combine-YYYY-MM-DD.csv", local date (use localDay from src/day.ts)
export async function exportCsv(store: Store, now?: Date): Promise<string> // downloads; returns "Exported N runs" (or "Exported 1 run")
```

## Tests first (watch each fail before writing the code)

`tests/exportCsv.test.ts`:
- `csvFileName(new Date(2027, 0, 5, 23, 59))` is `"scout-combine-2027-01-05.csv"`.
- `exportCsv` with a fake store holding 2 runs and stubbed `URL.createObjectURL`/`revokeObjectURL` and `document.createElement('a')` returns `"Exported 2 runs"`, sets `download` to the file name, clicks the link once and revokes the URL.
- if `store.all()` rejects, `exportCsv` rejects (the menu shows "Failed: …"); nothing is downloaded.

## Behaviour

- Download through a `Blob` (`text/csv;charset=utf-8`) and a temporary `<a download>` that is removed after the click; revoke the object URL afterwards.
- Wire it in `src/main.ts`: pass `extra: [{ label: 'Export CSV', run: async () => { const s = await storeReady; if (!s) throw new Error('storage unavailable'); return exportCsv(s) } }]` to `createOperatorMenu`.

## Done when

`npm run typecheck` and `npm test` are green. Do not commit; the maintainer reviews and commits.

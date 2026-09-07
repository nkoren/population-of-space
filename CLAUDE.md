# The Population of Space

A static data-explorer website tracking the human presence in space, mission by mission and
person by person, since 1961. Think "Our World in Data" for people in orbit.

## Stack

- Vite + Svelte 5 (runes) + TypeScript. No SSR, no Next.js.
- Charts are hand-rolled SVG with d3-scale/d3-shape/d3-array; `src/lib/charts/TimeChart.svelte`
  is the single chart component and animates between any two aggregates.
- All aggregation happens client-side in `src/lib/data/engine.ts` from ~1.5k "stays" (one
  person's continuous stint in space). Adding a breakdown = adding an entry to
  `src/lib/data/dimensions.ts`; adding a measure = extending `METRICS` in `engine.ts`.
- Source data is YAML under `data/`; `scripts/build-data.ts` validates it and writes
  `public/data/dataset.json` (gitignored, rebuilt on `npm run dev` / `npm run build`; the dev server
  also watches `data/**` and rebuilds on change, see `watchData` in `vite.config.ts`).
- Production: `npm run build` then `npm start` (sirv serving `dist/`, SPA fallback). Railway
  can run exactly that.

## Commands

```
npm run dev        # rebuild data + Vite dev server on :5173
npm run validate   # check data only (exit 1 with a list of problems)
npm run data       # validate + write public/data/dataset.json
npm run build      # data + production build into dist/
npm run check      # svelte-check
npx tsx scripts/engine-smoke.ts   # numeric sanity check of the engine
```

## Extending the dataset (the main recurring task)

Read `docs/DATA.md` first; it defines the schema and semantics. Then:

1. `npm run validate` → note the "data complete through" date.
2. Find all crewed launches after that date. Good sources: Wikipedia "List of human
   spaceflights" (by year) and each mission's article infobox (UTC times, crew, operator).
   Also check whether any flight currently recorded with `landing: null` has since landed.
3. Append flights to `data/flights/<year>.yaml` in launch order, and new people to the end of
   `data/people.yaml`. Look up existing people with `grep -i "<surname>" data/people.yaml`
   before creating a record; ids must be reused, never duplicated.
4. `npm run validate`, fix anything it reports, repeat.
5. Report what was added, and anything uncertain (missing birth dates, approximate times), in
   `note` fields and in your summary. Never invent a birth date or a landing time.

Conventions that trip people up:
- Station crew who ride down on a different vehicle belong in that vehicle's `crew_down`.
- `sector` is the operator: NASA crew rotations on Crew Dragon are `government`; Axiom,
  Inspiration4, Polaris, Blue Origin are `commercial`.
- Space starts at the 100 km Kármán line. Virgin Galactic flights peak below it and are NOT
  recorded; New Shepard flights cross it and are.
- Times are UTC, quoted strings, `YYYY-MM-DDTHH:MM:SSZ`.

## Code conventions

- Svelte 5 runes (`$state`, `$derived`, `$props`), no legacy stores.
- Keep the engine pure; UI state lives in the views. Explorer state is mirrored to the URL
  query string so views are shareable.
- Prefer editing the YAML over adding special cases in code.

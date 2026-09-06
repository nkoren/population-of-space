# The Population of Space

A data explorer for the human presence in space, mission by mission and person by person,
since Vostok 1. Explore the population of space over time broken down by sex, nationality,
age, location (ISS, Tiangong, Mir, the Moon…), launch nation and government vs commercial.

## Run it

```
npm install
npm run dev          # http://localhost:5173
```

`npm run build` produces a fully static site in `dist/`; `npm start` serves it (this is what
Railway should run: build command `npm run build`, start command `npm start`).

## Layout

```
data/                YAML source of truth (people, flights per year, lookups) — see docs/DATA.md
scripts/             build-data.ts (validate + compile), import-xlsx.py (one-off migration)
src/lib/data/        types, loader, aggregation engine, breakdown dimensions
src/lib/charts/      TimeChart.svelte — the animated stacked/line/share chart
src/lib/views/       Home, Explorer, Missions, People, About
public/data/         dataset.json (generated, gitignored)
```

## Extending the data

See `docs/DATA.md`. Short version: append a flight to `data/flights/<year>.yaml`, add any new
people to `data/people.yaml`, run `npm run validate`, fix what it tells you. The validator
simulates the entire timeline so inconsistent crew lists cannot slip through. `CLAUDE.md`
contains the same recipe phrased for an AI assistant.

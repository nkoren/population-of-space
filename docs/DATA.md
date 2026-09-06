# The data

Everything the site shows is derived from the plain-text files in `data/`. They are the
source of truth; the spreadsheet they were migrated from is no longer maintained.

```
data/
  nations.yaml        lookup: ISO 3166-1 alpha-2 code -> name
  destinations.yaml   lookup: where a flight went (iss, tiangong, moon, ...)
  people.yaml         one record per person who has flown, in order of first launch
  flights/1961.yaml   one file per calendar year of launches, in launch order
  flights/…
```

`npm run data` validates all of it and compiles `public/data/dataset.json` for the app.
`npm run validate` does the checks without writing anything. Both print a readable list of
problems and exit non-zero if anything is wrong, so the loop is: edit YAML, run, fix, repeat.

## Flight record

```yaml
- id: soyuz-ms-27                      # unique slug; lowercase, hyphens
  name: Soyuz MS-27
  launch: '2025-04-08T05:47:15Z'       # UTC, quoted, seconds required (use :00 if unknown)
  landing: '2025-12-09T00:00:00Z'      # UTC; null if the vehicle is still in space
  launch_nation: RU                    # code from nations.yaml
  destination: iss                     # id from destinations.yaml
  sector: government                   # government | commercial
  crew_up: [sergey-ryzhikov, alexey-zubritsky, jonny-kim]
  crew_down: [sergey-ryzhikov, alexey-zubritsky, jonny-kim]
  wiki: https://en.wikipedia.org/wiki/Soyuz_MS-27
  note: optional free text            # e.g. sources, uncertainty, corrections
```

Semantics that matter:

- A person is "in space" from the `launch` of the flight whose `crew_up` lists them until the
  `landing` of the flight whose `crew_down` lists them. For station rotations those are
  different flights, and that is fine. `crew_up` and `crew_down` can be empty lists.
- `landing: null` means the vehicle is still up. The validator then treats the build time as
  "now". Set the landing as soon as it happens.
- `sector` describes who operated the flight, not who paid. Crew Dragon flying a NASA crew
  rotation is `government`; Inspiration4, Axiom, Polaris and New Shepard are
  `commercial`.
- `destination` is where the flight was headed: a Crew Dragon or Soyuz to the ISS is `iss`
  even if it also spent time free-flying. Use `free-flying` for orbital flights that did not
  dock to a station, `suborbital` for flights that crossed the 100 km Kármán line without reaching orbit. Flights that peak below 100 km (Virgin Galactic) are not spaceflights for this dataset and are not recorded.
- Flights go in the file for the year they launched, in launch order.

## Person record

```yaml
- id: jonny-kim                        # unique slug, normally derived from the Wikipedia title
  name: Jonny Kim
  born: '1984-02-05'                   # YYYY-MM-DD; YYYY-MM or YYYY if only that is published; null if unknown
  sex: M                               # M | F
  nationality: [US]                    # codes from nations.yaml; primary citizenship first
  wiki: https://en.wikipedia.org/wiki/Jonny_Kim
```

- IDs must be stable: flights refer to people by id. Before adding a person, grep
  `people.yaml` for their surname; a spelling variant on Wikipedia is not a new person.
- Append new people at the end of the file (it is ordered by first launch).
- Multiple citizenships are listed with the primary one first; breakdowns use the first.
- If only a birth month or year is published (common for Chinese crew), record that much:
  `'1984-10'` or `'1984'`. Age calculations take the middle of the period. If nothing is
  published, use `null` rather than guessing.

## What the validator checks

Schema (types, formats, enum values), referential integrity (every crew id, nation code and
destination exists; no duplicate ids), and a full timeline simulation: nobody launches while
already in space, nobody lands who was not up, everyone who went up has come down unless the
flight they are on has `landing: null`. Also that each flight file is in launch order and
contains only its own year.

## Adding new missions (the recipe)

This is designed to be done by a person or by an AI assistant with web access. See
`CLAUDE.md` for the assistant-oriented version.

1. Run `npm run validate`. The last line tells you the date the data is complete through.
2. Find every crewed launch after that date. Wikipedia's "List of human spaceflights" pages
   (by year) are a reliable index; each mission article has an infobox with launch/landing
   times (UTC), crew, and operator.
3. For each mission, in launch order:
   - add the flight record to `data/flights/<year>.yaml` (create the file if needed);
   - for every crew member not already in `people.yaml`, add a person record;
   - if a crew member came home on a different vehicle, put them in that vehicle's `crew_down`
     (and, if they went up earlier, they are already in space, so not in this flight's `crew_up`).
4. Run `npm run validate` and fix whatever it reports.
5. Optionally `npm run dev` and eyeball the Missions page and the last years of the explorer.

Times: use UTC as printed in the infobox. If only a date is known, use `T00:00:00Z` and say so
in `note`.

## Nations and destinations

Add a nation to `nations.yaml` when someone with a new citizenship flies. Keep ISO codes.
Destinations are a closed list; a new station or the Moon returning as a destination means
adding an entry to `destinations.yaml` and, optionally, a colour in
`src/lib/data/dimensions.ts`.

## Migration provenance

`scripts/import-xlsx.py` converted the original spreadsheet. It fixed a handful of known
errors (mangled crew lists on STS-27/30/31/36/44, Soyuz 5–11 tagged as US launches, DOBs stored
as text, three placeholder landing dates). Records touched by hand carry a `note`.

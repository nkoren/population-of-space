/**
 * Validates the YAML source data in data/ and compiles it into
 * public/data/dataset.json, which the web app loads at runtime.
 *
 *   npm run data        build (and validate)
 *   npm run validate    validate only, no output written
 *
 * Exit code 1 with a readable list of problems if anything is wrong,
 * so an agent (or a human) can fix the data and re-run.
 */
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { z } from 'zod';
import { NationSchema, DestinationSchema, PersonSchema, FlightSchema } from './schema.ts';
import type { Nation, Destination, Person, Flight } from './schema.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const DATA = path.join(ROOT, 'data');
const OUT = path.join(ROOT, 'public', 'data', 'dataset.json');
const checkOnly = process.argv.includes('--check');

const problems: string[] = [];
const warnings: string[] = [];
const fail = (msg: string) => problems.push(msg);
const warn = (msg: string) => warnings.push(msg);

function loadYaml<T>(file: string, schema: z.ZodType<T>): T[] {
  const rel = path.relative(ROOT, file);
  let raw: unknown;
  try {
    raw = yaml.load(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    fail(`${rel}: YAML parse error: ${(e as Error).message}`);
    return [];
  }
  if (!Array.isArray(raw)) {
    fail(`${rel}: top level must be a list`);
    return [];
  }
  const out: T[] = [];
  raw.forEach((item, i) => {
    const r = schema.safeParse(item);
    if (r.success) out.push(r.data);
    else {
      const label = (item as any)?.id ?? (item as any)?.code ?? `item #${i + 1}`;
      for (const issue of r.error.issues) fail(`${rel} [${label}] ${issue.path.join('.') || '(root)'}: ${issue.message}`);
    }
  });
  return out;
}

// ------------------------------------------------------------------ load
const nations = loadYaml<Nation>(path.join(DATA, 'nations.yaml'), NationSchema);
const destinations = loadYaml<Destination>(path.join(DATA, 'destinations.yaml'), DestinationSchema);
const people = loadYaml<Person>(path.join(DATA, 'people.yaml'), PersonSchema);
const flightFiles = fs
  .readdirSync(path.join(DATA, 'flights'))
  .filter((f: string) => f.endsWith('.yaml'))
  .sort();
const flights: Flight[] = [];
for (const file of flightFiles) {
  const year = file.replace('.yaml', '');
  const fs_ = loadYaml<Flight>(path.join(DATA, 'flights', file), FlightSchema);
  let prev = '';
  for (const f of fs_) {
    if (!f.launch.startsWith(year)) fail(`flights/${file} [${f.id}]: launched ${f.launch} but is filed under ${year}`);
    if (f.launch < prev) fail(`flights/${file} [${f.id}]: not in launch order (launched ${f.launch}, previous flight ${prev})`);
    prev = f.launch;
    flights.push(f);
  }
}
flights.sort((a, b) => a.launch.localeCompare(b.launch));

// ------------------------------------------------------------------ referential integrity
const nationSet = new Set(nations.map((n) => n.code));
const destSet = new Set(destinations.map((d) => d.id));
const personById = new Map<string, Person>();
for (const p of people) {
  if (personById.has(p.id)) fail(`people.yaml [${p.id}]: duplicate id`);
  personById.set(p.id, p);
  for (const n of p.nationality) if (!nationSet.has(n)) fail(`people.yaml [${p.id}]: unknown nationality ${n} (add it to nations.yaml)`);
  if (p.born && p.born > new Date().toISOString().slice(0, 10)) fail(`people.yaml [${p.id}]: born in the future`);
}
const flightIds = new Set<string>();
for (const f of flights) {
  if (flightIds.has(f.id)) fail(`flights [${f.id}]: duplicate id`);
  flightIds.add(f.id);
  if (!nationSet.has(f.launch_nation)) fail(`flights [${f.id}]: unknown launch_nation ${f.launch_nation}`);
  if (!destSet.has(f.destination)) fail(`flights [${f.id}]: unknown destination ${f.destination} (see destinations.yaml)`);
  if (f.landing && f.landing <= f.launch) fail(`flights [${f.id}]: landing ${f.landing} is not after launch ${f.launch}`);
  for (const pid of [...f.crew_up, ...f.crew_down]) if (!personById.has(pid)) fail(`flights [${f.id}]: unknown person "${pid}" (add them to people.yaml)`);
  if (new Set(f.crew_up).size !== f.crew_up.length) fail(`flights [${f.id}]: duplicate ids in crew_up`);
  if (new Set(f.crew_down).size !== f.crew_down.length) fail(`flights [${f.id}]: duplicate ids in crew_down`);
  if (f.crew_up.length === 0 && f.crew_down.length === 0) fail(`flights [${f.id}]: no crew at all`);
  for (const pid of f.crew_up) {
    const p = personById.get(pid);
    if (p?.born && p.born > f.launch.slice(0, 10)) fail(`flights [${f.id}]: ${pid} launched before being born`);
  }
}

// ------------------------------------------------------------------ simulate the timeline
// Walk launches and landings in time order, tracking who is in space.
// This catches "launched while already in space", "landed without launching" etc.
// and produces the list of stays (one continuous stint in space per person).
interface Stay {
  person: string;
  up: string; // flight id
  down: string | null; // flight id, null if still in space
  start: string;
  end: string | null;
}
type Ev = { t: string; kind: 'launch' | 'landing'; flight: Flight };
const events: Ev[] = [];
for (const f of flights) {
  events.push({ t: f.launch, kind: 'launch', flight: f });
  if (f.landing) events.push({ t: f.landing, kind: 'landing', flight: f });
}
// landings before launches at the same instant is irrelevant in practice; sort by time, launches first.
events.sort((a, b) => a.t.localeCompare(b.t) || (a.kind === 'launch' ? -1 : 1));

const inSpace = new Map<string, Stay>();
const stays: Stay[] = [];
for (const ev of events) {
  const f = ev.flight;
  if (ev.kind === 'launch') {
    for (const pid of f.crew_up) {
      const cur = inSpace.get(pid);
      if (cur) fail(`flights [${f.id}]: ${pid} launched on ${f.launch} but was already in space (went up on ${cur.up}, no landing recorded)`);
      const s: Stay = { person: pid, up: f.id, down: null, start: f.launch, end: null };
      inSpace.set(pid, s);
      stays.push(s);
    }
  } else {
    for (const pid of f.crew_down) {
      const cur = inSpace.get(pid);
      if (!cur) {
        fail(`flights [${f.id}]: ${pid} listed in crew_down but was not in space (check crew_up of the flight that took them up)`);
        continue;
      }
      cur.down = f.id;
      cur.end = f.landing!;
      inSpace.delete(pid);
    }
  }
}
// Anyone still "in space" must be on a flight whose landing is null.
for (const [pid, s] of inSpace) {
  const upFlight = flights.find((f) => f.id === s.up)!;
  const stillFlying = flights.some((f) => f.landing === null && (f.crew_up.includes(pid) || f.crew_down.includes(pid)));
  if (!stillFlying)
    fail(`people [${pid}]: went up on ${s.up} (${upFlight.launch}) but never appears in any crew_down. ` + `Either add them to the crew_down of the flight that brought them home, or set that flight's landing to null if it is still in progress.`);
}
for (const p of people) if (!stays.some((s) => s.person === p.id)) warn(`people.yaml [${p.id}]: has no flights`);

// ------------------------------------------------------------------ report
if (warnings.length) console.warn(warnings.map((w) => `warning: ${w}`).join('\n'));
if (problems.length) {
  console.error(`\n${problems.length} problem(s) found:\n` + problems.map((p) => `  - ${p}`).join('\n'));
  process.exit(1);
}

// "Now" for the dataset: the latest launch we know about. If a flight is still in
// progress (landing: null) the data is being kept current, so use the build time.
const lastLaunch = flights[flights.length - 1]?.launch ?? null;
const anyOngoing = flights.some((f) => f.landing === null);
const dataEnd = anyOngoing ? new Date().toISOString().replace(/\.\d{3}Z$/, 'Z') : lastLaunch;
const lastEvent = dataEnd;
const dataset = {
  meta: {
    built: new Date().toISOString(),
    /** The moment the data is considered complete up to. Charts treat this as "now". */
    dataEnd,
    counts: { people: people.length, flights: flights.length, stays: stays.length },
  },
  nations,
  destinations,
  people,
  flights,
  stays,
};

console.log(`✓ ${people.length} people, ${flights.length} flights, ${stays.length} stays; data complete through ${dataEnd}`);
if (!checkOnly) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(dataset));
  console.log(`→ wrote ${path.relative(ROOT, OUT)} (${(fs.statSync(OUT).size / 1024).toFixed(0)} kB)`);
}

import type { Dataset, RawDataset, Stay, PersonStats, FlightStats } from './types';

export const DAY = 86_400_000;

/**
 * Birth dates may be partial ('1984-10' or '1984'). For age arithmetic a partial date is
 * taken as the middle of its period, so the error is at most half a month or half a year.
 */
export function bornTime(born: string | null): number | null {
  if (!born) return null;
  const [y, m, d] = born.split('-').map(Number);
  if (d) return Date.UTC(y, m - 1, d);
  if (m) return Date.UTC(y, m - 1, 15);
  return Date.UTC(y, 6, 1);
}

/** Human-readable birth date at whatever precision is recorded. */
export function fmtBorn(born: string | null, full: (d: Date) => string): string {
  if (!born) return '—';
  const parts = born.split('-');
  if (parts.length === 3) return full(new Date(born));
  if (parts.length === 2) return new Date(Date.UTC(+parts[0], +parts[1] - 1, 1)).toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  return parts[0];
}

let cached: Promise<Dataset> | null = null;

export function loadDataset(): Promise<Dataset> {
  if (!cached) cached = fetch(`${import.meta.env.BASE_URL}data/dataset.json`).then((r) => r.json()).then(enrich);
  return cached;
}

export function enrich(raw: RawDataset): Dataset {
  // The build stamps dataEnd with its own clock when someone is in orbit; the visitor's clock is
  // the better "now" for those stays, so the headcount, days aloft and "as of" stay current.
  const builtEnd = Date.parse(raw.meta.dataEnd);
  const dataEnd = raw.stays.some((s) => !s.end) ? Math.max(builtEnd, Date.now()) : builtEnd;
  const nationByCode = new Map(raw.nations.map((n) => [n.code, n]));
  const destById = new Map(raw.destinations.map((d) => [d.id, d]));
  const personById = new Map(raw.people.map((p) => [p.id, p]));
  const flightById = new Map(raw.flights.map((f) => [f.id, f]));

  const nthByPerson = new Map<string, number>();
  const stays: Stay[] = raw.stays.map((s) => {
    const person = personById.get(s.person)!;
    const start = Date.parse(s.start);
    const rawEnd = s.end ? Date.parse(s.end) : null;
    const ongoing = rawEnd === null || rawEnd > dataEnd;
    const end = Math.min(rawEnd ?? dataEnd, dataEnd);
    const nth = (nthByPerson.get(s.person) ?? 0) + 1;
    nthByPerson.set(s.person, nth);
    const bornT = bornTime(person.born);
    const age = bornT === null ? null : (start - bornT) / (365.25 * DAY);
    return {
      person,
      up: flightById.get(s.up)!,
      down: s.down ? flightById.get(s.down)! : null,
      start,
      end,
      days: Math.max(0, end - start) / DAY,
      fullDays: rawEnd === null ? null : (rawEnd - start) / DAY,
      ongoing,
      nth,
      age,
    };
  });

  const byPerson = new Map<string, Stay[]>();
  for (const s of stays) {
    const arr = byPerson.get(s.person.id) ?? [];
    arr.push(s);
    byPerson.set(s.person.id, arr);
  }
  const personStats: PersonStats[] = raw.people.map((person) => {
    const ps = byPerson.get(person.id) ?? [];
    return {
      person,
      stays: ps,
      flights: ps.length,
      days: ps.reduce((a, s) => a + (s.fullDays ?? s.days), 0),
      first: ps.length ? ps[0].start : Infinity,
      last: ps.length ? ps[ps.length - 1].end : -Infinity,
    };
  });

  const flightStats: FlightStats[] = raw.flights.map((flight) => {
    const launch = Date.parse(flight.launch);
    const landing = flight.landing ? Date.parse(flight.landing) : null;
    return {
      flight,
      launch,
      landing,
      duration: ((landing ?? Math.max(dataEnd, launch)) - launch) / DAY,
      crewUp: flight.crew_up.map((id) => personById.get(id)!),
      crewDown: flight.crew_down.map((id) => personById.get(id)!),
    };
  });

  return {
    ...raw,
    dataEnd,
    stays,
    nationByCode,
    destById,
    personById,
    flightById,
    personStats,
    flightStats,
  };
}

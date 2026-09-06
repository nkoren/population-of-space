import type { Dataset, RawDataset, Stay, PersonStats, FlightStats } from './types';

export const DAY = 86_400_000;

let cached: Promise<Dataset> | null = null;

export function loadDataset(): Promise<Dataset> {
  if (!cached) cached = fetch(`${import.meta.env.BASE_URL}data/dataset.json`).then((r) => r.json()).then(enrich);
  return cached;
}

export function enrich(raw: RawDataset): Dataset {
  const dataEnd = Date.parse(raw.meta.dataEnd);
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
    const age = person.born ? (start - Date.parse(person.born)) / (365.25 * DAY) : null;
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

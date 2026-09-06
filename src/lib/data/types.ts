// Shapes of public/data/dataset.json (see scripts/build-data.ts) plus the
// enriched in-memory forms the app works with.

export interface Nation {
  code: string;
  name: string;
  note?: string;
}
export interface Destination {
  id: string;
  name: string;
  description?: string;
}
export interface Person {
  id: string;
  name: string;
  born: string | null;
  sex: 'M' | 'F';
  nationality: string[];
  wiki?: string;
  note?: string;
}
export interface Flight {
  id: string;
  name: string;
  launch: string;
  landing: string | null;
  launch_nation: string;
  destination: string;
  sector: 'government' | 'commercial';
  crew_up: string[];
  crew_down: string[];
  wiki?: string;
  note?: string;
}
export interface RawStay {
  person: string;
  up: string;
  down: string | null;
  start: string;
  end: string | null;
}
export interface RawDataset {
  meta: { built: string; dataEnd: string; counts: { people: number; flights: number; stays: number } };
  nations: Nation[];
  destinations: Destination[];
  people: Person[];
  flights: Flight[];
  stays: RawStay[];
}

/** One continuous stint in space by one person, with everything pre-resolved for fast grouping. */
export interface Stay {
  person: Person;
  up: Flight;
  down: Flight | null;
  /** ms since epoch */
  start: number;
  /** ms since epoch; clipped to dataEnd if still in space */
  end: number;
  /** end - start in days (clipped to dataEnd) */
  days: number;
  /** full stay length in days using the recorded landing even if after dataEnd; null if still in space */
  fullDays: number | null;
  ongoing: boolean;
  /** 1 for the person's first stay, 2 for the second, ... */
  nth: number;
  /** age in years at launch, or null if birth date unknown */
  age: number | null;
}

export interface PersonStats {
  person: Person;
  stays: Stay[];
  flights: number;
  days: number;
  first: number;
  last: number;
}

export interface FlightStats {
  flight: Flight;
  launch: number;
  landing: number | null;
  /** days from launch to landing (or to dataEnd if ongoing) */
  duration: number;
  crewUp: Person[];
  crewDown: Person[];
}

export interface Dataset extends Omit<RawDataset, 'stays'> {
  dataEnd: number;
  stays: Stay[];
  nationByCode: Map<string, Nation>;
  destById: Map<string, Destination>;
  personById: Map<string, Person>;
  flightById: Map<string, Flight>;
  personStats: PersonStats[];
  flightStats: FlightStats[];
}

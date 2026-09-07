// Ways of slicing the population. Each dimension maps a stay to a category key
// and knows how to label and colour that key. Adding a new breakdown = adding
// an entry here.
import type { Dataset, Stay } from './types';

export interface Dimension {
  id: string;
  label: string;
  /** short description shown under the control */
  hint: string;
  key: (s: Stay) => string;
  labelOf: (key: string, ds: Dataset) => string;
  /**
   * Fixed display order for keys; keys not listed are sorted by size. May be a function of the
   * dataset for orders that are derived from the data (e.g. first-flight date).
   */
  order?: string[] | ((ds: Dataset) => string[]);
  /** if set, only the top-N keys (by value) are shown individually; the rest become "other" */
  topN?: number;
  color?: (key: string) => string | undefined;
}

export const OTHER = 'other';
export const UNKNOWN = 'unknown';

// Categorical palette. Muted-but-distinct, readable on both light and dark grounds.
export const PALETTE = [
  '#4c8dff', // blue
  '#ff7b54', // coral
  '#3ec9a7', // teal
  '#f5c451', // gold
  '#b07cff', // violet
  '#ff5da2', // pink
  '#7ed957', // green
  '#5ad1e6', // cyan
  '#ff9f43', // orange
  '#a3a9b8', // grey
  '#e06666', // red
  '#8fd3ff', // pale blue
  '#c9a37e', // tan
  '#6ee7b7', // mint
];

const FIXED: Record<string, string> = {
  M: '#4c8dff',
  F: '#ff5da2',
  RU: '#e06666',
  US: '#4c8dff',
  CN: '#f5c451',
  JP: '#ff9f43',
  DE: '#a3a9b8',
  FR: '#5ad1e6',
  IT: '#7ed957',
  CA: '#ff7b54',
  GB: '#b07cff',
  UA: '#3ec9a7',
  iss: '#4c8dff',
  'salyut-mir': '#e06666',
  tiangong: '#f5c451',
  moon: '#c9a37e',
  skylab: '#ff9f43',
  'free-flying': '#3ec9a7',
  suborbital: '#b07cff',
  government: '#4c8dff',
  commercial: '#ff7b54',
  [OTHER]: '#8b93a7',
  [UNKNOWN]: '#8b93a7',
  all: '#4c8dff',
};

export function fixedColor(key: string): string | undefined {
  return FIXED[key];
}

const AGE_COHORTS = ['under-30', '30s', '40s', '50s', '60-plus', UNKNOWN];
const AGE_LABELS: Record<string, string> = {
  'under-30': 'Under 30',
  '30s': '30–39',
  '40s': '40–49',
  '50s': '50–59',
  '60-plus': '60 and over',
  [UNKNOWN]: 'Unknown age',
};
const AGE_COLORS: Record<string, string> = {
  'under-30': '#6ee7b7',
  '30s': '#3ec9a7',
  '40s': '#4c8dff',
  '50s': '#b07cff',
  '60-plus': '#ff5da2',
};

export function ageCohort(age: number | null): string {
  if (age === null) return UNKNOWN;
  if (age < 30) return 'under-30';
  if (age < 40) return '30s';
  if (age < 50) return '40s';
  if (age < 60) return '50s';
  return '60-plus';
}

export function birthDecade(born: string | null): string {
  if (!born) return UNKNOWN;
  return `${Math.floor(+born.slice(0, 4) / 10) * 10}s`;
}

const firstFlightCache = new WeakMap<Dataset, string[]>();
/** Nationalities in the order in which each sent its first person to space. */
export function nationsByFirstFlight(ds: Dataset): string[] {
  let cached = firstFlightCache.get(ds);
  if (!cached) {
    const first = new Map<string, number>();
    for (const s of ds.stays) {
      const k = s.person.nationality[0];
      const t = first.get(k);
      if (t === undefined || s.start < t) first.set(k, s.start);
    }
    cached = [...first.entries()].sort((a, b) => a[1] - b[1]).map(([k]) => k);
    firstFlightCache.set(ds, cached);
  }
  return cached;
}

export const DIMENSIONS: Dimension[] = [
  {
    id: 'none',
    label: 'Total',
    hint: 'Everyone in space, undivided.',
    key: () => 'all',
    labelOf: () => 'People in space',
  },
  {
    id: 'sex',
    label: 'Sex',
    hint: 'As recorded in the dataset.',
    key: (s) => s.person.sex,
    labelOf: (k) => (k === 'M' ? 'Men' : k === 'F' ? 'Women' : k),
    order: ['M', 'F'],
  },
  {
    id: 'nationality',
    label: 'Nationality',
    hint: 'Primary citizenship of each person. Soviet-era flyers are attributed to the successor state.',
    key: (s) => s.person.nationality[0],
    labelOf: (k, ds) => ds.nationByCode.get(k)?.name ?? k,
    topN: 9,
    // Fixed order so categories don't swap places as the date range changes.
    order: nationsByFirstFlight,
  },
  {
    id: 'age',
    label: 'Age cohort',
    hint: 'Age at the start of each stay in space.',
    key: (s) => ageCohort(s.age),
    labelOf: (k) => AGE_LABELS[k] ?? k,
    order: AGE_COHORTS,
    color: (k) => AGE_COLORS[k],
  },
  {
    id: 'destination',
    label: 'Location',
    hint: 'Where the flight that carried them up was headed.',
    key: (s) => s.up.destination,
    labelOf: (k, ds) => ds.destById.get(k)?.name ?? k,
    order: ['iss', 'salyut-mir', 'tiangong', 'skylab', 'moon', 'free-flying', 'suborbital'],
  },
  {
    id: 'launchNation',
    label: 'Launch nation',
    hint: 'The country whose rocket carried them to space.',
    key: (s) => s.up.launch_nation,
    labelOf: (k, ds) => ds.nationByCode.get(k)?.name ?? k,
    order: ['RU', 'US', 'CN'],
  },
  {
    id: 'sector',
    label: 'Government / commercial',
    hint: 'Whether the flight was a government mission or a commercial one.',
    key: (s) => s.up.sector,
    labelOf: (k) => (k === 'government' ? 'Government' : 'Commercial'),
    order: ['government', 'commercial'],
  },
  {
    id: 'experience',
    label: 'Rookies vs veterans',
    hint: 'Whether this is the person’s first trip to space.',
    key: (s) => (s.nth === 1 ? 'rookie' : 'veteran'),
    labelOf: (k) => (k === 'rookie' ? 'First flight' : 'Repeat flyer'),
    order: ['rookie', 'veteran'],
    color: (k) => (k === 'rookie' ? '#6ee7b7' : '#4c8dff'),
  },
  {
    id: 'birthDecade',
    label: 'Birth decade',
    hint: 'Generational turnover of the people in space.',
    key: (s) => birthDecade(s.person.born),
    labelOf: (k) => (k === UNKNOWN ? 'Unknown' : `Born ${k}`),
    order: ['1910s', '1920s', '1930s', '1940s', '1950s', '1960s', '1970s', '1980s', '1990s', '2000s', UNKNOWN],
  },
];

/** Resolves a dimension's display order against the dataset (empty if it has none). */
export function orderOf(dim: Dimension, ds: Dataset): string[] {
  return typeof dim.order === 'function' ? dim.order(ds) : (dim.order ?? []);
}

export const dimensionById = (id: string) => DIMENSIONS.find((d) => d.id === id) ?? DIMENSIONS[0];

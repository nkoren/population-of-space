// The aggregation engine. Turns the list of stays into time series for any
// metric x breakdown x resolution combination. Everything here is pure and
// fast enough to run on every control change (~1.5k stays).
import { utcYear, utcMonth, utcDay, type CountableTimeInterval } from 'd3-time';
import { bisector } from 'd3-array';
import type { Dataset, Stay } from './types';
import { DAY } from './load';
import { OTHER, PALETTE, fixedColor, type Dimension } from './dimensions';

export type Resolution = 'year' | 'month' | 'exact';
export type MetricId = 'population' | 'personDays' | 'cumulativeDays' | 'launched' | 'newcomers' | 'cumulativePeople';

export interface Metric {
  id: MetricId;
  label: string;
  unit: string;
  hint: string;
  /** exact (event-level) resolution is meaningful only for instantaneous quantities */
  supportsExact: boolean;
  /** running totals ignore the resolution's averaging */
  cumulative: boolean;
}

export const METRICS: Metric[] = [
  { id: 'population', label: 'People in space', unit: 'people', hint: 'Average number of people in space over each period (exact headcount at “event” resolution).', supportsExact: true, cumulative: false },
  { id: 'personDays', label: 'Person-days in space', unit: 'person-days', hint: 'Total days of human presence accumulated in each period.', supportsExact: false, cumulative: false },
  { id: 'cumulativeDays', label: 'Cumulative person-days', unit: 'person-days', hint: 'Running total of all human time in space since 1961.', supportsExact: false, cumulative: true },
  { id: 'launched', label: 'People launched', unit: 'people', hint: 'Number of people who left Earth in each period (one per launch, repeat flyers counted again).', supportsExact: false, cumulative: false },
  { id: 'newcomers', label: 'First-time flyers', unit: 'people', hint: 'People making their first trip to space in each period.', supportsExact: false, cumulative: false },
  { id: 'cumulativePeople', label: 'People who have flown', unit: 'people', hint: 'Running total of distinct humans who have been to space.', supportsExact: false, cumulative: true },
];
export const metricById = (id: string) => METRICS.find((m) => m.id === id) ?? METRICS[0];

export interface Series {
  key: string;
  label: string;
  color: string;
  values: number[];
}
export interface Aggregate {
  /** bin start times (ms) or event times for exact resolution */
  x: number[];
  /** bin end times (ms) — same as x for exact */
  xEnd: number[];
  series: Series[];
  total: number[];
  /** lowest / highest exact headcount inside each bin (population metric at year/month resolution only) */
  band?: { min: number[]; max: number[] };
  resolution: Resolution;
  metric: Metric;
}

export interface Query {
  metric: MetricId;
  dimension: Dimension;
  resolution: Resolution;
  from: number; // ms
  to: number; // ms
  filter?: (s: Stay) => boolean;
}

function makeBins(res: Exclude<Resolution, 'exact'>, from: number, to: number): { x: number[]; xEnd: number[] } {
  const interval: CountableTimeInterval = res === 'year' ? utcYear : utcMonth;
  const start = interval.floor(new Date(from));
  const edges = interval.range(start, new Date(to)).map((d) => d.getTime());
  const x: number[] = [];
  const xEnd: number[] = [];
  for (let i = 0; i < edges.length; i++) {
    x.push(edges[i]);
    xEnd.push(Math.min(i + 1 < edges.length ? edges[i + 1] : interval.offset(new Date(edges[i])).getTime(), to));
  }
  return { x, xEnd };
}

/** Chooses display order + collapses long tails into "other". */
function finalizeSeries(raw: Map<string, number[]>, dim: Dimension, ds: Dataset, n: number): Series[] {
  const sum = (v: number[]) => v.reduce((a, b) => a + b, 0);
  let entries = [...raw.entries()].map(([key, values]) => ({ key, values, size: sum(values) }));
  entries.sort((a, b) => b.size - a.size);
  if (dim.topN && entries.length > dim.topN + 1) {
    const keep = entries.slice(0, dim.topN);
    const rest = entries.slice(dim.topN);
    const other = new Array<number>(n).fill(0);
    for (const e of rest) for (let i = 0; i < n; i++) other[i] += e.values[i];
    entries = [...keep, { key: OTHER, values: other, size: sum(other) }];
  }
  if (dim.order) {
    const rank = new Map(dim.order.map((k, i) => [k, i]));
    entries.sort((a, b) => (rank.get(a.key) ?? 999) - (rank.get(b.key) ?? 999) || b.size - a.size);
  }
  let paletteIdx = 0;
  const used = new Set<string>();
  return entries.map((e) => {
    let color = dim.color?.(e.key) ?? fixedColor(e.key);
    if (!color || used.has(color)) {
      while (used.has(PALETTE[paletteIdx % PALETTE.length])) paletteIdx++;
      color = PALETTE[paletteIdx % PALETTE.length];
    }
    used.add(color);
    return { key: e.key, label: e.key === OTHER ? 'Other' : dim.labelOf(e.key, ds), color, values: e.values };
  });
}

export function aggregate(ds: Dataset, q: Query): Aggregate {
  const metric = metricById(q.metric);
  const dim = q.dimension;
  const from = q.from;
  const to = Math.min(q.to, ds.dataEnd);
  const stays = q.filter ? ds.stays.filter(q.filter) : ds.stays;
  const res: Resolution = metric.supportsExact ? q.resolution : q.resolution === 'exact' ? 'month' : q.resolution;

  if (res === 'exact') return exactPopulation(ds, stays, dim, from, to, metric);

  const { x, xEnd } = makeBins(res, from, to);
  const n = x.length;
  const raw = new Map<string, number[]>();
  const row = (k: string) => {
    let r = raw.get(k);
    if (!r) raw.set(k, (r = new Array<number>(n).fill(0)));
    return r;
  };
  const bis = bisector<number, number>((d) => d).right;

  if (metric.id === 'population' || metric.id === 'personDays' || metric.id === 'cumulativeDays') {
    for (const s of stays) {
      if (s.end <= from || s.start >= to) continue;
      const r = row(dim.key(s));
      let i = Math.max(0, bis(x, s.start) - 1);
      for (; i < n && x[i] < s.end; i++) {
        const overlap = Math.min(s.end, xEnd[i]) - Math.max(s.start, x[i]);
        if (overlap > 0) r[i] += overlap / DAY;
      }
    }
    if (metric.id === 'population') for (const r of raw.values()) for (let i = 0; i < n; i++) r[i] /= (xEnd[i] - x[i]) / DAY;
  } else {
    // count-based metrics: stays starting in the bin
    const seen = new Set<string>();
    for (const s of stays) {
      if (metric.id === 'newcomers' || metric.id === 'cumulativePeople') {
        if (seen.has(s.person.id)) continue;
        seen.add(s.person.id);
      }
      if (s.start < from || s.start > to) continue;
      row(dim.key(s))[Math.min(n - 1, bis(x, s.start) - 1)] += 1;
    }
  }
  if (metric.cumulative) for (const r of raw.values()) for (let i = 1; i < n; i++) r[i] += r[i - 1];

  const series = finalizeSeries(raw, dim, ds, n);
  const total = new Array<number>(n).fill(0);
  for (const s of series) for (let i = 0; i < n; i++) total[i] += s.values[i];
  const band = metric.id === 'population' ? populationBand(stays, x, xEnd) : undefined;
  return { x, xEnd, series, total, band, resolution: res, metric };
}

/** Min and max of the exact total headcount within each bin, by sweeping launch/landing events. */
function populationBand(stays: Stay[], x: number[], xEnd: number[]): { min: number[]; max: number[] } {
  const evs: { t: number; d: number }[] = [];
  for (const s of stays) {
    evs.push({ t: s.start, d: 1 });
    evs.push({ t: s.end, d: -1 });
  }
  evs.sort((a, b) => a.t - b.t || a.d - b.d);
  const min: number[] = [];
  const max: number[] = [];
  let cur = 0;
  let j = 0;
  for (let i = 0; i < x.length; i++) {
    while (j < evs.length && evs[j].t < x[i]) cur += evs[j++].d;
    let lo = cur;
    let hi = cur;
    while (j < evs.length && evs[j].t < xEnd[i]) {
      cur += evs[j++].d;
      lo = Math.min(lo, cur);
      hi = Math.max(hi, cur);
    }
    min.push(lo);
    max.push(hi);
  }
  return { min, max };
}

/** Step function: population at every launch/landing event. */
function exactPopulation(ds: Dataset, stays: Stay[], dim: Dimension, from: number, to: number, metric: Metric): Aggregate {
  type Ev = { t: number; d: number; k: string };
  const evs: Ev[] = [];
  for (const s of stays) {
    if (s.end <= from || s.start >= to) continue;
    const k = dim.key(s);
    evs.push({ t: Math.max(s.start, from), d: 1, k });
    evs.push({ t: Math.min(s.end, to), d: -1, k });
  }
  evs.sort((a, b) => a.t - b.t || a.d - b.d);
  const keys = [...new Set(evs.map((e) => e.k))];
  const cur = new Map(keys.map((k) => [k, 0]));
  const x: number[] = [from];
  const cols: number[][] = [keys.map(() => 0)];
  for (let i = 0; i < evs.length; ) {
    const t = evs[i].t;
    while (i < evs.length && evs[i].t === t) {
      cur.set(evs[i].k, cur.get(evs[i].k)! + evs[i].d);
      i++;
    }
    x.push(t);
    cols.push(keys.map((k) => cur.get(k)!));
  }
  if (x[x.length - 1] < to) {
    x.push(to);
    cols.push(cols[cols.length - 1]);
  }
  const raw = new Map<string, number[]>(keys.map((k, j) => [k, cols.map((c) => c[j])]));
  const series = finalizeSeries(raw, dim, ds, x.length);
  const total = x.map((_, i) => series.reduce((a, s) => a + s.values[i], 0));
  return { x, xEnd: x, series, total, resolution: 'exact', metric };
}

// ---------------------------------------------------------------- headline stats

export interface Headline {
  inSpaceNow: Stay[];
  peak: { count: number; t: number };
  totalPersonDays: number;
  peopleFlown: number;
  womenShareDays: number;
  commercialShareDays: number;
  firstLaunch: number;
  lastLaunch: number;
  continuousSince: number | null;
}

export function headline(ds: Dataset): Headline {
  const inSpaceNow = ds.stays.filter((s) => s.ongoing);
  // peak simultaneous
  const evs: { t: number; d: number }[] = [];
  for (const s of ds.stays) {
    evs.push({ t: s.start, d: 1 });
    if (!s.ongoing) evs.push({ t: s.end, d: -1 });
  }
  evs.sort((a, b) => a.t - b.t || a.d - b.d);
  let cur = 0;
  const peak = { count: 0, t: 0 };
  // "continuous since" = the launch that ended the most recent period with nobody in space
  let continuousSince: number | null = null;
  for (const e of evs) {
    if (cur === 0 && e.d > 0) continuousSince = e.t;
    cur += e.d;
    if (cur > peak.count) {
      peak.count = cur;
      peak.t = e.t;
    }
  }
  const totalPersonDays = ds.stays.reduce((a, s) => a + s.days, 0);
  const womenDays = ds.stays.filter((s) => s.person.sex === 'F').reduce((a, s) => a + s.days, 0);
  const commercialDays = ds.stays.filter((s) => s.up.sector === 'commercial').reduce((a, s) => a + s.days, 0);
  const launches = ds.flightStats.map((f) => f.launch);
  return {
    inSpaceNow,
    peak,
    totalPersonDays,
    peopleFlown: ds.personStats.filter((p) => p.flights > 0).length,
    womenShareDays: womenDays / totalPersonDays,
    commercialShareDays: commercialDays / totalPersonDays,
    firstLaunch: Math.min(...launches),
    lastLaunch: Math.max(...launches),
    continuousSince: cur > 0 ? continuousSince : null,
  };
}

export { utcDay };

// ---------------------------------------------------------------- snapshot of who is up right now

/** Headcount per category among the people in space at the end of the dataset. */
export function snapshot(ds: Dataset, dim: Dimension): SeriesTotal[] {
  const raw = new Map<string, number[]>();
  for (const s of ds.stays) {
    if (!s.ongoing) continue;
    const k = dim.key(s);
    raw.set(k, [(raw.get(k)?.[0] ?? 0) + 1]);
  }
  return finalizeSeries(raw, dim, ds, 1).map((s) => ({ key: s.key, label: s.label, color: s.color, value: s.values[0] }));
}

// ---------------------------------------------------------------- totals over the range (for ring charts)

export interface SeriesTotal {
  key: string;
  label: string;
  color: string;
  value: number;
}

/**
 * Collapses an aggregate to one number per series over its whole time range.
 * Instantaneous headcounts are integrated to person-days; per-period counts are summed;
 * running totals take their final value. Returns the unit the numbers are in.
 */
export function seriesTotals(agg: Aggregate): { totals: SeriesTotal[]; unit: string } {
  const n = agg.x.length;
  const integrate = agg.metric.id === 'population';
  const totals = agg.series.map((s) => {
    let v = 0;
    if (agg.metric.cumulative) v = n ? s.values[n - 1] : 0;
    else if (integrate) for (let i = 0; i < n; i++) v += s.values[i] * ((agg.xEnd[i] ?? agg.x[i + 1] ?? agg.x[i]) - agg.x[i]) / DAY;
    else for (let i = 0; i < n; i++) v += s.values[i];
    return { key: s.key, label: s.label, color: s.color, value: v };
  });
  return { totals, unit: integrate ? 'person-days' : agg.metric.unit };
}

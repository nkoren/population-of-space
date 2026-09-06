// Quick numeric smoke test of the aggregation engine against the built dataset.
//   npx tsx scripts/engine-smoke.ts
import fs from 'node:fs';
import path from 'node:path';
import { enrich } from '../src/lib/data/load.ts';
import { aggregate, headline } from '../src/lib/data/engine.ts';
import { dimensionById } from '../src/lib/data/dimensions.ts';

const file = path.resolve(import.meta.dirname, '../public/data/dataset.json');
const ds = enrich(JSON.parse(fs.readFileSync(file, 'utf8')));
const iso = (t: number | null) => (t === null ? null : new Date(t).toISOString());

const h = headline(ds);
console.log('peak', h.peak.count, iso(h.peak.t));
console.log('total person-days', h.totalPersonDays.toFixed(0), 'people flown', h.peopleFlown, 'women share', (h.womenShareDays * 100).toFixed(1) + '%');
console.log('continuous since', iso(h.continuousSince), 'in space now:', h.inSpaceNow.map((s) => s.person.name).join(', '));

const yr = (m: any, d: string, from = 1961) => aggregate(ds, { metric: m, dimension: dimensionById(d), resolution: 'year', from: Date.UTC(from, 0, 1), to: ds.dataEnd });
const a = yr('population', 'none');
console.log('avg pop by year (last 6):', a.x.slice(-6).map((t, i) => new Date(t).getUTCFullYear() + ':' + a.total[a.total.length - 6 + i].toFixed(2)).join('  '));
console.log('avg pop 1961..1969:', a.total.slice(0, 9).map((v) => v.toFixed(3)).join(' '));
const b = yr('population', 'nationality');
console.log('person-years by nationality:', b.series.map((s) => s.label + '=' + s.values.reduce((x, y) => x + y, 0).toFixed(1)).join(', '));
const c = aggregate(ds, { metric: 'population', dimension: dimensionById('sex'), resolution: 'exact', from: Date.UTC(1961, 0, 1), to: ds.dataEnd });
console.log('exact points', c.x.length, 'max total', Math.max(...c.total), c.series.map((s) => s.label));
console.log('cumulative people', yr('cumulativePeople', 'none').total.at(-1));
const e = aggregate(ds, { metric: 'population', dimension: dimensionById('destination'), resolution: 'month', from: Date.UTC(2000, 0, 1), to: ds.dataEnd });
console.log('monthly bins', e.x.length, e.series.map((s) => s.label + ':' + s.color).join(' '));

<script lang="ts">
  import type { Dataset } from '$lib/data/types';
  import { aggregate, seriesTotals, METRICS, metricById, type MetricId, type Resolution } from '$lib/data/engine';
  import { DIMENSIONS, dimensionById } from '$lib/data/dimensions';
  import TimeChart, { type ChartMode } from '$lib/charts/TimeChart.svelte';
  import RingChart from '$lib/charts/RingChart.svelte';
  import ChipGroup from '$lib/ui/ChipGroup.svelte';
  import { router } from '$lib/router.svelte';
  import { fmtValue, fmtYear, fmtMonth, fmtDateTime, fmtDate } from '$lib/format';

  let { ds }: { ds: Dataset } = $props();

  const minYear = 1961;
  const maxYear = new Date(ds.dataEnd).getUTCFullYear();

  // ---- state, mirrored to the query string so views are shareable
  const q = router.query;
  let metric = $state<MetricId>((q.get('m') as MetricId) ?? 'population');
  let by = $state(q.get('by') ?? 'destination');
  let res = $state<Resolution>((q.get('r') as Resolution) ?? 'year');
  let mode = $state<ChartMode>((q.get('c') as ChartMode) ?? 'stacked');
  let from = $state(clampYear(+(q.get('from') ?? minYear)));
  let to = $state(clampYear(+(q.get('to') ?? maxYear)));
  let suborbital = $state(q.get('sub') !== '0');

  function clampYear(y: number) {
    return Number.isFinite(y) ? Math.min(maxYear, Math.max(minYear, Math.round(y))) : minYear;
  }
  $effect(() => {
    router.replaceQuery({ m: metric, by, r: res, c: mode, from: String(from), to: String(to), ...(suborbital ? {} : { sub: '0' }) });
  });

  const m = $derived(metricById(metric));
  const dim = $derived(dimensionById(by));
  const effectiveRes = $derived<Resolution>(!m.supportsExact && res === 'exact' ? 'month' : res);
  const agg = $derived(
    aggregate(ds, {
      metric,
      dimension: dim,
      resolution: effectiveRes,
      from: Date.UTC(from, 0, 1),
      to: Math.min(Date.UTC(to + 1, 0, 1), ds.dataEnd),
      filter: suborbital ? undefined : (s) => s.up.destination !== 'suborbital',
    }),
  );

  const ring = $derived(mode === 'ring');
  const ringData = $derived(seriesTotals(agg));
  const title = $derived(dim.id === 'none' ? m.label : `${m.label} by ${dim.label.toLowerCase()}`);
  const subtitle = $derived.by(() => {
    if (ring) {
      const what = m.id === 'population' ? 'Person-days in space' : m.cumulative ? `${m.label} at the end of ${to}` : m.label;
      return `${what}, ${from}–${to}${suborbital ? '' : ', excluding suborbital flights'}.`;
    }
    const r = effectiveRes === 'exact' ? 'at every launch and landing' : effectiveRes === 'year' ? 'per year' : 'per month';
    const what = m.id === 'population' ? (effectiveRes === 'exact' ? 'Headcount' : 'Average headcount') : m.label;
    return `${what} ${r}, ${from}–${to}${suborbital ? '' : ', excluding suborbital flights'}.`;
  });

  // ---- table + csv
  let showTable = $state(false);
  const xLabel = $derived((i: number) => {
    const t = new Date(agg.x[i]);
    return agg.resolution === 'year' ? fmtYear(t) : agg.resolution === 'month' ? fmtMonth(t) : fmtDateTime(t);
  });
  function csv() {
    const head = ['period', ...agg.series.map((s) => s.label), ...(agg.series.length > 1 ? ['total'] : [])];
    const rows = agg.x.map((_, i) => [xLabel(i), ...agg.series.map((s) => s.values[i].toFixed(3)), ...(agg.series.length > 1 ? [agg.total[i].toFixed(3)] : [])]);
    const text = [head, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `population-of-space_${metric}_by-${by}_${effectiveRes}_${from}-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  function copyLink() {
    navigator.clipboard?.writeText(location.href);
  }

  const resOptions = $derived([
    { id: 'year', label: 'Yearly' },
    { id: 'month', label: 'Monthly' },
    { id: 'exact', label: 'Every event', disabled: !m.supportsExact, hint: m.supportsExact ? 'Exact headcount at each launch and landing' : 'Only available for “People in space”' },
  ]);
</script>

<div class="container explorer">
  <aside class="controls">
    <ChipGroup label="Measure" options={METRICS.map((x) => ({ id: x.id, label: x.label, hint: x.hint }))} value={metric} onchange={(v) => (metric = v as MetricId)} />
    <ChipGroup label="Break down by" options={DIMENSIONS.map((d) => ({ id: d.id, label: d.label, hint: d.hint }))} value={by} onchange={(v) => (by = v)} />
    <ChipGroup label="Chart" segmented options={[{ id: 'stacked', label: 'Stacked' }, { id: 'line', label: 'Lines' }, { id: 'share', label: 'Share' }, { id: 'ring', label: 'Ring' }]} value={mode} onchange={(v) => (mode = v as ChartMode)} />
    {#if !ring}
      <ChipGroup label="Resolution" segmented options={resOptions} value={effectiveRes} onchange={(v) => (res = v as Resolution)} />
    {/if}

    <fieldset class="range">
      <legend>Years</legend>
      <div class="range-row">
        <input type="number" min={minYear} max={to} bind:value={from} onchange={() => (from = clampYear(Math.min(from, to)))} aria-label="From year" />
        <span class="faint">to</span>
        <input type="number" min={from} max={maxYear} bind:value={to} onchange={() => (to = clampYear(Math.max(from, to)))} aria-label="To year" />
      </div>
      <div class="sliders">
        <input type="range" min={minYear} max={maxYear} bind:value={from} oninput={() => (to = Math.max(to, from))} aria-label="From year slider" />
        <input type="range" min={minYear} max={maxYear} bind:value={to} oninput={() => (from = Math.min(from, to))} aria-label="To year slider" />
      </div>
      <div class="presets">
        <button onclick={() => ((from = minYear), (to = maxYear))}>All</button>
        <button onclick={() => ((from = 1961), (to = 1975))}>Space race</button>
        <button onclick={() => ((from = 1986), (to = 2001))}>Mir era</button>
        <button onclick={() => ((from = 2000), (to = maxYear))}>ISS era</button>
        <button onclick={() => ((from = 2020), (to = maxYear))}>2020s</button>
      </div>
    </fieldset>

    <label class="check">
      <input type="checkbox" bind:checked={suborbital} />
      Include suborbital flights
    </label>
  </aside>

  <section class="card panel">
    <header class="panel-head">
      <div>
        <h2>{title}</h2>
        <p class="muted small">{subtitle}</p>
      </div>
      <div class="actions">
        <button class="btn" onclick={() => (showTable = !showTable)}>{showTable ? 'Chart' : 'Table'}</button>
        <button class="btn" onclick={csv}>Download CSV</button>
        <button class="btn" onclick={copyLink} title="Copy a link to this exact view">Share</button>
      </div>
    </header>

    {#if showTable}
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Period</th>
              {#each agg.series as s}<th class="num">{s.label}</th>{/each}
              {#if agg.series.length > 1}<th class="num">Total</th>{/if}
            </tr>
          </thead>
          <tbody>
            {#each agg.x as _, i}
              <tr>
                <td>{xLabel(i)}</td>
                {#each agg.series as s}<td class="num">{fmtValue(s.values[i])}</td>{/each}
                {#if agg.series.length > 1}<td class="num"><b>{fmtValue(agg.total[i])}</b></td>{/if}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {:else if ring}
      <RingChart totals={ringData.totals} unit={ringData.unit} height={440} />
    {:else}
      <TimeChart {agg} {mode} unit={m.unit} height={440} />
    {/if}
    <p class="footnote faint small">
      {#if ring}The ring shows totals over the selected years{m.id === 'population' ? ', with headcount integrated into person-days' : ''}.{/if}
      {m.hint}
      {#if dim.id !== 'none'}{dim.hint}{/if}
      Data complete through {fmtDate(new Date(ds.dataEnd))}.
    </p>
  </section>
</div>

<style>
  .explorer {
    display: grid;
    grid-template-columns: 250px 1fr;
    gap: 28px;
    padding-top: 28px;
    align-items: start;
  }
  .controls {
    position: sticky;
    top: 16px;
  }
  .panel {
    padding: 20px 22px 14px;
    min-width: 0;
  }
  .panel-head {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: flex-start;
    margin-bottom: 8px;
  }
  .panel-head h2 {
    font-size: 1.35rem;
    margin-bottom: 2px;
  }
  .panel-head p {
    margin: 0;
  }
  .actions {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
  }
  .footnote {
    margin: 12px 0 0;
    line-height: 1.45;
  }
  fieldset.range {
    border: 0;
    padding: 0;
    margin: 0 0 18px;
  }
  legend {
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--ink-3);
    padding: 0;
    margin-bottom: 7px;
  }
  .range-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .range-row input {
    width: 74px;
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 4px 8px;
    background: var(--bg-elev);
    font-variant-numeric: tabular-nums;
  }
  .sliders {
    display: grid;
    gap: 2px;
    margin: 8px 2px 6px;
  }
  .sliders input {
    width: 100%;
    accent-color: var(--accent);
    margin: 0;
  }
  .presets {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .presets button {
    border: 0;
    background: var(--bg-muted);
    color: var(--ink-2);
    border-radius: 6px;
    font-size: 0.78rem;
    padding: 2px 8px;
  }
  .presets button:hover {
    color: var(--ink);
  }
  .check {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
    color: var(--ink-2);
  }
  .check input {
    accent-color: var(--accent);
  }
  .table-wrap {
    overflow: auto;
    max-height: 520px;
    border: 1px solid var(--line);
    border-radius: 8px;
  }
  th,
  td {
    padding: 5px 10px;
    border-bottom: 1px solid var(--line);
    font-size: 0.85rem;
    white-space: nowrap;
  }
  th {
    position: sticky;
    top: 0;
    background: var(--bg-muted);
    text-align: left;
    font-weight: 600;
  }
  .num {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  @media (max-width: 860px) {
    .explorer {
      grid-template-columns: 1fr;
    }
    .controls {
      position: static;
    }
    .panel-head {
      flex-direction: column;
    }
  }
</style>

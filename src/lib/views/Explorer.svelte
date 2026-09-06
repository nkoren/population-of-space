<script lang="ts">
  import type { Dataset } from '$lib/data/types';
  import { aggregate, seriesTotals, METRICS, metricById, type MetricId, type Resolution } from '$lib/data/engine';
  import { DIMENSIONS, dimensionById } from '$lib/data/dimensions';
  import TimeChart, { type ChartMode } from '$lib/charts/TimeChart.svelte';
  import RingChart from '$lib/charts/RingChart.svelte';
  import ChipGroup from '$lib/ui/ChipGroup.svelte';
  import { router } from '$lib/router.svelte';
  import { ERAS, PHOTOS } from '$lib/eras';
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

  // ---- layout: the chart fills the screen on desktop
  let innerHeight = $state(900);
  let innerWidth = $state(1440);
  const chartHeight = $derived(innerWidth > 860 ? Math.max(360, Math.min(640, innerHeight - 330)) : 320);
  let showControls = $state(false);

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
  const yearPresets = [
    { label: 'All', from: minYear, to: maxYear },
    ...ERAS.map((e) => ({ label: e.name, from: e.from, to: e.to ?? maxYear })),
    { label: '2020s', from: 2020, to: maxYear },
  ];
  const modeLabel = $derived({ stacked: 'Stacked', line: 'Lines', share: 'Share', ring: 'Ring' }[mode]);
</script>

<svelte:window bind:innerHeight bind:innerWidth />

<div class="explorer">
  <div class="photo" aria-hidden="true">
    <img src={PHOTOS.explorer.image} alt="" />
    <div class="scrim"></div>
  </div>

  <div class="container layout">
    <!-- On small screens the controls collapse behind a summary row. -->
    <div class="summary scroll-x">
      <button class="chip on" onclick={() => (showControls = !showControls)} aria-expanded={showControls}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="15" cy="7" r="2.5" /><circle cx="9" cy="17" r="2.5" /></svg>
        {showControls ? 'Hide controls' : m.label}
      </button>
      <span class="chip">{dim.label}</span>
      <span class="chip">{modeLabel}</span>
      {#if !ring}<span class="chip">{resOptions.find((r) => r.id === effectiveRes)?.label}</span>{/if}
      <span class="chip mono">{from}–{to}</span>
    </div>

    <aside class="card controls" class:open={showControls}>
      <ChipGroup label="Measure" options={METRICS.map((x) => ({ id: x.id, label: x.label, hint: x.hint }))} value={metric} onchange={(v) => (metric = v as MetricId)} />
      <ChipGroup label="Break down by" options={DIMENSIONS.map((d) => ({ id: d.id, label: d.label, hint: d.hint }))} value={by} onchange={(v) => (by = v)} />
      <ChipGroup label="Chart" segmented options={[{ id: 'stacked', label: 'Stacked' }, { id: 'line', label: 'Lines' }, { id: 'share', label: 'Share' }, { id: 'ring', label: 'Ring' }]} value={mode} onchange={(v) => (mode = v as ChartMode)} />
      {#if !ring}
        <ChipGroup label="Resolution" segmented options={resOptions} value={effectiveRes} onchange={(v) => (res = v as Resolution)} />
      {/if}

      <fieldset class="range">
        <legend class="label">Years</legend>
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
          {#each yearPresets as p}
            <button class:on={from === p.from && to === p.to} onclick={() => ((from = p.from), (to = p.to))}>{p.label}</button>
          {/each}
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
          <p class="muted">{subtitle}</p>
        </div>
        <div class="actions">
          <button class="btn" onclick={() => (showTable = !showTable)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M9 10v9" /></svg>
            {showTable ? 'Chart' : 'Table'}
          </button>
          <button class="btn" onclick={csv}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M4 19h16" /></svg>
            CSV
          </button>
          <button class="btn" onclick={copyLink} title="Copy a link to this exact view">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.5 1.5" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.5-1.5" /></svg>
            Share
          </button>
        </div>
      </header>

      <div class="body">
        {#if showTable}
          <div class="table-wrap" style:max-height="{chartHeight + 60}px">
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
          <RingChart totals={ringData.totals} unit={ringData.unit} height={chartHeight} />
        {:else}
          <TimeChart {agg} {mode} unit={m.unit} height={chartHeight} />
        {/if}
      </div>
      <p class="footnote faint small">
        {#if ring}The ring shows totals over the selected years{m.id === 'population' ? ', with headcount integrated into person-days' : ''}.{/if}
        {m.hint}
        {#if dim.id !== 'none'}{dim.hint}{/if}
        Data complete through {fmtDate(new Date(ds.dataEnd))}.
      </p>
    </section>
  </div>
  <div class="container credit-row"><span class="credit">{PHOTOS.explorer.credit}</span></div>
</div>

<style>
  .explorer {
    position: relative;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    padding-top: 88px;
  }
  .explorer .photo img {
    object-position: center 60%;
    filter: saturate(0.85);
  }
  .explorer .scrim {
    background: linear-gradient(180deg, rgba(6, 8, 15, 0.7) 0%, rgba(6, 8, 15, 0.82) 40%, rgba(6, 8, 15, 0.94) 100%);
  }
  .layout {
    position: relative;
    display: grid;
    grid-template-columns: 300px minmax(0, 1fr);
    gap: 24px;
    align-items: start;
    flex: 1;
  }
  .summary {
    display: none;
  }
  .controls {
    padding: 22px 20px 18px;
    display: flex;
    flex-direction: column;
  }
  .panel {
    padding: 24px 28px 18px;
    min-width: 0;
    display: flex;
    flex-direction: column;
    position: sticky;
    top: 16px;
  }
  .panel-head {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: flex-start;
    margin-bottom: 10px;
  }
  .panel-head h2 {
    margin-bottom: 4px;
  }
  .panel-head p {
    margin: 0;
    font-size: 0.92rem;
  }
  .actions {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
  }
  .body {
    flex: 1;
  }
  .footnote {
    margin: 12px 0 0;
    line-height: 1.45;
  }
  .credit-row {
    position: relative;
    display: flex;
    justify-content: flex-end;
    padding-top: 14px;
    padding-bottom: 14px;
  }
  fieldset.range {
    border: 0;
    padding: 0;
    margin: 0 0 20px;
  }
  legend {
    padding: 0;
    margin-bottom: 8px;
  }
  .range-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .range-row input {
    width: 76px;
    height: 34px;
    padding: 0 10px;
    font-family: var(--font-mono);
    font-size: 0.88rem;
    font-variant-numeric: tabular-nums;
  }
  .sliders {
    display: grid;
    gap: 2px;
    margin: 10px 2px 8px;
  }
  .sliders input {
    width: 100%;
    accent-color: var(--accent);
    margin: 0;
    background: none;
    border: 0;
  }
  .presets {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .presets button {
    height: 30px;
    border: 1px solid var(--line-strong);
    background: transparent;
    color: var(--ink-2);
    border-radius: 999px;
    font-size: 0.8rem;
    padding: 0 11px;
  }
  .presets button:hover {
    color: var(--ink);
    border-color: var(--accent);
  }
  .presets button.on {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }
  .check {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.9rem;
    color: var(--ink-2);
  }
  .check input {
    accent-color: var(--accent);
    width: 18px;
    height: 18px;
    margin: 0;
  }
  .table-wrap {
    overflow: auto;
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
    background: var(--bg-elev);
    text-align: left;
    font-weight: 600;
  }
  .num {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 38px;
    padding: 0 14px;
    border-radius: 999px;
    border: 1px solid var(--line-strong);
    background: transparent;
    color: var(--ink-2);
    font-size: 0.88rem;
    white-space: nowrap;
  }
  .chip.on {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
    font-weight: 500;
  }
  @media (max-width: 860px) {
    .explorer {
      min-height: 0;
      padding-top: 76px;
    }
    .explorer .photo {
      height: 560px;
    }
    .explorer .scrim {
      background: linear-gradient(180deg, rgba(6, 8, 15, 0.7) 0%, rgba(6, 8, 15, 0.85) 55%, var(--bg) 100%);
    }
    .layout {
      grid-template-columns: 1fr;
      gap: 14px;
    }
    .summary {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      margin: 0 calc(-1 * var(--gutter));
      padding: 0 var(--gutter) 4px;
    }
    .controls {
      display: none;
      order: 3;
    }
    .panel {
      position: static;
    }
    .controls.open {
      display: flex;
    }
    .panel {
      padding: 16px 12px 12px;
      order: 2;
    }
    .panel-head {
      flex-direction: column;
    }
    .actions {
      width: 100%;
    }
    .actions .btn {
      flex: 1;
      justify-content: center;
      height: 44px;
    }
  }
</style>

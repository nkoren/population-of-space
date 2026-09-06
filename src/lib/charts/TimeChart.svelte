<script lang="ts">
  // The one chart. Renders an Aggregate as a stacked area, multi-line or
  // 100%-share chart and morphs smoothly whenever the aggregate changes —
  // including across breakdowns and resolutions, by resampling the outgoing
  // frame onto the incoming time axis before tweening.
  import { scaleUtc, scaleLinear } from 'd3-scale';
  import { area, line, curveMonotoneX, curveStepAfter } from 'd3-shape';
  import { bisector } from 'd3-array';
  import { Tween } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import type { Aggregate, Resolution, Series } from '$lib/data/engine';
  import { fmtValue, fmtCompact, fmtYear, fmtMonth, fmtDateTime } from '$lib/format';

  export type ChartMode = 'stacked' | 'line' | 'share' | 'ring';

  interface Props {
    agg: Aggregate;
    mode?: ChartMode;
    height?: number;
    unit?: string;
    /** hide the legend (e.g. for single-series charts) */
    legend?: boolean;
  }
  let { agg, mode: modeProp = 'stacked', height = 420, unit = '', legend = true }: Props = $props();
  // 'ring' is rendered by RingChart; treat it as stacked here so the fallback is sane.
  const mode = $derived(modeProp === 'ring' ? 'stacked' : modeProp);

  interface Frame {
    x: number[];
    xEnd: number[];
    res: Resolution;
    series: Series[];
  }
  const toFrame = (a: Aggregate): Frame => ({ x: a.x, xEnd: a.xEnd, res: a.resolution, series: a.series });

  /** Step-after lookup of an old series onto a new time axis. */
  function resample(oldX: number[], vals: number[], newX: number[]): number[] {
    const bis = bisector<number, number>((d) => d).right;
    return newX.map((t) => {
      const i = bis(oldX, t) - 1;
      return i < 0 ? 0 : vals[Math.min(i, vals.length - 1)];
    });
  }
  function interpolateFrame(a: Frame, b: Frame) {
    const sameAxis = a.x.length === b.x.length && a.x[0] === b.x[0] && a.x[a.x.length - 1] === b.x[b.x.length - 1];
    const aByKey = new Map(a.series.map((s) => [s.key, s]));
    const bKeys = new Set(b.series.map((s) => s.key));
    const zeros = new Array(b.x.length).fill(0);
    const merged: { meta: Series; from: number[]; to: number[] }[] = [];
    for (const s of b.series) {
      const prev = aByKey.get(s.key);
      merged.push({ meta: s, from: prev ? (sameAxis ? prev.values : resample(a.x, prev.values, b.x)) : zeros, to: s.values });
    }
    for (const s of a.series) {
      if (bKeys.has(s.key)) continue;
      merged.push({ meta: { ...s, values: zeros }, from: sameAxis ? s.values : resample(a.x, s.values, b.x), to: zeros });
    }
    return (t: number): Frame => ({
      x: b.x,
      xEnd: b.xEnd,
      res: b.res,
      series: merged.map((m) => ({ ...m.meta, values: m.from.map((v, i) => v + (m.to[i] - v) * t) })),
    });
  }

  function yMaxOf(f: Frame, m: ChartMode): number {
    if (m === 'share') return 1;
    let max = 0;
    for (let i = 0; i < f.x.length; i++) {
      if (m === 'stacked') max = Math.max(max, f.series.reduce((a, s) => a + s.values[i], 0));
      else for (const s of f.series) max = Math.max(max, s.values[i]);
    }
    return max > 0 ? scaleLinear().domain([0, max]).nice(5).domain()[1] : 1;
  }
  const tween = new Tween<Frame>(toFrame(agg), { duration: 700, easing: cubicOut, interpolate: interpolateFrame });
  const yTween = new Tween(yMaxOf(toFrame(agg), mode), { duration: 700, easing: cubicOut });
  $effect(() => {
    const f = toFrame(agg);
    tween.target = f;
    yTween.target = yMaxOf(f, mode);
  });

  // ------------------------------------------------------------ layout
  let width = $state(800);
  const margin = { top: 12, right: 16, bottom: 30, left: 48 };
  const innerW = $derived(Math.max(10, width - margin.left - margin.right));
  const innerH = $derived(height - margin.top - margin.bottom);

  const frame = $derived(tween.current);
  const step = $derived(frame.res === 'exact');
  // Draw bins at their midpoints, events at their instant.
  const px = $derived(step ? frame.x : frame.x.map((x, i) => (x + frame.xEnd[i]) / 2));
  const xScale = $derived(
    scaleUtc()
      .domain([frame.x[0] ?? 0, frame.xEnd[frame.xEnd.length - 1] ?? 1])
      .range([0, innerW]),
  );
  const yScale = $derived(scaleLinear().domain([0, yTween.current]).range([innerH, 0]));

  // Series worth drawing (exiting ones fade to nothing then vanish).
  const live = $derived(frame.series.filter((s) => s.values.some((v) => v > 1e-6)));
  const totals = $derived(frame.x.map((_, i) => frame.series.reduce((a, s) => a + s.values[i], 0)));
  const norm = $derived((i: number, v: number) => (mode === 'share' ? (totals[i] > 0 ? v / totals[i] : 0) : v));

  interface Layer {
    s: Series;
    y0: number[];
    y1: number[];
  }
  const layers = $derived.by((): Layer[] => {
    const n = frame.x.length;
    const base = new Array<number>(n).fill(0);
    return live.map((s) => {
      const y0 = base.slice();
      const y1 = s.values.map((v, i) => {
        const val = norm(i, v);
        const top = mode === 'line' ? val : base[i] + val;
        if (mode !== 'line') base[i] = top;
        return top;
      });
      return { s, y0: mode === 'line' ? y1 : y0, y1 };
    });
  });

  const idx = $derived(frame.x.map((_, i) => i));
  function areaPath(l: Layer) {
    return (
      area<number>()
        .x((i) => xScale(px[i]))
        .y0((i) => yScale(l.y0[i]))
        .y1((i) => yScale(l.y1[i]))
        .curve(step ? curveStepAfter : curveMonotoneX)(idx) ?? ''
    );
  }
  /** Hairline along a layer's top edge, only where the layer is non-zero. In event mode this
   *  keeps very short flights (minutes-long suborbital hops) visible as 1px ticks even when
   *  their filled area is far narrower than a pixel. */
  function edgePath(l: Layer) {
    const v = l.s.values;
    return (
      line<number>()
        .defined((i) => v[i] > 1e-6 || (i > 0 && v[i - 1] > 1e-6))
        .x((i) => xScale(px[i]))
        .y((i) => yScale(l.y1[i]))
        .curve(curveStepAfter)(idx) ?? ''
    );
  }
  function linePath(l: Layer) {
    return (
      line<number>()
        .x((i) => xScale(px[i]))
        .y((i) => yScale(l.y1[i]))
        .curve(step ? curveStepAfter : curveMonotoneX)(idx) ?? ''
    );
  }

  const yTicks = $derived(yScale.ticks(5));
  const xTicks = $derived(xScale.ticks(Math.max(2, Math.floor(innerW / 90))));
  const fmtY = $derived((v: number) => (mode === 'share' ? `${Math.round(v * 100)}%` : fmtCompact(v)));

  // ------------------------------------------------------------ hover
  let hoverI = $state<number | null>(null);
  let hoverKey = $state<string | null>(null);
  let mouseX = $state(0);
  const bisX = bisector<number, number>((d) => d).center;
  function onMove(e: MouseEvent) {
    const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
    const x = e.clientX - rect.left - margin.left;
    mouseX = x;
    if (x < 0 || x > innerW || frame.x.length === 0) {
      hoverI = null;
      return;
    }
    const t = xScale.invert(x).getTime();
    hoverI = step ? Math.max(0, bisector<number, number>((d) => d).right(frame.x, t) - 1) : bisX(px, t);
  }
  const labelFor = $derived((i: number) => {
    const t = frame.x[i];
    if (frame.res === 'year') return fmtYear(new Date(t));
    if (frame.res === 'month') return fmtMonth(new Date(t));
    return fmtDateTime(new Date(t));
  });
  const tooltipRows = $derived.by(() => {
    if (hoverI === null) return [];
    const i = hoverI;
    return live
      .map((s) => ({ s, v: s.values[i], share: totals[i] > 0 ? s.values[i] / totals[i] : 0 }))
      .filter((r) => r.v > 1e-6)
      .sort((a, b) => b.v - a.v);
  });
  const tooltipLeft = $derived(hoverI === null ? 0 : xScale(px[hoverI]) + margin.left);
  const flip = $derived(tooltipLeft > width * 0.6);
</script>

<div class="chart" bind:clientWidth={width}>
  {#if frame.x.length === 0 || live.length === 0}
    <div class="empty" style:height="{height}px">No data for this selection.</div>
  {:else}
    <svg {width} {height} onmousemove={onMove} onmouseleave={() => (hoverI = null)} role="img" aria-label="Chart">
      <g transform="translate({margin.left},{margin.top})">
        <!-- grid + axes -->
        {#each yTicks as t}
          <line class="grid" x1="0" x2={innerW} y1={yScale(t)} y2={yScale(t)} />
          <text class="ytick" x="-8" y={yScale(t)} dy="0.32em" text-anchor="end">{fmtY(t)}</text>
        {/each}
        {#each xTicks as t}
          <text class="xtick" x={xScale(t)} y={innerH + 20} text-anchor="middle">{fmtYear(t)}</text>
        {/each}
        <line class="axis" x1="0" x2={innerW} y1={innerH} y2={innerH} />

        <!-- layers -->
        {#each layers as l (l.s.key)}
          {@const dim = hoverKey !== null && hoverKey !== l.s.key}
          {#if mode === 'line'}
            <path class="line" d={linePath(l)} stroke={l.s.color} opacity={dim ? 0.2 : 1} />
          {:else}
            <path class="area" d={areaPath(l)} fill={l.s.color} opacity={dim ? 0.25 : 0.9} />
            {#if step}
              <path class="edge" d={edgePath(l)} stroke={l.s.color} opacity={dim ? 0.25 : 1} />
            {/if}
          {/if}
        {/each}

        <!-- hover -->
        {#if hoverI !== null}
          <line class="rule" x1={xScale(px[hoverI])} x2={xScale(px[hoverI])} y1="0" y2={innerH} />
          {#each layers as l (l.s.key)}
            {#if l.s.values[hoverI] > 1e-6}
              <circle cx={xScale(px[hoverI])} cy={yScale(l.y1[hoverI])} r="3.5" fill={l.s.color} class="dot" />
            {/if}
          {/each}
        {/if}
      </g>
    </svg>

    {#if hoverI !== null && tooltipRows.length}
      <div class="tooltip" style:left="{tooltipLeft}px" style:top="{margin.top}px" class:flip>
        <div class="tt-title">{labelFor(hoverI)}</div>
        {#each tooltipRows.slice(0, 12) as r}
          <div class="tt-row">
            <span class="swatch" style:background={r.s.color}></span>
            <span class="tt-label">{r.s.label}</span>
            <span class="tt-val">{fmtValue(r.v)}</span>
            {#if live.length > 1 && mode !== 'line'}<span class="tt-share">{Math.round(r.share * 100)}%</span>{/if}
          </div>
        {/each}
        {#if live.length > 1}
          <div class="tt-row total">
            <span class="swatch"></span>
            <span class="tt-label">Total</span>
            <span class="tt-val">{fmtValue(totals[hoverI])}</span>
            {#if mode !== 'line'}<span class="tt-share"></span>{/if}
          </div>
        {/if}
        {#if unit}<div class="tt-unit">{unit}</div>{/if}
      </div>
    {/if}

    {#if legend && live.length > 1}
      <div class="legend">
        {#each [...layers].reverse() as l (l.s.key)}
          <button
            class="chip"
            class:dim={hoverKey !== null && hoverKey !== l.s.key}
            onmouseenter={() => (hoverKey = l.s.key)}
            onmouseleave={() => (hoverKey = null)}
            onfocus={() => (hoverKey = l.s.key)}
            onblur={() => (hoverKey = null)}
          >
            <span class="swatch" style:background={l.s.color}></span>{l.s.label}
          </button>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<style>
  .chart {
    position: relative;
    width: 100%;
  }
  svg {
    display: block;
    overflow: visible;
    font-family: var(--font-body);
  }
  .grid {
    stroke: var(--chart-grid);
    stroke-width: 1;
  }
  .axis {
    stroke: var(--line);
  }
  .ytick,
  .xtick {
    fill: var(--chart-axis);
    font-size: 11.5px;
    font-variant-numeric: tabular-nums;
  }
  .area {
    transition: opacity 0.2s;
  }
  .edge {
    fill: none;
    stroke-width: 1;
    shape-rendering: crispEdges;
    pointer-events: none;
  }
  .line {
    fill: none;
    stroke-width: 2.2;
    stroke-linejoin: round;
    stroke-linecap: round;
    transition: opacity 0.2s;
  }
  .rule {
    stroke: var(--ink-3);
    stroke-width: 1;
    stroke-dasharray: 3 3;
    pointer-events: none;
  }
  .dot {
    stroke: var(--bg-elev);
    stroke-width: 1.5;
    pointer-events: none;
  }
  .empty {
    display: grid;
    place-items: center;
    color: var(--ink-3);
  }
  .tooltip {
    position: absolute;
    transform: translateX(12px);
    background: var(--bg-elev);
    border: 1px solid var(--line);
    border-radius: 10px;
    box-shadow: var(--shadow);
    padding: 8px 12px;
    font-size: 12.5px;
    pointer-events: none;
    min-width: 200px;
    z-index: 2;
  }
  .tooltip.flip {
    transform: translateX(calc(-100% - 12px));
  }
  .tt-title {
    font-weight: 600;
    margin-bottom: 4px;
  }
  .tt-row {
    display: grid;
    grid-template-columns: 10px 1fr auto auto;
    gap: 8px;
    align-items: center;
    line-height: 1.7;
  }
  .tt-row.total {
    border-top: 1px solid var(--line);
    margin-top: 3px;
    padding-top: 3px;
    font-weight: 600;
  }
  .tt-val {
    font-variant-numeric: tabular-nums;
    font-weight: 500;
  }
  .tt-share {
    font-variant-numeric: tabular-nums;
    color: var(--ink-3);
    min-width: 32px;
    text-align: right;
  }
  .tt-unit {
    color: var(--ink-3);
    font-size: 11px;
    margin-top: 2px;
  }
  .swatch {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 3px;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 6px;
    padding: 10px 0 0 48px;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid transparent;
    background: none;
    border-radius: 999px;
    padding: 2px 9px 2px 6px;
    font-size: 12.5px;
    color: var(--ink-2);
    transition: opacity 0.2s, background 0.15s;
  }
  .chip:hover {
    background: var(--bg-muted);
    color: var(--ink);
  }
  .chip.dim {
    opacity: 0.4;
  }
</style>

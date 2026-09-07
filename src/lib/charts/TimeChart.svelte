<script lang="ts">
  // The one chart. Renders an Aggregate as a stacked area, multi-line or
  // 100%-share chart and morphs smoothly whenever the aggregate changes —
  // including across breakdowns and resolutions, by resampling the outgoing
  // frame onto the incoming time axis before tweening.
  import { scaleUtc, scaleLinear } from 'd3-scale';
  import { area, line, curveLinear, curveStepAfter } from 'd3-shape';
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
    /** Called when the user zooms or pans the year range with the wheel, a drag or a pinch. */
    onrange?: (from: number, to: number) => void;
    /** Inclusive [min, max] years the range may cover; pans keep their span within these. */
    yearBounds?: [number, number];
    /** Where the year labels go. */
    xAxis?: 'top' | 'bottom';
    /** Instants whose pixel positions the caller wants back through `layout` (story annotations). */
    markers?: number[];
    /**
     * Bound output for callers that draw annotations around the chart: each marker's x position
     * and the zero axis's y position, both in px from the chart's top-left corner.
     */
    layout?: { markerX: number[]; axisY: number };
  }
  let {
    agg,
    mode: modeProp = 'stacked',
    height = 420,
    unit = '',
    legend = true,
    onrange,
    yearBounds,
    xAxis = 'bottom',
    markers = [],
    layout = $bindable({ markerX: [], axisY: 0 }),
  }: Props = $props();
  // 'ring' is rendered by RingChart; treat it as stacked here so the fallback is sane.
  const mode = $derived(modeProp === 'ring' ? 'stacked' : modeProp);

  interface Frame {
    x: number[];
    xEnd: number[];
    res: Resolution;
    series: Series[];
    band: { min: number[]; max: number[] } | null;
  }
  const toFrame = (a: Aggregate): Frame => ({ x: a.x, xEnd: a.xEnd, res: a.resolution, series: a.series, band: a.band ?? null });

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
    // The band tweens from the outgoing band (resampled), or grows out of the total when there was none.
    const totalsA = a.x.map((_, i) => a.series.reduce((acc, s) => acc + s.values[i], 0));
    const bandFrom = (key: 'min' | 'max') => (a.band ? (sameAxis ? a.band[key] : resample(a.x, a.band[key], b.x)) : resample(a.x, totalsA, b.x));
    const band = b.band
      ? { min: { from: bandFrom('min'), to: b.band.min }, max: { from: bandFrom('max'), to: b.band.max } }
      : null;
    const lerp = (from: number[], to: number[], t: number) => from.map((v, i) => v + (to[i] - v) * t);
    return (t: number): Frame => ({
      x: b.x,
      xEnd: b.xEnd,
      res: b.res,
      series: merged.map((m) => ({ ...m.meta, values: lerp(m.from, m.to, t) })),
      band: band ? { min: lerp(band.min.from, band.min.to, t), max: lerp(band.max.from, band.max.to, t) } : null,
    });
  }

  function yMaxOf(f: Frame, m: ChartMode): number {
    if (m === 'share') return 1;
    let max = 0;
    for (let i = 0; i < f.x.length; i++) {
      if (m === 'stacked') max = Math.max(max, f.series.reduce((a, s) => a + s.values[i], 0));
      else for (const s of f.series) max = Math.max(max, s.values[i]);
      if (f.band && m === 'line' && f.series.length === 1) max = Math.max(max, f.band.max[i]);
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
  const margin = $derived(xAxis === 'top' ? { top: 30, right: 16, bottom: 12, left: 48 } : { top: 12, right: 16, bottom: 30, left: 48 });
  const innerW = $derived(Math.max(10, width - margin.left - margin.right));
  const innerH = $derived(height - margin.top - margin.bottom);

  const frame = $derived(tween.current);
  const step = $derived(frame.res === 'exact');
  // Draw bins at their midpoints, events at their instant. The first and last bins are
  // pinned to the ends of the range instead, so the selected years are the chart's exact
  // left and right bounds and the curve neither plateaus nor stops short of the edge.
  const px = $derived.by(() => {
    if (step) return frame.x;
    const n = frame.x.length;
    return frame.x.map((x, i) => (n > 1 && i === 0 ? x : n > 1 && i === n - 1 ? frame.xEnd[i] : (x + frame.xEnd[i]) / 2));
  });
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

  const EPS = 1e-9;
  /** Drawing grid for the binned (non-step) resolutions: every bin midpoint plus every bin
   *  boundary, shared by all series so the stacked layers meet exactly. Between midpoints a
   *  series is interpolated linearly, except that a series which is zero on either side of
   *  a boundary is pinned to zero at that boundary, so a bump stays inside the bins that
   *  actually contain it (e.g. no women in space in 1962 just because there were in 1963).
   *  Series are stacked and share-normalised on this grid, so the layers are consistent by
   *  construction. */
  interface GridLayer {
    s: Series;
    y0: number[];
    y1: number[];
  }
  const grid = $derived.by((): { t: number[]; layers: GridLayer[] } => {
    const n = frame.x.length;
    const t: number[] = [];
    const vals: number[][] = live.map(() => []);
    for (let i = 0; i < n; i++) {
      if (i > 0) {
        const b = frame.x[i];
        const k = (b - px[i - 1]) / (px[i] - px[i - 1]);
        t.push(b);
        live.forEach((s, j) => {
          const a = s.values[i - 1];
          const c = s.values[i];
          vals[j].push(a <= EPS || c <= EPS ? 0 : a + (c - a) * k);
        });
      }
      t.push(px[i]);
      live.forEach((s, j) => vals[j].push(s.values[i]));
    }
    const m = t.length;
    const tot = new Array<number>(m).fill(0);
    for (const v of vals) for (let g = 0; g < m; g++) tot[g] += v[g];
    const base = new Array<number>(m).fill(0);
    const layers = live.map((s, j) => {
      const y0 = base.slice();
      const y1 = vals[j].map((v, g) => {
        const val = mode === 'share' ? (tot[g] > 0 ? v / tot[g] : 0) : v;
        const top = mode === 'line' ? val : base[g] + val;
        if (mode !== 'line') base[g] = top;
        return top;
      });
      return { s, y0: mode === 'line' ? y1 : y0, y1 };
    });
    return { t, layers };
  });
  const gridIdx = $derived(grid.t.map((_, g) => g));

  function areaPath(l: Layer, gl: GridLayer | undefined) {
    if (step || !gl) {
      return (
        area<number>()
          .x((i) => xScale(px[i]))
          .y0((i) => yScale(l.y0[i]))
          .y1((i) => yScale(l.y1[i]))
          .curve(curveStepAfter)(idx) ?? ''
      );
    }
    return (
      area<number>()
        .x((g) => xScale(grid.t[g]))
        .y0((g) => yScale(gl.y0[g]))
        .y1((g) => yScale(gl.y1[g]))
        .curve(curveLinear)(gridIdx) ?? ''
    );
  }
  /** Hairline along a layer's top edge, only where the layer is non-zero. In event mode this
   *  keeps very short flights (minutes-long suborbital hops) visible as 1px ticks even when
   *  their filled area is far narrower than a pixel. */
  function edgePath(l: Layer) {
    // Built by hand rather than with a step curve: a step's vertical connectors would run the
    // full height of the stack, painting this layer's colour over the layers beneath it. Here
    // each non-zero interval gets its top edge plus verticals spanning only its own thickness.
    const v = l.s.values;
    const n = idx.length;
    let d = '';
    for (let i = 0; i < n; i++) {
      if (v[i] <= 1e-6) continue;
      const x0 = xScale(px[i]);
      const x1 = i + 1 < n ? xScale(px[i + 1]) : innerW;
      const top = yScale(l.y1[i]);
      const bot = yScale(l.y0[i]);
      d += `M${x0},${bot}V${top}H${x1}V${bot}`;
    }
    return d;
  }
  function linePath(l: Layer, gl: GridLayer | undefined) {
    if (step || !gl) {
      return (
        line<number>()
          .x((i) => xScale(px[i]))
          .y((i) => yScale(l.y1[i]))
          .curve(curveStepAfter)(idx) ?? ''
      );
    }
    return (
      line<number>()
        .x((g) => xScale(grid.t[g]))
        .y((g) => yScale(gl.y1[g]))
        .curve(curveLinear)(gridIdx) ?? ''
    );
  }

  // Low/high headcount envelope: only on a line chart of a single series (no breakdown, or a
  // filter that leaves one group), where the line is the total and the band reads as its range.
  const showBand = $derived(frame.band !== null && mode === 'line' && live.length === 1);
  const bandPath = $derived.by(() => {
    const b = frame.band;
    if (!b || !showBand) return '';
    return (
      area<number>()
        .x((i) => xScale(px[i]))
        .y0((i) => yScale(b.min[i]))
        .y1((i) => yScale(b.max[i]))
        .curve(curveLinear)(idx) ?? ''
    );
  });

  $effect(() => {
    const markerX = markers.map((t) => xScale(t) + margin.left);
    const axisY = margin.top + innerH;
    const same = axisY === layout.axisY && markerX.length === layout.markerX.length && markerX.every((x, i) => Math.abs(x - layout.markerX[i]) < 0.01);
    if (!same) layout = { markerX, axisY };
  });

  const yTicks = $derived(yScale.ticks(5));
  const xTicks = $derived.by(() => {
    const end = xScale.domain()[1].getTime();
    return xScale.ticks(Math.max(2, Math.floor(innerW / 90))).filter((t) => t.getTime() < end);
  });
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
  // ------------------------------------------------------------ range gestures
  // Wheel zooms, drag pans, and on touch screens a two-finger pinch zooms. All of them read
  // the range from the target aggregate (not the tweened frame) so quick successive inputs
  // accumulate instead of recomputing against a mid-animation axis.
  const curRange = () => {
    if (agg.x.length === 0) return null;
    const from = new Date(agg.x[0]).getUTCFullYear();
    const to = new Date(agg.xEnd[agg.xEnd.length - 1] - 1).getUTCFullYear();
    return { from, to, span: to - from + 1 };
  };
  /** Clamp to yearBounds. keepSpan slides the whole window back inside (for pans); otherwise
   *  the two ends are clamped independently (for zooms). Returns null if the range collapses. */
  function emitRange(nf: number, nt: number, keepSpan: boolean) {
    if (!onrange) return;
    nf = Math.round(nf);
    nt = Math.round(nt);
    const [lo, hi] = yearBounds ?? [-Infinity, Infinity];
    if (keepSpan) {
      const s = nt - nf;
      if (nf < lo) (nf = lo), (nt = lo + s);
      if (nt > hi) (nt = hi), (nf = hi - s);
    }
    nf = Math.max(lo, nf);
    nt = Math.min(hi, nt);
    if (nf > nt) return;
    onrange(nf, nt);
  }
  /** Pointer x as a fraction of the plot width, clamped to [0, 1]. */
  const fracOf = (el: Element, clientX: number) => {
    const rect = el.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - rect.left - margin.left) / innerW));
  };

  // Svelte registers wheel handlers as passive, so attach one by hand to be able to
  // preventDefault and keep the page from scrolling.
  let svgEl = $state<SVGSVGElement | null>(null);
  $effect(() => {
    const el = svgEl;
    if (!el || !onrange) return;
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return;
      e.preventDefault();
      const r = curRange();
      if (!r) return;
      // The pointer's position decides which end moves: far right shrinks from the start,
      // far left from the end, the middle both equally.
      const f = fracOf(el, e.clientX);
      const d = Math.max(1, Math.round(r.span * 0.15));
      const dFrom = Math.round(d * f);
      const dTo = d - dFrom;
      const dir = e.deltaY < 0 ? 1 : -1; // wheel up = zoom in
      emitRange(r.from + dir * dFrom, r.to - dir * dTo, false);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  });

  // Drag (mouse or one finger) pans; two fingers pinch-zoom around their midpoint and pan
  // with it. The svg has touch-action: pan-y so vertical swipes still scroll the page.
  type Gesture = { from: number; to: number; span: number; f0: number; d0: number };
  const pointers = new Map<number, number>(); // pointerId -> clientX
  let gesture: Gesture | null = null;
  let dragging = $state(false);
  const pinchState = (el: Element) => {
    const xs = [...pointers.values()];
    const c = xs.reduce((a, b) => a + b, 0) / xs.length;
    const d = xs.length > 1 ? Math.abs(xs[0] - xs[1]) : 0;
    return { f: fracOf(el, c), d };
  };
  function startGesture(el: Element) {
    const r = curRange();
    if (!r) return;
    const { f, d } = pinchState(el);
    gesture = { ...r, f0: f, d0: d };
  }
  function onPointerDown(e: PointerEvent) {
    if (!onrange || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const el = e.currentTarget as SVGSVGElement;
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* synthetic events have no capturable pointer */
    }
    pointers.set(e.pointerId, e.clientX);
    if (pointers.size <= 2) startGesture(el);
    dragging = true;
    if (e.pointerType === 'mouse') e.preventDefault(); // no text selection while dragging
  }
  function onPointerMove(e: PointerEvent) {
    if (!pointers.has(e.pointerId) || !gesture) return;
    pointers.set(e.pointerId, e.clientX);
    const el = e.currentTarget as SVGSVGElement;
    const g = gesture;
    const { f, d } = pinchState(el);
    if (pointers.size >= 2 && g.d0 > 0) {
      // Pinch: keep the year that was under the fingers' midpoint under it, at the new span.
      const span = Math.max(1, Math.round((g.span * g.d0) / Math.max(1, d)));
      const yearAtCenter = g.from + g.f0 * g.span;
      const nf = yearAtCenter - f * span;
      emitRange(nf, nf + span - 1, true);
    } else {
      // Pan: the content follows the pointer, so dragging right moves the window earlier.
      const shift = -(f - g.f0) * g.span;
      emitRange(g.from + shift, g.to + shift, true);
    }
  }
  function onPointerUp(e: PointerEvent) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    const el = e.currentTarget as SVGSVGElement;
    if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    // A finger lifting mid-pinch restarts the gesture from the remaining pointer(s).
    if (pointers.size > 0) startGesture(el);
    else {
      gesture = null;
      dragging = false;
    }
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
    <svg
      bind:this={svgEl}
      {width}
      {height}
      class:pannable={!!onrange}
      class:dragging
      onmousemove={onMove}
      onmouseleave={() => (hoverI = null)}
      onpointerdown={onPointerDown}
      onpointermove={onPointerMove}
      onpointerup={onPointerUp}
      onpointercancel={onPointerUp}
      role="img"
      aria-label="Chart"
    >
      <g transform="translate({margin.left},{margin.top})">
        <!-- grid + axes -->
        {#each yTicks as t}
          <line class="grid" x1="0" x2={innerW} y1={yScale(t)} y2={yScale(t)} />
          <text class="ytick" x="-8" y={yScale(t)} dy="0.32em" text-anchor="end">{fmtY(t)}</text>
        {/each}
        {#each xTicks as t}
          <text class="xtick" x={xScale(t)} y={xAxis === 'top' ? -10 : innerH + 20} text-anchor="middle">{fmtYear(t)}</text>
        {/each}
        <line class="axis" x1="0" x2={innerW} y1={innerH} y2={innerH} />
        {#if xAxis === 'top'}
          <line class="axis" x1="0" x2={innerW} y1="0" y2="0" />
        {/if}

        <!-- layers -->
        {#each layers as l, li (l.s.key)}
          {@const dim = hoverKey !== null && hoverKey !== l.s.key}
          {@const gl = grid.layers[li]}
          {#if mode === 'line'}
            <path class="line" d={linePath(l, gl)} stroke={l.s.color} opacity={dim ? 0.2 : 1} />
          {:else}
            <path class="area" d={areaPath(l, gl)} fill={l.s.color} opacity={dim ? 0.25 : 0.9} />
            {#if step}
              <path class="edge" d={edgePath(l)} stroke={l.s.color} opacity={dim ? 0.25 : 1} />
            {/if}
          {/if}
        {/each}

        {#if showBand}
          <path class="band" d={bandPath} />
        {/if}

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
        {#if showBand && frame.band}
          <div class="tt-row band-row">
            <span class="swatch band-swatch"></span>
            <span class="tt-label">Low – high</span>
            <span class="tt-val">{fmtValue(frame.band.min[hoverI])} – {fmtValue(frame.band.max[hoverI])}</span>
            {#if live.length > 1 && mode !== 'line'}<span class="tt-share"></span>{/if}
          </div>
        {/if}
        {#if unit}<div class="tt-unit">{unit}</div>{/if}
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
  svg.pannable {
    cursor: grab;
    touch-action: pan-y; /* vertical swipes scroll the page; horizontal ones and pinches pan/zoom the range */
    user-select: none;
    -webkit-user-select: none;
  }
  svg.dragging {
    cursor: grabbing;
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
  .band {
    fill: var(--ink);
    opacity: 0.13;
    pointer-events: none;
  }
  .band-swatch {
    background: var(--ink);
    opacity: 0.3;
  }
  .band-row {
    color: var(--ink-2);
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
    padding: 0 0 8px 48px;
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

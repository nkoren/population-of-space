<script lang="ts">
  // Donut chart of one total per category. Slices tween between states and
  // categories that disappear shrink to nothing before being dropped.
  import { arc, pie } from 'd3-shape';
  import { Tween } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import type { SeriesTotal } from '$lib/data/engine';
  import { fmtValue, fmtCompact } from '$lib/format';

  interface Props {
    totals: SeriesTotal[];
    unit?: string;
    height?: number;
    /** Image shown in the hole instead of the total (the total still appears while hovering a slice). */
    centerImage?: string;
    centerAlt?: string;
    legend?: boolean;
    /** Hole radius as a fraction of the outer radius; larger is a thinner ring. */
    hole?: number;
    /** Let the ring use the full container width (by default it leaves room for the legend beside it). */
    wide?: boolean;
  }
  let { totals, unit = '', height = 420, centerImage, centerAlt = '', legend = true, hole = 0.62, wide = false }: Props = $props();

  type Frame = SeriesTotal[];
  function interpolateFrame(a: Frame, b: Frame) {
    const aByKey = new Map(a.map((s) => [s.key, s.value]));
    const bKeys = new Set(b.map((s) => s.key));
    const merged = [
      ...b.map((s) => ({ meta: s, from: aByKey.get(s.key) ?? 0, to: s.value })),
      ...a.filter((s) => !bKeys.has(s.key)).map((s) => ({ meta: s, from: s.value, to: 0 })),
    ];
    return (t: number): Frame => merged.map((m) => ({ ...m.meta, value: m.from + (m.to - m.from) * t }));
  }
  const tween = new Tween<Frame>(totals, { duration: 700, easing: cubicOut, interpolate: interpolateFrame });
  $effect(() => {
    tween.target = totals;
  });

  let width = $state(800);
  const frame = $derived(tween.current.filter((s) => s.value > 1e-9));
  const sum = $derived(frame.reduce((a, s) => a + s.value, 0));
  const size = $derived(Math.min(height, wide ? width : width * 0.6, 460));
  const r = $derived(size / 2 - 8);
  const inner = $derived(r * hole);

  // Keep the drawing order stable (largest first is what the engine already gives us).
  const arcs = $derived(
    pie<SeriesTotal>()
      .value((d) => d.value)
      .sort(null)
      .padAngle(0.008)(frame),
  );
  const arcGen = $derived(arc<any>().innerRadius(inner).outerRadius(r).cornerRadius(3));
  const arcGenHover = $derived(arc<any>().innerRadius(inner).outerRadius(r + 6).cornerRadius(3));

  let hoverKey = $state<string | null>(null);
  const hovered = $derived(hoverKey ? frame.find((s) => s.key === hoverKey) : null);
  const finalTotals = $derived(totals.filter((s) => s.value > 1e-9));
</script>

<div class="ring" bind:clientWidth={width} style:min-height="{height}px">
  {#if finalTotals.length === 0}
    <div class="empty" style:height="{height}px">No data for this selection.</div>
  {:else}
    <svg width={size} height={size} viewBox="{-size / 2} {-size / 2} {size} {size}" role="img" aria-label="Ring chart">
      {#each arcs as a (a.data.key)}
        <path
          d={hoverKey === a.data.key ? arcGenHover(a) : arcGen(a)}
          fill={a.data.color}
          opacity={hoverKey !== null && hoverKey !== a.data.key ? 0.35 : 1}
          onmouseenter={() => (hoverKey = a.data.key)}
          onmouseleave={() => (hoverKey = null)}
          role="presentation"
        />
      {/each}
      <g class="center" pointer-events="none">
        {#if hovered}
          <text class="c-label" y="-14">{hovered.label}</text>
          <text class="c-value" y="14">{fmtCompact(hovered.value)}</text>
          <text class="c-sub" y="34">{sum > 0 ? Math.round((hovered.value / sum) * 100) : 0}% of {fmtCompact(sum)} {unit}</text>
        {:else if centerImage}
          <!-- Fitted, not cropped: the image keeps its own aspect ratio inside a box that stays clear of the band. -->
          <image href={centerImage} x={-inner * 0.6} y={-inner * 0.36} width={inner * 1.2} height={inner * 0.72} preserveAspectRatio="xMidYMid meet" aria-label={centerAlt} />
        {:else}
          <text class="c-value" y="4">{fmtCompact(sum)}</text>
          <text class="c-sub" y="26">{unit}</text>
        {/if}
      </g>
    </svg>

    <ul class="legend" hidden={!legend}>
      {#each finalTotals as s (s.key)}
        <li
          class:dim={hoverKey !== null && hoverKey !== s.key}
          onmouseenter={() => (hoverKey = s.key)}
          onmouseleave={() => (hoverKey = null)}
        >
          <span class="swatch" style:background={s.color}></span>
          <span class="name">{s.label}</span>
          <span class="val">{fmtValue(s.value)}</span>
          <span class="pct">{totals.reduce((a, t) => a + t.value, 0) > 0 ? ((s.value / totals.reduce((a, t) => a + t.value, 0)) * 100).toFixed(1) : '0'}%</span>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .ring {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 32px;
    flex-wrap: wrap;
    width: 100%;
  }
  svg {
    display: block;
    overflow: visible;
    font-family: var(--font-body);
  }
  path {
    transition: opacity 0.2s;
    cursor: default;
  }
  .center text {
    text-anchor: middle;
    fill: var(--ink);
  }
  .c-value {
    font-family: var(--font-display);
    font-size: 30px;
    font-weight: 700;
  }
  .c-label {
    font-size: 13px;
    font-weight: 600;
  }
  .c-sub {
    font-size: 12px;
    fill: var(--ink-3);
  }
  .legend {
    list-style: none;
    margin: 0;
    padding: 0;
    min-width: 240px;
    max-width: 340px;
    font-size: 13px;
  }
  .legend li {
    display: grid;
    grid-template-columns: 10px 1fr auto 44px;
    gap: 10px;
    align-items: center;
    padding: 4px 6px;
    border-radius: 6px;
    transition: opacity 0.2s, background 0.15s;
  }
  .legend li:hover {
    background: var(--bg-muted);
  }
  .legend li.dim {
    opacity: 0.4;
  }
  .swatch {
    width: 10px;
    height: 10px;
    border-radius: 3px;
  }
  .val,
  .pct {
    font-variant-numeric: tabular-nums;
    text-align: right;
  }
  .val {
    font-weight: 500;
  }
  .pct {
    color: var(--ink-3);
  }
  .empty {
    display: grid;
    place-items: center;
    color: var(--ink-3);
    width: 100%;
  }
</style>

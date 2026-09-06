<script lang="ts">
  // A small donut with the count in the middle and no visible key: the legend appears
  // as a popover while the ring is hovered or focused. Used in the home-page dashboard.
  import { arc, pie } from 'd3-shape';
  import type { SeriesTotal } from '$lib/data/engine';

  interface Props {
    title: string;
    totals: SeriesTotal[];
    size?: number;
    href?: string;
  }
  let { title, totals, size = 96, href }: Props = $props();

  const items = $derived(totals.filter((s) => s.value > 0));
  const r = $derived(size / 2);
  const inner = $derived(r * 0.64);
  const arcs = $derived(
    pie<SeriesTotal>()
      .value((d) => d.value)
      .sort(null)
      .padAngle(0.02)(items),
  );
  const arcGen = $derived(arc<any>().innerRadius(inner).outerRadius(r).cornerRadius(2));
  const arcGenHover = $derived(arc<any>().innerRadius(inner).outerRadius(r + 4).cornerRadius(2));

  let open = $state(false);
  let hoverKey = $state<string | null>(null);
  const hovered = $derived(hoverKey ? items.find((s) => s.key === hoverKey) : null);
</script>

<a
  class="mini"
  class:open
  {href}
  onmouseenter={() => (open = true)}
  onmouseleave={() => ((open = false), (hoverKey = null))}
  onfocus={() => (open = true)}
  onblur={() => (open = false)}
>
  <div class="label">{title}</div>
  <svg width={size + 8} height={size + 8} viewBox="{-r - 4} {-r - 4} {size + 8} {size + 8}" role="img" aria-label="{title} of the people in space now">
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
    {#if hovered}<text class="c-value" y="8" pointer-events="none">{hovered.value}</text>{/if}
  </svg>
  <div class="sub">{hovered ? hovered.label : ''}</div>

  {#if open && items.length}
    <ul class="key">
      {#each items as s (s.key)}
        <li class:dim={hoverKey !== null && hoverKey !== s.key} onmouseenter={() => (hoverKey = s.key)} onmouseleave={() => (hoverKey = null)}>
          <span class="swatch" style:background={s.color}></span>
          <span class="name">{s.label}</span>
          <span class="val">{s.value}</span>
        </li>
      {/each}
    </ul>
  {/if}
</a>

<style>
  .mini {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 10px 8px 8px;
    border-radius: 12px;
    color: var(--ink);
    transition: background 0.15s;
  }
  .mini:hover,
  .mini.open {
    background: var(--bg-muted);
    color: var(--ink);
  }
  svg {
    display: block;
    overflow: visible;
    font-family: var(--font-body);
  }
  path {
    transition: opacity 0.2s;
  }
  .c-value {
    text-anchor: middle;
    fill: var(--ink);
    font-family: var(--font-display);
    font-size: 26px;
  }
  .sub {
    font-size: 0.74rem;
    color: var(--ink-3);
    min-height: 1.2em;
    white-space: nowrap;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .key {
    position: absolute;
    top: calc(100% - 4px);
    left: 50%;
    transform: translateX(-50%);
    z-index: 5;
    list-style: none;
    margin: 0;
    padding: 6px 8px;
    min-width: 170px;
    max-height: 260px;
    overflow-y: auto;
    background: var(--bg-elev);
    border: 1px solid var(--line);
    border-radius: 10px;
    box-shadow: var(--shadow);
    font-size: 12.5px;
  }
  .key li {
    display: grid;
    grid-template-columns: 10px 1fr auto;
    gap: 8px;
    align-items: center;
    padding: 3px 6px;
    border-radius: 6px;
    transition: opacity 0.2s;
  }
  .key li.dim {
    opacity: 0.4;
  }
  .swatch {
    width: 10px;
    height: 10px;
    border-radius: 3px;
  }
  .val {
    font-variant-numeric: tabular-nums;
    font-weight: 500;
  }
</style>

<script lang="ts">
  // A thin step-line of the exact headcount over time: an instrument trace, not a chart.
  // Stretches to its container; no axes, no labels.
  import type { Aggregate } from '$lib/data/engine';

  let { agg, height = 70, color = 'var(--gold)' }: { agg: Aggregate; height?: number; color?: string } = $props();

  const W = 1000;
  const path = $derived.by(() => {
    if (!agg.x.length) return '';
    const t0 = agg.x[0];
    const t1 = agg.x[agg.x.length - 1];
    const max = Math.max(1, ...agg.total);
    const x = (t: number) => (((t - t0) / Math.max(1, t1 - t0)) * W).toFixed(1);
    const y = (v: number) => (height - 2 - (v / max) * (height - 4)).toFixed(1);
    let d = `M0,${y(0)}`;
    let prev = 0;
    for (let i = 0; i < agg.x.length; i++) {
      const v = agg.total[i];
      d += `L${x(agg.x[i])},${y(prev)}L${x(agg.x[i])},${y(v)}`;
      prev = v;
    }
    return d + `L${W},${y(prev)}`;
  });
</script>

<svg viewBox="0 0 {W} {height}" preserveAspectRatio="none" width="100%" {height} aria-hidden="true">
  <path d={path} fill="none" stroke={color} stroke-width="1.2" stroke-opacity="0.9" vector-effect="non-scaling-stroke" />
</svg>

<style>
  svg {
    display: block;
  }
</style>

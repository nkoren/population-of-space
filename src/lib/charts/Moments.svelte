<script lang="ts">
  /**
   * Annotations hung below a TimeChart: one row per moment, each with a dashed line from the
   * chart's zero axis down to the bottom of its label at the moment's x position. Later rows'
   * lines pass behind earlier labels, which get a solid background and a drop shadow so the
   * text stays distinct. Rows are in the order given (chronological by convention).
   */
  export interface Moment {
    key: string;
    /** px from the chart's left edge, as reported by TimeChart's `layout.markerX` */
    x: number;
    title: string;
    sub?: string;
    /** portrait, shown when `portraits` is on */
    image?: string;
    alt?: string;
    /** attribution, shown on hover over the portrait */
    credit?: string;
    /** CSS object-position for the portrait crop */
    focus?: string;
  }
  let {
    moments,
    width,
    portraits = true,
    rowHeight = portraits ? 112 : 42,
    minScale = 0.4,
  }: { moments: Moment[]; width: number; portraits?: boolean; rowHeight?: number; minScale?: number } = $props();
  let heights = $state<number[]>([]);
  // Sized for four rows. Beyond that everything shrinks in inverse proportion, so each doubling
  // of the count halves the row pitch, the type size and the lead lines' opacity, down to `minScale`.
  const scale = $derived(Math.max(minScale, Math.min(1, 4 / Math.max(1, moments.length))));
  const pitch = $derived(rowHeight * scale);
</script>

<div class="moments" class:portraits style:height="{moments.length * pitch + 8}px" style:--scale={scale}>
  {#each moments as mo, i (mo.key)}
    <div class="line" style:left="{mo.x}px" style:height="{i * pitch + 8 + (heights[i] ?? 0)}px"></div>
    <div class="label" class:flip={mo.x > width * 0.7} style:left="{mo.x}px" style:top="{i * pitch + 8}px" bind:clientHeight={heights[i]}>
      {#if portraits && mo.image}
        <img class="portrait" src={mo.image} alt={mo.credit ? `${mo.alt ?? mo.title}. ${mo.credit}` : (mo.alt ?? mo.title)} title={mo.credit} style:object-position={mo.focus} />
      {/if}
      <div class="text">
        <div class="title">{mo.title}</div>
        {#if mo.sub}<div class="sub">{mo.sub}</div>{/if}
      </div>
    </div>
  {/each}
</div>

<style>
  .moments {
    position: relative;
  }
  .line {
    position: absolute;
    top: 0;
    width: 0;
    border-left: 1.5px dashed var(--gold);
    opacity: var(--scale, 1);
    pointer-events: none;
  }
  .label {
    position: absolute;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: calc(3px * var(--scale, 1)) calc(10px * var(--scale, 1)) calc(4px * var(--scale, 1));
    margin-left: 6px;
    background: var(--moments-bg, var(--bg));
    border-radius: 6px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.85);
    font-size: 0.85rem;
    line-height: 1.3;
    white-space: nowrap;
  }
  .portraits .label {
    padding: 6px 14px 6px 8px;
  }
  .label.flip {
    margin-left: -6px;
    transform: translateX(-100%);
    flex-direction: row-reverse;
    text-align: right;
  }
  .portrait {
    flex: none;
    width: 88px;
    height: 88px;
    object-fit: cover;
    object-position: 50% 20%;
    border-radius: 50%;
    border: 2px solid var(--gold);
  }
  .title {
    color: var(--ink-2);
    font-weight: 300;
    font-size: calc(0.8rem * var(--scale, 1));
  }
  .portraits .title {
    font-family: var(--font-display, inherit);
    color: var(--ink);
    font-weight: 400;
    font-size: 1.25rem;
    line-height: 1.2;
    margin-bottom: 0.2em;
  }
  .sub {
    font-size: calc(0.72rem * var(--scale, 1));
    font-weight: 300;
    color: var(--ink-3);
  }
  .portraits .sub {
    font-size: 0.78rem;
  }
  @media (max-width: 700px) {
    .label {
      white-space: normal;
      max-width: 240px;
    }
  }
</style>

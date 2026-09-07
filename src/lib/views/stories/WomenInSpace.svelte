<script lang="ts">
  // Story: women in space. Narrative sections with embedded explorer charts on fixed presets.
  import type { Dataset } from '$lib/data/types';
  import { aggregate } from '$lib/data/engine';
  import { dimensionById } from '$lib/data/dimensions';
  import { img } from '$lib/eras';
  import { fmtInt, fmtPct } from '$lib/format';
  import TimeChart from '$lib/charts/TimeChart.svelte';

  let { ds }: { ds: Dataset } = $props();

  // ---- headline numbers, straight from the dataset
  const women = ds.people.filter((p) => p.sex === 'F').length;
  const everyone = ds.people.length;
  const womenShare = women / everyone;

  // ---- population by sex through the first space race, event by event
  const firstRace = aggregate(ds, {
    metric: 'population',
    dimension: dimensionById('sex'),
    resolution: 'exact',
    from: Date.UTC(1960, 0, 1),
    to: Date.UTC(1981, 0, 1),
  });

  const vostok6Launch = Date.parse(ds.flightById.get('vostok-6')!.launch);
  const CHART_H = 240;
  /** gap between the bottom of the chart and the top of the bio card */
  const GAP = 44;
  let layout = $state({ markerX: [] as number[], axisY: 0 });
  // The card's dashed line starts at the chart's zero axis and runs down the card's left edge.
  const lineTop = $derived(GAP + (CHART_H - layout.axisY));
</script>

<article class="container page">
  <header class="intro">
    <p class="kicker">Story</p>
    <h1>Women in space</h1>
    <div class="prose">
      <p>
        For most of the history of human spaceflight, the population of space has been almost entirely male. Of the
        <strong>{fmtInt(everyone)} people</strong> who have crossed the Kármán line, <strong>{fmtInt(women)}</strong> have
        been women: about <strong>{fmtPct(womenShare)}</strong>. That is not a story of ability. The first women to fly were
        excluded from the astronaut corps by rules written around military test pilots, and for two decades after the first
        woman reached orbit no other woman followed her.
      </p>
      <p>
        The picture is changing. Women now fly on most crew rotations, command stations and lead spacewalks. But the gap
        built up over sixty years is large, and the charts below show how far there still is to go.
      </p>
    </div>
  </header>

  <section class="chapter">
    <h2>Women in the First Space Race</h2>
    <p class="muted lede">People in space, 1960–1980, after every launch and landing. Women are the thin slice.</p>

    <div class="figure">
      <TimeChart
        agg={firstRace}
        mode="stacked"
        unit="people"
        height={CHART_H}
        legend={false}
        xAxis="top"
        markers={[vostok6Launch]}
        bind:layout
      />
      <div class="bio" style:margin-left="{Math.max(0, layout.markerX[0] ?? 0)}px" style:margin-top="{GAP}px" style:--line-top="{lineTop}px">
        <img class="portrait" src={img('tereshkova-suit-1963.jpg')} alt="Valentina Tereshkova in her spacesuit beside the Vostok 6 capsule" />
        <div class="bio-text">
          <h3>Valentina Tereshkova: First Woman in Space</h3>
          <p class="small faint">Vostok 6 · 16–19 June 1963 · NASA / StarChild (colourised), public domain</p>
        </div>
      </div>
    </div>

    <div class="prose">
      <p>
        Valentina Tereshkova was a textile-factory worker and amateur parachutist when she was selected, in 1962, for a small
        group of women cosmonauts. On 16 June 1963 she launched alone aboard Vostok 6, twenty-six years old, and spent nearly
        three days in orbit, 48 revolutions of the Earth, more time in space than every American astronaut before her put
        together. She flew in tandem with Valery Bykovsky in Vostok 5, the two capsules passing within a few kilometres of
        one another, and landed by parachute in the Altai region on 19 June. It remains the only solo spaceflight ever made by
        a woman.
      </p>
      <p>
        Then nothing. The Soviet women's group was dissolved without another flight, and NASA, which had quietly tested a
        cohort of women pilots in the early 1960s, required its astronauts to be military jet test pilots, a career closed
        to women. Through Gemini, Apollo, Skylab and the first Salyut stations, the population of space stayed entirely
        male. No woman flew again until Svetlana Savitskaya reached Salyut 7 in August 1982, nineteen years after
        Tereshkova, followed by Sally Ride on the Space Shuttle the next summer.
      </p>
    </div>
  </section>
</article>

<style>
  .page {
    padding-top: 40px;
    padding-bottom: 80px;
  }
  .intro {
    margin-bottom: 56px;
  }
  /* Text sits in one centred column; charts span the full container. */
  .intro,
  .prose,
  .chapter h2 {
    max-width: 720px;
    margin-left: auto;
    margin-right: auto;
  }
  .prose p {
    font-size: 1.05rem;
    line-height: 1.65;
  }
  .chapter {
    margin-top: 40px;
  }
  .chapter h2 {
    font-size: 1.8rem;
  }
  .lede {
    max-width: 720px;
    margin: 0 auto 20px;
  }
  .figure {
    margin: 0 0 32px;
  }
  .bio {
    position: relative;
    display: flex;
    align-items: center;
    gap: 16px;
    max-width: 560px;
    padding-left: 14px;
  }
  /* One dashed line from the chart's zero axis down the card's left edge. */
  .bio::before {
    content: '';
    position: absolute;
    left: 0;
    top: calc(-1 * var(--line-top, 0px));
    bottom: 0;
    border-left: 1.5px dashed var(--gold);
    pointer-events: none;
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
  .bio-text h3 {
    font-size: 1.35rem;
    margin: 0 0 0.2em;
  }
  .bio-text p {
    margin: 0;
  }
  .small {
    font-size: 0.8rem;
  }
  @media (max-width: 700px) {
    .bio {
      margin-left: 0 !important;
    }
  }
</style>

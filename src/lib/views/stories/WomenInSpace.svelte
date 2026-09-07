<script module lang="ts">
  import { img } from '$lib/eras';

  /**
   * Moments the story annotates, in launch order. The explorer shows the same list (titles only)
   * when the population is broken down by sex. Portrait credits appear on hover.
   */
  export const WOMEN_IN_SPACE_MOMENTS: { flight: string; title: string; sub: string; image: string; alt: string; credit: string; focus?: string }[] = [
    {
      flight: 'vostok-6',
      title: 'Valentina Tereshkova: First Woman in Space',
      sub: 'Vostok 6 · 16–19 June 1963',
      image: img('tereshkova-suit-1963.jpg'),
      alt: 'Valentina Tereshkova in her spacesuit beside the Vostok 6 capsule',
      credit: 'NASA / StarChild (colourised), public domain',
    },
    {
      flight: 'sts-7',
      title: 'Sally Ride: First American Woman in Space',
      sub: 'STS-7 · 18–24 June 1983',
      image: img('ride-1984.jpg'),
      alt: 'Sally Ride, NASA portrait, 1984',
      credit: 'NASA, 1984, public domain',
    },
    {
      flight: 'soyuz-t-12',
      title: 'Svetlana Savitskaya: First Woman to Walk in Space',
      sub: 'Salyut 7 · 25 July 1984',
      image: img('savitskaya-stamp-1983.jpg'),
      alt: 'Svetlana Savitskaya on a 1983 Soviet postage stamp',
      credit: 'USSR Post, 1983 stamp, public domain',
      focus: '50% 40%',
    },
    {
      flight: 'sts-41-g',
      title: 'Kathryn Sullivan: First American Woman to Walk in Space',
      sub: 'STS-41-G · 11 October 1984',
      image: img('sullivan-nasa.jpg'),
      alt: 'Kathryn Sullivan, NASA portrait',
      credit: 'NASA, public domain',
    },
    {
      flight: 'soyuz-tm-20',
      title: 'Yelena Kondakova: First Long-Duration Female Spaceflight',
      sub: 'Mir · 169 days, October 1994 – March 1995',
      image: img('kondakova-nasa.jpg'),
      alt: 'Yelena Kondakova, NASA portrait',
      credit: 'NASA, public domain',
    },
    {
      flight: 'sts-76',
      title: 'Shannon Lucid: 188 Days on Mir, a Record for Women',
      sub: 'Mir · March–September 1996',
      image: img('lucid-mir-1996.jpg'),
      alt: 'Shannon Lucid aboard Mir, 1996',
      credit: 'NASA, 1996, public domain',
      focus: '47% 45%',
    },
    {
      flight: 'sts-93',
      title: 'Eileen Collins: First Woman to Command a Space Mission',
      sub: 'STS-93 · 23–28 July 1999',
      image: img('collins-sts93-1999.jpg'),
      alt: 'Eileen Collins in her flight suit before STS-93',
      credit: 'NASA / Robert Markowitz, 1999, public domain',
    },
  ];
</script>

<script lang="ts">
  // Story: women in space. Narrative sections with embedded explorer charts on fixed presets.
  import type { Dataset } from '$lib/data/types';
  import { aggregate, seriesTotals } from '$lib/data/engine';
  import { dimensionById } from '$lib/data/dimensions';
  import { fmtInt, fmtPct, fmtCompact } from '$lib/format';
  import TimeChart from '$lib/charts/TimeChart.svelte';
  import RingChart from '$lib/charts/RingChart.svelte';
  import Moments from '$lib/charts/Moments.svelte';
  import { router } from '$lib/router.svelte';

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

  // ---- population by sex through the Shuttle/Mir era, month by month
  const shuttleMir = aggregate(ds, {
    metric: 'population',
    dimension: dimensionById('sex'),
    resolution: 'month',
    from: Date.UTC(1980, 0, 1),
    to: Date.UTC(2001, 0, 1),
  });

  // ---- person-days by sex, 1980-2000, for each of the two launching countries
  const nationRing = (code: string) => {
    const t = seriesTotals(
      aggregate(ds, {
        metric: 'population',
        dimension: dimensionById('sex'),
        resolution: 'month',
        from: Date.UTC(1980, 0, 1),
        to: Date.UTC(2001, 0, 1),
        filter: (s) => s.up.launch_nation === code,
      }),
    );
    const total = t.totals.reduce((a, x) => a + x.value, 0);
    const women = t.totals.find((x) => x.key === 'F')?.value ?? 0;
    return { ...t, total, women, share: total > 0 ? women / total : 0 };
  };
  const rings = [
    { code: 'RU', name: 'USSR / Russia', flag: img('flags/su.svg'), flagAlt: 'Flag of the Soviet Union', ...nationRing('RU') },
    { code: 'US', name: 'USA', flag: img('flags/us.svg'), flagAlt: 'Flag of the United States', ...nationRing('US') },
  ];
  const exploreRing = (code: string) => router.href('explore', { m: 'population', by: 'sex', c: 'ring', from: '1980', to: '2000', fd: 'launchNation', fv: code });

  /** The same view in the explorer; each chart links to its own. */
  const explore = (from: number, to: number, r: 'exact' | 'month') => router.href('explore', { m: 'population', by: 'sex', r, c: 'stacked', from: String(from), to: String(to) });

  const launchOf = (flight: string) => Date.parse(ds.flightById.get(flight)!.launch);
  const withTime = (mos: typeof WOMEN_IN_SPACE_MOMENTS) => mos.map((mo) => ({ ...mo, t: launchOf(mo.flight) }));
  const raceMoments = withTime(WOMEN_IN_SPACE_MOMENTS.slice(0, 1));
  const eraMoments = withTime(WOMEN_IN_SPACE_MOMENTS.slice(1));
  // Each chart reports its markers' x positions; the annotations below it line up with them.
  let layout1 = $state({ markerX: [] as number[], axisY: 0 });
  let layout2 = $state({ markerX: [] as number[], axisY: 0 });
  let width1 = $state(0);
  let width2 = $state(0);
  const place = (mos: ReturnType<typeof withTime>, layout: { markerX: number[] }) => mos.map((mo, i) => ({ key: mo.flight, x: layout.markerX[i] ?? 0, ...mo }));
  const CHART_H = 240;
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
    <h2>Women in the First Space Race (1960–1980)</h2>

    <div class="figure">
      <a class="chart-link" href={explore(1960, 1980, 'exact')} title="Open this chart in the explorer" bind:clientWidth={width1}>
        <TimeChart
          agg={firstRace}
          mode="stacked"
          unit="people"
          height={CHART_H}
          legend={false}
          xAxis="top"
          markers={raceMoments.map((mo) => mo.t)}
          bind:layout={layout1}
        />
      </a>
      <Moments width={width1} moments={place(raceMoments, layout1)} />
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

  <section class="chapter">
    <h2>Women in the Shuttle/Mir Era (1980–2000)</h2>

    <div class="figure">
      <a class="chart-link" href={explore(1980, 2000, 'month')} title="Open this chart in the explorer" bind:clientWidth={width2}>
        <TimeChart
          agg={shuttleMir}
          mode="stacked"
          unit="people"
          height={CHART_H}
          legend={false}
          xAxis="top"
          markers={eraMoments.map((mo) => mo.t)}
          bind:layout={layout2}
        />
      </a>
      <Moments width={width2} moments={place(eraMoments, layout2)} portraits={false} />
    </div>

    <div class="prose">
      <p>
        The Space Shuttle changed who could fly. Its crews needed scientists and engineers, not just pilots, and NASA's 1978
        astronaut class included six women. Svetlana Savitskaya broke the nineteen-year drought first, reaching Salyut 7 in
        August 1982; Sally Ride followed on STS-7 in June 1983 as the first American woman in space. In July 1984 Savitskaya
        became the first woman to walk in space, and Kathryn Sullivan did the same for the United States that October, on
        STS-41-G, the first mission to carry two women. Judith Resnik, another of the 1978 six, died with Christa McAuliffe
        in the Challenger accident of January 1986.
      </p>
      <p>
        The 1990s brought firsts from other countries: Helen Sharman was the first Briton in space and the first woman aboard
        Mir in 1991, Roberta Bondar the first Canadian woman in 1992, Mae Jemison the first Black woman later that year,
        Chiaki Mukai the first Japanese woman in 1994 and Claudie Haigneré the first French woman in 1996. On Mir, women
        began to stay. Yelena Kondakova spent 169 days aboard in 1994–95, the first long-duration spaceflight by a woman, and
        Shannon Lucid stayed 188 days in 1996, a record for women that stood for eleven years. Eileen Collins piloted the
        Shuttle in 1995 and commanded it in 1999, the first woman to lead a space mission. Even so, women remained a thin
        slice of the population of space: by 2000 they were still well under a tenth of everyone who had flown.
      </p>
    </div>
  </section>

  <section class="chapter">
    <h2>Population of space by launching country, 1980–2000</h2>
    <div class="rings">
      {#each rings as r (r.code)}
        <a class="chart-link ring-link" href={exploreRing(r.code)} title="Open this chart in the explorer">
          <RingChart totals={r.totals} unit={r.unit} height={340} legend={false} hole={0.8} wide centerImage={r.flag} centerAlt={r.flagAlt} />
        </a>
      {/each}
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
  .figure {
    margin: 0 0 32px;
  }
  .chart-link {
    display: block;
    color: inherit;
    text-decoration: none;
    border-radius: 8px;
    transition: background 0.15s;
  }
  .chart-link:hover {
    background: var(--bg-muted);
  }
  .rings {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    max-width: 720px;
    margin: 0 auto;
  }
  .ring-link {
    padding: 12px 8px 12px;
  }
  @media (max-width: 600px) {
    .rings {
      grid-template-columns: 1fr;
    }
  }
</style>

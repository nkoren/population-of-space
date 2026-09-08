<script module lang="ts">
  import { img } from '$lib/eras';

  /**
   * Moments the story annotates, in launch order. The explorer shows the same list (titles only)
   * when the population is broken down by sex. Portrait credits appear on hover.
   */
  export const WOMEN_IN_SPACE_MOMENTS: { flight: string; title: string; sub: string; image?: string; alt?: string; credit?: string; focus?: string }[] = [
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
    { flight: 'sts-102', title: 'Susan Helms: First Woman to Live Aboard the ISS', sub: 'Expedition 2 · March–August 2001' },
    { flight: 'soyuz-tma-11', title: 'Peggy Whitson: First Woman to Command the ISS', sub: 'Expedition 16 · October 2007' },
    { flight: 'sts-131', title: 'Four Women in Orbit at Once', sub: 'STS-131 and Expedition 23 · April 2010' },
    { flight: 'shenzhou-9', title: 'Liu Yang: First Chinese Woman in Space', sub: 'Shenzhou 9 · June 2012' },
    { flight: 'soyuz-ms-12', title: 'Christina Koch: 328 Days, and the First All-Female Spacewalk', sub: 'ISS · March 2019 – February 2020' },
    { flight: 'blue-origin-ns-16', title: 'Wally Funk: A Mercury 13 Pilot Finally Flies, at 82', sub: 'New Shepard · July 2021' },
    { flight: 'shenzhou-13', title: 'Wang Yaping: First Woman Aboard Tiangong, First Chinese Woman to Walk in Space', sub: 'Shenzhou 13 · October 2021' },
    { flight: 'axiom-mission-2', title: 'Rayyanah Barnawi: First Arab Woman in Space', sub: 'Axiom Mission 2 · May 2023' },
    { flight: 'polaris-dawn', title: 'Sarah Gillis and Anna Menon: First Commercial Spacewalk', sub: 'Polaris Dawn · September 2024' },
    { flight: 'blue-origin-ns-31', title: 'First All-Female Crew Since Vostok 6', sub: 'New Shepard · April 2025' },
    { flight: 'artemis-ii', title: 'Christina Koch: First Woman to Fly to the Moon', sub: 'Artemis II · April 2026' },
  ];
</script>

<script lang="ts">
  // Story: women in space. Narrative sections with embedded explorer charts on fixed presets.
  import type { Dataset } from '$lib/data/types';
  import { aggregate, seriesTotals, occupiedSince } from '$lib/data/engine';
  import { dimensionById } from '$lib/data/dimensions';
  import { fmtInt, fmtPct, fmtCompact, fmtDate } from '$lib/format';
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

  // ---- population by sex through the ISS era, year by year
  const issEra = aggregate(ds, {
    metric: 'population',
    dimension: dimensionById('sex'),
    resolution: 'year',
    from: Date.UTC(2000, 0, 1),
    to: Date.UTC(2021, 0, 1),
  });

  // ---- population by sex since 2020, year by year, up to the end of the data
  const maxYear = new Date(ds.dataEnd).getUTCFullYear();
  const dragonEra = aggregate(ds, {
    metric: 'population',
    dimension: dimensionById('sex'),
    resolution: 'month',
    from: Date.UTC(2020, 0, 1),
    to: ds.dataEnd,
  });

  // ---- all time, every nation: person-days by sex, most female first
  let nationsSuborbital = $state(false);
  const nations = $derived.by(() => {
    const acc = new Map<string, { F: number; M: number }>();
    for (const st of ds.stays) {
      if (!nationsSuborbital && st.up.destination === 'suborbital') continue;
      const k = st.person.nationality[0];
      const e = acc.get(k) ?? { F: 0, M: 0 };
      e[st.person.sex === 'F' ? 'F' : 'M'] += st.days;
      acc.set(k, e);
    }
    // Same colours the time charts use for the two series.
    const color = (k: string) => firstRace.series.find((x) => x.key === k)?.color ?? '';
    return [...acc.entries()]
      .map(([code, e]) => ({
        code,
        name: ds.nationByCode.get(code)?.name ?? code,
        total: e.F + e.M,
        share: e.F + e.M > 0 ? e.F / (e.F + e.M) : 0,
        totals: [
          { key: 'M', label: 'Men', color: color('M'), value: e.M },
          { key: 'F', label: 'Women', color: color('F'), value: e.F },
        ],
      }))
      .filter((n) => n.total > 0)
      .sort((a, b) => b.share - a.share || b.total - a.total);
  });

  // ---- conclusion: all women ever, by nationality; who is up there right now; and how long each
  // sex has been continuously represented in space (suborbital hops excluded from the streaks)
  const womenByNation = (() => {
    const t = seriesTotals(
      aggregate(ds, {
        metric: 'population',
        dimension: dimensionById('nationality'),
        resolution: 'year',
        from: Date.UTC(1960, 0, 1),
        to: ds.dataEnd,
        filter: (st) => st.person.sex === 'F',
      }),
    );
    // The explorer keeps nations in first-flight order; here, largest first with "Other" last.
    const isOther = (x: { label: string }) => x.label === 'Other';
    return { ...t, totals: [...t.totals].sort((a, b) => Number(isOther(a)) - Number(isOther(b)) || b.value - a.value) };
  })();
  const nowBySex = (() => {
    const up = ds.stays.filter((st) => st.ongoing);
    const sexColor = (k: string) => firstRace.series.find((x) => x.key === k)?.color ?? '';
    return {
      totals: (['M', 'F'] as const).map((k) => ({ key: k, label: k === 'M' ? 'Men' : 'Women', color: sexColor(k), value: up.filter((st) => st.person.sex === k).length })),
      names: (k: 'M' | 'F') => up.filter((st) => st.person.sex === k).map((st) => st.person.name),
    };
  })();
  const orbital = ds.stays.filter((st) => st.up.destination !== 'suborbital');
  const menSince = occupiedSince(orbital.filter((st) => st.person.sex === 'M'));
  const womenSince = occupiedSince(orbital.filter((st) => st.person.sex === 'F'));
  // Live clock for the counters, ticking once a second.
  let now = $state(Date.now());
  $effect(() => {
    const id = setInterval(() => (now = Date.now()), 1000);
    return () => clearInterval(id);
  });
  const elapsed = (since: number | null) => {
    if (since === null) return null;
    let ms = Math.max(0, now - since);
    const YEAR = 365.25 * 86400e3;
    const years = Math.floor(ms / YEAR);
    ms -= years * YEAR;
    const days = Math.floor(ms / 86400e3);
    ms -= days * 86400e3;
    const hours = Math.floor(ms / 3600e3);
    ms -= hours * 3600e3;
    const minutes = Math.floor(ms / 60e3);
    return { years, days, hours, minutes };
  };
  const plural = (n: number, w: string) => `${fmtInt(n)} ${w}${n === 1 ? '' : 's'}`;
  const fmtElapsed = (e: ReturnType<typeof elapsed>) => (e ? [plural(e.years, 'year'), plural(e.days, 'day'), plural(e.hours, 'hour'), plural(e.minutes, 'minute')].join(', ') : '');

  /** The same view in the explorer; each chart links to its own. */
  const explore = (from: number, to: number, r: 'exact' | 'month' | 'year') => router.href('explore', { m: 'population', by: 'sex', r, c: 'stacked', from: String(from), to: String(to) });

  const launchOf = (flight: string) => Date.parse(ds.flightById.get(flight)!.launch);
  const withTime = (mos: typeof WOMEN_IN_SPACE_MOMENTS) => mos.map((mo) => ({ ...mo, t: launchOf(mo.flight) }));
  const raceMoments = withTime(WOMEN_IN_SPACE_MOMENTS.slice(0, 1));
  const eraMoments = withTime(WOMEN_IN_SPACE_MOMENTS.slice(1, 7));
  const issMoments = withTime(WOMEN_IN_SPACE_MOMENTS.slice(7, 12));
  const dragonMoments = withTime(WOMEN_IN_SPACE_MOMENTS.slice(12));
  // Each chart reports its markers' x positions; the annotations below it line up with them.
  let layout1 = $state({ markerX: [] as number[], axisY: 0 });
  let layout2 = $state({ markerX: [] as number[], axisY: 0 });
  let layout3 = $state({ markerX: [] as number[], axisY: 0 });
  let layout4 = $state({ markerX: [] as number[], axisY: 0 });
  let width1 = $state(0);
  let width2 = $state(0);
  let width3 = $state(0);
  let width4 = $state(0);
  const place = (mos: ReturnType<typeof withTime>, layout: { markerX: number[] }) => mos.map((mo, i) => ({ key: mo.flight, x: layout.markerX[i] ?? 0, ...mo }));
  const CHART_H = 240;
  let pageWidth = $state(1000);
  const narrow = $derived(pageWidth < 600);
  const RING_H = $derived(narrow ? 260 : 340);
  const CONC_RING_H = $derived(narrow ? 240 : 300);
</script>

<svelte:window bind:innerWidth={pageWidth} />

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

  <section class="chapter sub">
    <h3>Population of space by launching country, 1980–2000</h3>
    <div class="rings">
      {#each rings as r (r.code)}
        <a class="chart-link ring-link" href={exploreRing(r.code)} title="Open this chart in the explorer">
          <RingChart totals={r.totals} unit={r.unit} height={RING_H} legend={false} hole={0.8} wide centerImage={r.flag} centerAlt={r.flagAlt} />
        </a>
      {/each}
    </div>
  </section>
  <section class="chapter">
    <h2>Women in the ISS Era (2000–2020)</h2>

    <div class="figure">
      <a class="chart-link" href={explore(2000, 2020, 'year')} title="Open this chart in the explorer" bind:clientWidth={width3}>
        <TimeChart
          agg={issEra}
          mode="stacked"
          unit="people"
          height={CHART_H}
          legend={false}
          xAxis="top"
          markers={issMoments.map((mo) => mo.t)}
          bind:layout={layout3}
        />
      </a>
      <Moments width={width3} moments={place(issMoments, layout3)} portraits={false} />
    </div>

    <div class="prose">
      <p>
        From November 2000 the International Space Station has never been empty, and the population of space settled into a
        steady rhythm of rotating crews. Women became part of that rhythm from the start. Susan Helms joined Expedition 2 in
        March 2001 as the first woman to live aboard the station, and on the way up she and Jim Voss made the longest
        spacewalk ever recorded, nearly nine hours. In October 2007 Peggy Whitson took command of Expedition 16, the first
        woman to lead the station; when Pamela Melroy arrived commanding the Shuttle that month, two women were in charge of
        two spacecraft docked together. In April 2010 the arrival of STS-131 brought four women into orbit at once, still a
        record. Liu Yang became the first Chinese woman in space in 2012, and Christina Koch's 328 days aboard in 2019–20
        set the record for a single flight by a woman, during which she and Jessica Meir made the first all-female
        spacewalk.
      </p>
      <p>
        The era had its losses too. Kalpana Chawla and Laurel Clark died with the rest of the Columbia crew in February
        2003, and it was Eileen Collins who commanded the Shuttle's return to flight two years later. But the wider trend
        was slow. With station crews fixed at six, and most seats filled by rotation, the share of women in orbit in any
        given year tracked the make-up of the astronaut corps rather than any single milestone: the pink band widens, but
        it never comes close to half.
      </p>
    </div>
  </section>

  <section class="chapter">
    <h2>Women in the Dragon / Tiangong Era (2020–{maxYear})</h2>

    <div class="figure">
      <a class="chart-link" href={explore(2020, maxYear, 'month')} title="Open this chart in the explorer" bind:clientWidth={width4}>
        <TimeChart
          agg={dragonEra}
          mode="stacked"
          unit="people"
          height={CHART_H}
          legend={false}
          xAxis="top"
          markers={dragonMoments.map((mo) => mo.t)}
          bind:layout={layout4}
        />
      </a>
      <Moments width={width4} moments={place(dragonMoments, layout4)} portraits={false} />
    </div>

    <div class="prose">
      <p>
        The 2020s broke the rotation. Crew Dragon gave the United States its own ride to the station again, China opened
        Tiangong, and for the first time paying passengers and private crews began to add to the population of space in
        numbers. Women were part of every strand. Wang Yaping was the first woman aboard Tiangong in October 2021 and the
        first Chinese woman to walk in space a few weeks later. Rayyanah Barnawi became the first Arab woman in space on
        Axiom's second private mission to the ISS in 2023, and on Polaris Dawn in 2024 Sarah Gillis and Anna Menon made the
        first commercial spacewalk, at the highest altitude any woman had reached.
      </p>
      <p>
        Suborbital flight added a different kind of first. Wally Funk, one of the thirteen women who passed NASA's astronaut
        tests in 1961 and were never allowed to fly, crossed the Kármán line on New Shepard in July 2021, aged 82. In April
        2025 the same vehicle carried six women and no men, the first all-female crew since Tereshkova flew alone. And in
        April 2026 Christina Koch flew around the Moon on Artemis II, the first woman to leave low Earth orbit. Sixty years
        after Vostok 6, women are still a minority of the people in space, but they are no longer an exception on any
        vehicle, any station or any kind of mission.
      </p>
    </div>
  </section>

  <section class="chapter">
    <h2>Conclusion</h2>
    <div class="prose">
      <p>
        Add up every day anyone has spent in space, by the flag they flew under, and the picture is uneven. A few nations
        with only a handful of flights sit at the top of the list because their one or two women happened to fly long
        missions. Among the countries that have spent real time in orbit, Italy, the United States and France come
        closest to parity, and even there women account for well under a third. Russia, which has logged more person-days
        than any other nation, sits near the bottom, and most of the fifty-odd countries that have sent someone to space
        have never sent a woman.
      </p>
      <p>
        {#if menSince !== null}
          Space has been continuously occupied by men for <strong class="counter">{fmtElapsed(elapsed(menSince))}</strong>,
          since {fmtDate(new Date(menSince))}.
        {:else}
          No man is in space right now.
        {/if}
        {#if womenSince !== null}
          It has been continuously occupied by women for <strong class="counter">{fmtElapsed(elapsed(womenSince))}</strong>,
          since {fmtDate(new Date(womenSince))}.
        {:else}
          No woman is in space right now.
        {/if}
      </p>
    </div>

    <div class="rings conclusion-rings">
      <a class="chart-link ring-link" href={router.href('explore', { m: 'population', by: 'nationality', c: 'ring', from: '1960', to: String(maxYear), fd: 'sex', fv: 'F' })} title="Open this chart in the explorer">
        <h3 class="ring-title">All women's time in space, by nationality</h3>
        <RingChart totals={womenByNation.totals} unit={womenByNation.unit} height={CONC_RING_H} />
      </a>
      <div class="ring-link">
        <h3 class="ring-title">In space right now</h3>
        <RingChart totals={nowBySex.totals} unit="people" height={CONC_RING_H} />
        <p class="small faint now-names">
          {#each ['F', 'M'] as const as k}
            {#if nowBySex.names(k).length}<span><b>{k === 'F' ? 'Women' : 'Men'}:</b> {nowBySex.names(k).join(', ')}.</span> {/if}
          {/each}
        </p>
      </div>
    </div>

    <div class="figure nations">
      <p class="muted lede">Share of each nation's time in space spent by women, all flights since 1961. Most female first.</p>
      <label class="check">
        <input type="checkbox" bind:checked={nationsSuborbital} />
        Include suborbital flights
      </label>
      <ul class="nation-grid">
        {#each nations as n (n.code)}
          <li>
            <RingChart totals={n.totals} height={88} legend={false} hole={0.74} wide interactive={false} centerImage={img(`flags/${n.code.toLowerCase()}.svg`)} centerAlt="Flag of {n.name}" />
            <div class="nation-name">{n.name}</div>
            <div class="nation-share">{fmtPct(n.share)} women</div>
          </li>
        {/each}
      </ul>
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
  /* A figure that belongs to the chapter above it: tighter, and a quieter heading. */
  .chapter.sub {
    margin-top: 8px;
  }
  .chapter.sub h3 {
    max-width: 720px;
    margin: 0 auto 12px;
    font-size: 1.25rem;
    color: var(--ink-2);
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
  .lede {
    max-width: 720px;
    margin: 0 auto 20px;
  }
  .check {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin: -8px 0 20px;
    font-size: 0.9rem;
    color: var(--ink-2);
  }
  .check input {
    accent-color: var(--accent);
    width: 18px;
    height: 18px;
    margin: 0;
  }
  .nation-grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(112px, 1fr));
    gap: 20px 12px;
  }
  .nation-grid li {
    text-align: center;
    font-size: 0.8rem;
    line-height: 1.3;
  }
  .nation-name {
    margin-top: 6px;
    color: var(--ink-2);
  }
  .nation-share {
    color: var(--ink-3);
    font-size: 0.74rem;
  }
  .counter {
    font-variant-numeric: tabular-nums;
    color: var(--ink);
  }
  .conclusion-rings {
    max-width: none;
    margin-bottom: 40px;
  }
  .ring-title {
    font-size: 1.15rem;
    margin: 0 0 8px;
    text-align: center;
    color: var(--ink-2);
  }
  .now-names {
    margin: 8px 0 0;
    text-align: center;
    line-height: 1.5;
  }
  .small {
    font-size: 0.8rem;
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
    min-width: 0;
  }
  @media (max-width: 600px) {
    .page {
      padding-top: 24px;
      padding-bottom: 56px;
    }
    .intro {
      margin-bottom: 36px;
    }
    h1 {
      font-size: 2.2rem;
    }
    .chapter h2 {
      font-size: 1.45rem;
    }
    .chapter.sub h3 {
      font-size: 1.1rem;
    }
    .prose p {
      font-size: 1rem;
    }
    .rings {
      grid-template-columns: 1fr;
      gap: 8px;
    }
    .ring-link {
      padding: 8px 0;
    }
    .nation-grid {
      grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
      gap: 16px 8px;
    }
  }
</style>

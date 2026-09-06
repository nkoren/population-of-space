<script lang="ts">
  import type { Dataset } from '$lib/data/types';
  import { aggregate, headline, snapshot } from '$lib/data/engine';
  import { dimensionById } from '$lib/data/dimensions';
  import TimeChart from '$lib/charts/TimeChart.svelte';
  import MiniRing from '$lib/charts/MiniRing.svelte';
  import { router } from '$lib/router.svelte';
  import { PHOTOS, img } from '$lib/eras';
  import { STORIES } from '$lib/stories';
  import { fmtDateTime, fmtInt } from '$lib/format';

  let { ds }: { ds: Dataset } = $props();
  const h = headline(ds);
  const maxYear = new Date(ds.dataEnd).getUTCFullYear();
  const YEAR = 365.25 * 86_400_000;

  // ---- intro numbers
  const flown = ds.personStats.filter((p) => p.flights > 0);
  const countryCount = new Set(flown.map((p) => p.person.nationality[0])).size;
  const personYears = Math.floor(h.totalPersonDays / 365.25);
  const continuousYears = h.continuousSince ? Math.floor((ds.dataEnd - h.continuousSince) / YEAR) : 0;

  // ---- who is up there: four demographic cuts, and the residents themselves
  const rings = [
    { id: 'nationality', title: 'Nationality' },
    { id: 'destination', title: 'Location' },
    { id: 'sex', title: 'Sex' },
    { id: 'age', title: 'Age' },
  ].map((r) => ({
    ...r,
    totals: snapshot(ds, dimensionById(r.id)),
    href: router.href('explore', { m: 'population', by: r.id, c: 'ring', from: String(maxYear), to: String(maxYear) }),
  }));
  let tab = $state<'demographics' | 'residents'>('demographics');

  const location = (s: (typeof h.inSpaceNow)[number]) => ds.destById.get(s.up.destination)?.name ?? s.up.destination;
  const groups = Object.entries(
    h.inSpaceNow.reduce<Record<string, typeof h.inSpaceNow>>((acc, s) => ((acc[location(s)] ??= []).push(s), acc), {}),
  );
  const dayUp = (start: number) => Math.max(1, Math.floor((ds.dataEnd - start) / 86_400_000) + 1);
  /** ISO 3166 alpha-2 code → regional-indicator flag emoji (the alt text; Windows has no colour flag font) */
  const flag = (code: string) => [...code.toUpperCase()].map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65)).join('');
  const ageNow = (born: string | null) => (born ? Math.floor((ds.dataEnd - Date.parse(born)) / YEAR) : '?');

  // ---- population, year by year, with the low/high band the engine computes for it
  const population = aggregate(ds, {
    metric: 'population',
    dimension: dimensionById('none'),
    resolution: 'year',
    from: Date.UTC(1961, 0, 1),
    to: ds.dataEnd,
  });

  const presets: { title: string; blurb: string; params: Record<string, string> }[] = [
    { title: 'Where people live in space', blurb: 'From capsules to Salyut, Mir, the ISS and Tiangong.', params: { m: 'population', by: 'destination', r: 'year', c: 'stacked' } },
    { title: 'Whose rockets?', blurb: 'Launch nation over time: the Soviet lead, the Shuttle, China’s rise.', params: { m: 'population', by: 'launchNation', r: 'year', c: 'stacked' } },
    { title: 'Who has flown', blurb: 'The cumulative count of humans who have been to space, by nationality.', params: { m: 'cumulativePeople', by: 'nationality', r: 'year', c: 'stacked' } },
  ];
</script>

<section class="hero">
  <div class="photo" aria-hidden="true">
    <img src={PHOTOS.home.image} alt="" />
    <div class="scrim side"></div>
    <div class="scrim fade"></div>
  </div>

  <div class="container hero-grid">
    <div class="lead">
      <p class="kicker">As of {fmtDateTime(new Date(ds.dataEnd))}</p>
      <h1>
        <span class="big">{h.inSpaceNow.length}</span>
        {h.inSpaceNow.length === 1 ? 'person is' : 'people are'} in space right now.
      </h1>
      <p class="lede">
        Since Yuri Gagarin's 108-minute flight in 1961, humanity has had a growing presence in space. Today, {fmtInt(h.peopleFlown)} people from {countryCount} countries have spent more than {fmtInt(personYears)} person-years living and working in space. For the past {continuousYears} years, there has been a continuous human presence in Earth orbit. This site uses demographic data to explore the stories and forces shaping our expansion in space.
      </p>
      <div class="cta">
        <a class="btn primary large" href={router.href('explore')}>Open the explorer <span aria-hidden="true">→</span></a>
      </div>
    </div>

    <div class="card now" id="now">
      <div class="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'demographics'} class:active={tab === 'demographics'} onclick={() => (tab = 'demographics')}>Demographics</button>
        <button role="tab" aria-selected={tab === 'residents'} class:active={tab === 'residents'} onclick={() => (tab = 'residents')}>Residents</button>
      </div>

      {#if tab === 'demographics'}
        <div class="rings">
          {#each rings as r (r.id)}
            <MiniRing title={r.title} totals={r.totals} href={r.href} />
          {/each}
        </div>
        <div class="hint mono faint">Hover a ring for its key · click to see it over time</div>
      {:else}
        <div class="residents">
          {#each groups as [place, stays]}
            <div class="place">
              <div class="label">{place} · {stays.length}</div>
              <ul>
                {#each stays as s}
                  <li>
                    <img class="flag" src={img(`flags/${s.person.nationality[0].toLowerCase()}.svg`)} alt={flag(s.person.nationality[0])} title={ds.nationByCode.get(s.person.nationality[0])?.name ?? s.person.nationality[0]} />
                    <span class="name">{s.person.name} <span class="faint">({ageNow(s.person.born)}/{s.person.sex})</span></span>
                    <span class="mono faint">{ds.dataEnd - s.start < 3_600_000 ? 'just launched' : `day ${dayUp(s.start)}`}</span>
                  </li>
                {/each}
              </ul>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
  <div class="container credit-row"><span class="credit">{PHOTOS.home.credit}</span></div>
</section>

<section class="container population">
  <div class="section-head">
    <div>
      <p class="kicker">1961 to today</p>
      <h2>The population of space</h2>
    </div>
    <p class="muted">Average people in space each year. The shaded band spans that year's lowest and highest headcount.</p>
  </div>
  <TimeChart agg={population} mode="line" unit="people" height={240} legend={false} />
  <div class="chart-foot">
    <span class="mono faint">peak {h.peak.count} · {new Date(h.peak.t).getUTCFullYear()}</span>
    <a href={router.href('explore', { m: 'population', by: 'none', r: 'year', c: 'line' })}>Open this chart in the explorer <span aria-hidden="true">→</span></a>
  </div>
</section>

<section class="container stories">
  <div class="section-head">
    <div>
      <p class="kicker">Stories</p>
      <h2>Scroll through the data</h2>
    </div>
    <p class="muted">Each story walks through one question, chart by chart.</p>
  </div>
  <div class="story-grid scroll-x">
    {#each STORIES as s (s.id)}
      <a class="story" href={router.href('explore', s.params)}>
        <img src={s.image} alt={s.alt} loading="lazy" />
        <div class="story-scrim"></div>
        <div class="story-text">
          <div class="story-name">{s.title}</div>
          <div class="story-blurb">{s.blurb}</div>
        </div>
      </a>
    {/each}
  </div>
  <div class="credit-row"><span class="credit">Photographs: NASA unless noted · Tereshkova: Alexander Mokletsov / RIA Novosti, CC BY-SA 3.0 · Shenzhou 13: CMSEO, CC BY 4.0</span></div>
</section>

<section class="container">
  <h2 class="section-title">Start exploring</h2>
  <div class="presets">
    {#each presets as p}
      <a class="card preset" href={router.href('explore', p.params)}>
        <h3>{p.title}</h3>
        <p class="muted">{p.blurb}</p>
        <span class="more">Open in the explorer <span aria-hidden="true">→</span></span>
      </a>
    {/each}
  </div>
</section>

<style>
  /* ---- hero */
  .hero {
    position: relative;
    min-height: clamp(640px, 100vh, 1000px);
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding-top: 150px;
    color: #fff;
  }
  .hero > .container {
    width: 100%;
  }
  .hero .photo img {
    object-position: center 40%;
  }
  .scrim.side {
    background: linear-gradient(90deg, rgba(6, 8, 15, 0.88) 0%, rgba(6, 8, 15, 0.55) 45%, rgba(6, 8, 15, 0.15) 100%);
  }
  .scrim.fade {
    background: linear-gradient(180deg, rgba(6, 8, 15, 0.55) 0%, rgba(6, 8, 15, 0) 25%, rgba(6, 8, 15, 0) 60%, var(--bg) 100%);
  }
  .hero-grid {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 640px) 400px;
    justify-content: space-between;
    align-items: start;
    gap: 40px;
    flex: 1;
  }
  .lead {
    display: flex;
    flex-direction: column;
    gap: 22px;
  }
  .kicker {
    margin: 0;
  }
  .hero h1 {
    color: #fff;
    font-size: clamp(2.6rem, 4.4vw, 4rem);
    line-height: 1.02;
    margin: 0;
  }
  .big {
    display: block;
    font-size: clamp(9rem, 14vw, 12.5rem);
    line-height: 0.85;
    color: var(--gold);
    margin-bottom: 6px;
  }
  .lede {
    max-width: 560px;
    color: var(--ink-2);
    font-size: 1.05rem;
    margin: 0;
  }
  .cta {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .credit-row {
    position: relative;
    display: flex;
    justify-content: flex-end;
    padding-top: 18px;
    padding-bottom: 24px;
  }

  /* ---- the "now" card: demographics / residents */
  .now {
    padding: 14px 18px 16px;
    margin-top: 130px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .tabs {
    display: flex;
    gap: 4px;
    border-bottom: 1px solid var(--line);
    padding-bottom: 10px;
  }
  .tabs button {
    height: 32px;
    padding: 0 12px;
    border: 0;
    border-radius: 8px;
    background: none;
    font-weight: 500;
    font-size: 0.88rem;
    color: var(--ink-2);
  }
  .tabs button:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.08);
  }
  .tabs button.active {
    color: #fff;
    background: rgba(255, 255, 255, 0.12);
  }
  .rings {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 4px;
  }
  .hint {
    font-size: 0.68rem;
    letter-spacing: 0.04em;
    text-align: center;
  }
  .residents {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .residents .label {
    margin-bottom: 8px;
  }
  .residents ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 0.93rem;
  }
  .residents li {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }
  .residents .name {
    flex: 1;
    min-width: 0;
  }
  .residents .mono {
    font-size: 0.78rem;
  }
  .flag {
    width: 20px;
    height: 14px;
    object-fit: cover;
    border-radius: 2px;
    align-self: center;
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.12);
  }

  /* ---- population chart */
  .population {
    margin-top: 72px;
  }
  .section-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 24px;
    margin-bottom: 18px;
  }
  .section-head .kicker {
    margin-bottom: 8px;
  }
  .section-head h2,
  .section-head p {
    margin: 0;
  }
  .section-head p {
    max-width: 420px;
    font-size: 0.92rem;
    text-align: right;
  }
  .chart-foot {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    margin-top: 6px;
    font-size: 0.85rem;
  }
  .chart-foot .mono {
    font-size: 0.72rem;
  }

  /* ---- stories */
  .stories {
    margin-top: 72px;
  }
  .story-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 10px;
    overflow: visible;
  }
  .story {
    position: relative;
    display: block;
    height: 250px;
    border-radius: 12px;
    overflow: hidden;
    color: var(--ink);
    border: 1px solid var(--line);
    transition: transform 0.2s, border-color 0.2s;
  }
  .story:hover {
    transform: translateY(-3px);
    border-color: var(--line-strong);
    color: var(--ink);
  }
  .story img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: saturate(0.9);
    transition: transform 0.4s;
  }
  .story:hover img {
    transform: scale(1.04);
  }
  .story-scrim {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(6, 8, 15, 0.1) 0%, rgba(6, 8, 15, 0) 30%, rgba(6, 8, 15, 0.94) 100%);
  }
  .story-text {
    position: absolute;
    left: 14px;
    right: 14px;
    bottom: 14px;
  }
  .story-name {
    font-family: var(--font-display);
    font-size: 1.55rem;
    line-height: 1;
  }
  .story-blurb {
    font-size: 0.78rem;
    color: var(--ink-2);
    margin-top: 6px;
    line-height: 1.3;
  }
  .stories .credit-row {
    padding-top: 12px;
    padding-bottom: 0;
  }

  /* ---- presets */
  .section-title {
    margin: 64px 0 18px;
  }
  .presets {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }
  .preset {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 20px 20px 18px;
    color: var(--ink);
    transition: transform 0.15s, border-color 0.15s;
  }
  .preset:hover {
    transform: translateY(-2px);
    border-color: var(--accent);
    color: var(--ink);
  }
  .preset h3 {
    margin: 0;
  }
  .preset p {
    margin: 0;
    font-size: 0.9rem;
  }
  .preset .more {
    margin-top: auto;
    padding-top: 10px;
    font-size: 0.85rem;
    color: var(--accent-ink);
  }

  /* ---- responsive */
  @media (max-width: 1100px) {
    .presets {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  @media (max-width: 860px) {
    .hero {
      min-height: 0;
      padding-top: 110px;
    }
    .hero .photo img {
      object-position: 62% 40%;
    }
    .scrim.side {
      background: none;
    }
    .scrim.fade {
      background: linear-gradient(180deg, rgba(6, 8, 15, 0.6) 0%, rgba(6, 8, 15, 0.35) 30%, rgba(6, 8, 15, 0.85) 65%, var(--bg) 100%);
    }
    .hero-grid {
      grid-template-columns: 1fr;
      gap: 28px;
    }
    .big {
      font-size: clamp(7rem, 38vw, 9.5rem);
    }
    .now {
      margin-top: 0;
    }
    .rings {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
    .section-head {
      flex-direction: column;
      align-items: flex-start;
      gap: 6px;
    }
    .section-head p {
      text-align: left;
    }
    .story-grid {
      display: flex;
      gap: 10px;
      overflow-x: auto;
      margin: 0 calc(-1 * var(--gutter));
      padding: 0 var(--gutter) 6px;
      scroll-snap-type: x mandatory;
    }
    .story {
      flex: 0 0 200px;
      height: 220px;
      scroll-snap-align: start;
    }
  }
  @media (max-width: 600px) {
    .rings {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .presets {
      grid-template-columns: 1fr;
    }
    .chart-foot .mono {
      display: none;
    }
  }
</style>

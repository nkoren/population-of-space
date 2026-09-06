<script lang="ts">
  import type { Dataset } from '$lib/data/types';
  import { aggregate, headline, snapshot } from '$lib/data/engine';
  import { dimensionById } from '$lib/data/dimensions';
  import TimeChart from '$lib/charts/TimeChart.svelte';
  import RingChart from '$lib/charts/RingChart.svelte';
  import HeadcountTrace from '$lib/charts/HeadcountTrace.svelte';
  import { router } from '$lib/router.svelte';
  import { ERAS, PHOTOS } from '$lib/eras';
  import { fmtDate, fmtDateTime, fmtInt, fmtDec1, fmtPct1 } from '$lib/format';

  let { ds }: { ds: Dataset } = $props();
  const h = headline(ds);
  const maxYear = new Date(ds.dataEnd).getUTCFullYear();

  const featured = aggregate(ds, {
    metric: 'population',
    dimension: dimensionById('destination'),
    resolution: 'year',
    from: Date.UTC(1961, 0, 1),
    to: ds.dataEnd,
  });
  // Who is up there right now, three ways. Each ring links to the same cut in the explorer.
  const rings = [
    { id: 'nationality', title: 'Nationality' },
    { id: 'sex', title: 'Sex' },
    { id: 'age', title: 'Age' },
  ].map((r) => ({ ...r, totals: snapshot(ds, dimensionById(r.id)), href: router.href('explore', { m: 'population', by: r.id, c: 'ring', from: String(maxYear), to: String(maxYear) }) }));
  const trace = aggregate(ds, {
    metric: 'population',
    dimension: dimensionById('none'),
    resolution: 'exact',
    from: Date.UTC(1961, 0, 1),
    to: ds.dataEnd,
  });

  const presets: { title: string; blurb: string; params: Record<string, string> }[] = [
    { title: 'Where people live in space', blurb: 'From capsules to Salyut, Mir, the ISS and Tiangong.', params: { m: 'population', by: 'destination', r: 'year', c: 'stacked' } },
    { title: 'Women in space', blurb: 'Share of human time in orbit spent by women.', params: { m: 'population', by: 'sex', r: 'year', c: 'share' } },
    { title: 'Whose rockets?', blurb: 'Launch nation over time: the Soviet lead, the Shuttle, China’s rise.', params: { m: 'population', by: 'launchNation', r: 'year', c: 'stacked' } },
    { title: 'Commercial spaceflight', blurb: 'People launched per year by government vs commercial operators.', params: { m: 'launched', by: 'sector', r: 'year', c: 'stacked', from: '2000' } },
    { title: 'Who has flown', blurb: 'The cumulative count of humans who have been to space, by nationality.', params: { m: 'cumulativePeople', by: 'nationality', r: 'year', c: 'stacked' } },
    { title: 'Getting older?', blurb: 'The age mix of people in space, decade by decade.', params: { m: 'population', by: 'age', r: 'year', c: 'share' } },
  ];

  const location = (s: (typeof h.inSpaceNow)[number]) => ds.destById.get(s.up.destination)?.name ?? s.up.destination;
  const groups = Object.entries(
    h.inSpaceNow.reduce<Record<string, typeof h.inSpaceNow>>((acc, s) => ((acc[location(s)] ??= []).push(s), acc), {}),
  );
  const dayUp = (start: number) => Math.max(1, Math.floor((ds.dataEnd - start) / 86_400_000) + 1);
  const eraHref = (e: (typeof ERAS)[number]) =>
    router.href('explore', { m: 'population', by: 'destination', r: 'month', c: 'stacked', from: String(e.from), to: String(e.to ?? maxYear) });
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
        Since Yuri Gagarin's 108 minutes in 1961, humanity has kept a small, fluctuating population off the planet. This site tracks it mission by mission and person by person.
      </p>
      <div class="cta">
        <a class="btn primary large" href={router.href('explore')}>Open the explorer <span aria-hidden="true">→</span></a>
        <a class="btn large" href="#crew">Who is up there</a>
      </div>
    </div>

    <div class="card crew" id="crew">
      {#each groups as [place, stays]}
        <div class="place">
          <div class="label">{place} · {stays.length}</div>
          <ul>
            {#each stays as s}
              <li>
                <span class="tag">{s.person.nationality[0]}</span>
                <span>{s.person.name}</span>
                <span class="mono faint">{ds.dataEnd - s.start < 3_600_000 ? 'just launched' : `day ${dayUp(s.start)}`}</span>
              </li>
            {/each}
          </ul>
        </div>
      {/each}
    </div>
  </div>

  <div class="container trace">
    <HeadcountTrace agg={trace} height={70} />
    <div class="trace-labels mono">
      <span>1961 · exact headcount at every launch and landing</span>
      <span>peak {h.peak.count} · {maxYear}</span>
    </div>
  </div>
  <div class="container credit-row"><span class="credit">{PHOTOS.home.credit}</span></div>
</section>

<section class="container stats">
  <div class="stat card">
    <div class="n">{fmtInt(h.totalPersonDays / 365.25)}</div>
    <div class="l">person-years spent in space</div>
  </div>
  <div class="stat card">
    <div class="n">{fmtInt(h.peopleFlown)}</div>
    <div class="l">people have been to space</div>
  </div>
  <div class="stat card">
    <div class="n">{h.peak.count}</div>
    <div class="l">most people in space at once<br /><span class="mono faint">{fmtDate(new Date(h.peak.t))}</span></div>
  </div>
  <div class="stat card">
    <div class="n">{fmtPct1(h.womenShareDays)}</div>
    <div class="l">of all human time in space has been women's</div>
  </div>
  {#if h.continuousSince}
    <div class="stat card">
      <div class="n">{fmtDec1((ds.dataEnd - h.continuousSince) / (365.25 * 86_400_000))}</div>
      <div class="l">years of uninterrupted human presence<br /><span class="mono faint">since {fmtDate(new Date(h.continuousSince))}</span></div>
    </div>
  {/if}
</section>

<section class="container now">
  <div class="section-head">
    <div>
      <p class="kicker">Right now</p>
      <h2>Who is up there</h2>
    </div>
    <p class="muted">The {h.inSpaceNow.length} people in space today, by nationality, sex and age.</p>
  </div>
  <div class="rings">
    {#each rings as r}
      <div class="card ring-card">
        <h3>{r.title}</h3>
        <RingChart totals={r.totals} unit="people" height={200} />
        <a href={r.href}>See this over time <span aria-hidden="true">→</span></a>
      </div>
    {/each}
  </div>
</section>

<section class="container featured">
  <div class="card panel">
    <div class="panel-head">
      <div>
        <h2>People in space, by where they were</h2>
        <p class="muted">Average headcount per year since 1961, coloured by destination.</p>
      </div>
      <a href={router.href('explore', { m: 'population', by: 'destination', r: 'year', c: 'stacked' })}>Open this chart in the explorer <span aria-hidden="true">→</span></a>
    </div>
    <TimeChart agg={featured} mode="stacked" unit="people" height={380} />
  </div>
</section>

<section class="container eras">
  <div class="section-head">
    <div>
      <p class="kicker">Six eras, 1961 to today</p>
      <h2>Explore an era</h2>
    </div>
    <p class="muted">Each opens the explorer on that span of years.</p>
  </div>
  <div class="era-strip scroll-x">
    {#each ERAS as e}
      <a class="era" href={eraHref(e)}>
        <img src={e.image} alt={e.alt} loading="lazy" />
        <div class="era-scrim"></div>
        <div class="era-text">
          <div class="era-name">{e.name}</div>
          <div class="era-span mono">{e.from}–{e.to ?? 'today'}</div>
          <div class="era-blurb">{e.blurb}</div>
        </div>
      </a>
    {/each}
  </div>
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
    max-width: 520px;
    color: var(--ink-2);
    font-size: 1.1rem;
    margin: 0;
  }
  .cta {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .crew {
    padding: 22px 24px;
    margin-top: 130px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .crew .label {
    margin-bottom: 8px;
  }
  .crew ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 0.93rem;
  }
  .crew li {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }
  .crew .mono {
    font-size: 0.78rem;
  }
  .trace {
    position: relative;
    margin-top: 56px;
  }
  .trace-labels {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    font-size: 0.7rem;
    color: var(--ink-3);
    margin-top: 6px;
  }
  .credit-row {
    position: relative;
    display: flex;
    justify-content: flex-end;
    padding-top: 18px;
    padding-bottom: 24px;
  }

  /* ---- stats */
  .stats {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 12px;
  }
  .stat {
    padding: 20px 20px 18px;
  }
  .stat .n {
    font-family: var(--font-display);
    font-size: 2.8rem;
    line-height: 1;
    color: var(--gold);
  }
  .stat .l {
    color: var(--ink-2);
    font-size: 0.88rem;
    margin-top: 8px;
    line-height: 1.35;
  }
  .stat .mono {
    font-size: 0.74rem;
  }

  /* ---- who is up there */
  .now {
    margin-top: 56px;
  }
  .rings {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }
  .ring-card {
    padding: 20px 20px 18px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .ring-card h3 {
    margin: 0;
  }
  .ring-card a {
    font-size: 0.85rem;
    margin-top: auto;
    padding-top: 8px;
  }

  /* ---- featured chart */
  .featured {
    margin-top: 56px;
  }
  .panel {
    padding: 28px 30px 20px;
  }
  .panel-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 24px;
    margin-bottom: 18px;
  }
  .panel-head h2 {
    margin-bottom: 4px;
  }
  .panel-head p {
    margin: 0;
    font-size: 0.92rem;
  }
  .panel-head a {
    white-space: nowrap;
    font-size: 0.9rem;
  }

  /* ---- eras */
  .eras {
    margin-top: 64px;
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
  .era-strip {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 10px;
    overflow: visible;
  }
  .era {
    position: relative;
    display: block;
    height: 250px;
    border-radius: 12px;
    overflow: hidden;
    color: var(--ink);
    border: 1px solid var(--line);
    transition: transform 0.2s, border-color 0.2s;
  }
  .era:hover {
    transform: translateY(-3px);
    border-color: var(--line-strong);
    color: var(--ink);
  }
  .era img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: saturate(0.9);
    transition: transform 0.4s;
  }
  .era:hover img {
    transform: scale(1.04);
  }
  .era-scrim {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(6, 8, 15, 0.1) 0%, rgba(6, 8, 15, 0) 30%, rgba(6, 8, 15, 0.94) 100%);
  }
  .era-text {
    position: absolute;
    left: 14px;
    right: 14px;
    bottom: 14px;
  }
  .era-name {
    font-family: var(--font-display);
    font-size: 1.75rem;
    line-height: 1;
  }
  .era-span {
    font-size: 0.72rem;
    letter-spacing: 0.08em;
    color: var(--gold);
    margin-top: 6px;
  }
  .era-blurb {
    font-size: 0.78rem;
    color: var(--ink-2);
    margin-top: 4px;
    line-height: 1.3;
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
    .stats {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    .era-strip {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    .presets {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .rings {
      grid-template-columns: 1fr;
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
    .crew {
      margin-top: 0;
    }
    .trace {
      margin-top: 28px;
    }
    .panel {
      padding: 18px 16px 12px;
    }
    .panel-head,
    .section-head {
      flex-direction: column;
      align-items: flex-start;
      gap: 6px;
    }
    .era-strip {
      display: flex;
      gap: 10px;
      overflow-x: auto;
      margin: 0 calc(-1 * var(--gutter));
      padding: 0 var(--gutter) 6px;
      scroll-snap-type: x mandatory;
    }
    .era {
      flex: 0 0 170px;
      height: 210px;
      scroll-snap-align: start;
    }
  }
  @media (max-width: 600px) {
    .stats {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .stat .n {
      font-size: 2.2rem;
    }
    .presets {
      grid-template-columns: 1fr;
    }
    .trace-labels span:last-child {
      display: none;
    }
  }
</style>

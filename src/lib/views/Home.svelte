<script lang="ts">
  import type { Dataset } from '$lib/data/types';
  import { aggregate, headline } from '$lib/data/engine';
  import { dimensionById } from '$lib/data/dimensions';
  import TimeChart from '$lib/charts/TimeChart.svelte';
  import { router } from '$lib/router.svelte';
  import { fmtDate, fmtInt, fmtDec1, fmtPct1, fmtDays } from '$lib/format';

  let { ds }: { ds: Dataset } = $props();
  const h = headline(ds);
  const asOf = fmtDate(new Date(ds.dataEnd));

  const featured = aggregate(ds, {
    metric: 'population',
    dimension: dimensionById('destination'),
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
</script>

<section class="hero">
  <div class="container">
    <p class="kicker">As of {asOf}</p>
    <h1>
      <span class="big">{h.inSpaceNow.length}</span> people {h.inSpaceNow.length === 1 ? 'is' : 'are'} in space.
    </h1>
    <div class="crew">
      {#each groups as [place, stays]}
        <div class="place">
          <div class="place-name">{place}</div>
          <ul>
            {#each stays as s}
              <li>
                <span class="tag">{s.person.nationality[0]}</span>
                {s.person.name}
                <span class="faint small">· {ds.dataEnd - s.start < 3_600_000 ? 'just launched' : `up ${fmtDays((ds.dataEnd - s.start) / 86_400_000)}`}</span>
              </li>
            {/each}
          </ul>
        </div>
      {/each}
    </div>
    <p class="lede">
      Since Yuri Gagarin's 108 minutes in 1961, humanity has kept a small, fluctuating population off the planet. This site tracks it mission by mission and person by person, so you can explore who was up there, where, and for how long.
    </p>
    <a class="btn primary" href={router.href('explore')}>Open the explorer →</a>
  </div>
</section>

<section class="container stats">
  <div class="stat card">
    <div class="n">{fmtDec1(h.totalPersonDays / 365.25)}</div>
    <div class="l">person-years spent in space</div>
  </div>
  <div class="stat card">
    <div class="n">{fmtInt(h.peopleFlown)}</div>
    <div class="l">people have been to space</div>
  </div>
  <div class="stat card">
    <div class="n">{h.peak.count}</div>
    <div class="l">most people in space at once<br /><span class="faint">{fmtDate(new Date(h.peak.t))}</span></div>
  </div>
  <div class="stat card">
    <div class="n">{fmtPct1(h.womenShareDays)}</div>
    <div class="l">of all human time in space has been women's</div>
  </div>
  {#if h.continuousSince}
    <div class="stat card">
      <div class="n">{fmtDec1((ds.dataEnd - h.continuousSince) / (365.25 * 86_400_000))}</div>
      <div class="l">years of uninterrupted human presence<br /><span class="faint">since {fmtDate(new Date(h.continuousSince))}</span></div>
    </div>
  {/if}
</section>

<section class="container featured">
  <div class="card panel">
    <h2>People in space, by where they were</h2>
    <p class="muted small">Exact headcount at every launch and landing since 1961, coloured by destination.</p>
    <TimeChart agg={featured} mode="stacked" unit="people" height={380} />
    <p class="small"><a href={router.href('explore', { m: 'population', by: 'destination', r: 'exact', c: 'stacked' })}>Open this chart in the explorer →</a></p>
  </div>
</section>

<section class="container">
  <h2>Start exploring</h2>
  <div class="presets">
    {#each presets as p}
      <a class="card preset" href={router.href('explore', p.params)}>
        <h3>{p.title}</h3>
        <p class="muted small">{p.blurb}</p>
      </a>
    {/each}
  </div>
</section>

<style>
  .hero {
    background: linear-gradient(180deg, var(--space) 0%, var(--space-2) 100%);
    color: #fff;
    padding: 56px 0 48px;
  }
  .kicker {
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--gold);
    margin-bottom: 8px;
  }
  .hero h1 {
    color: #fff;
    margin-bottom: 20px;
  }
  .big {
    font-size: 1.6em;
    color: var(--gold);
  }
  .crew {
    display: flex;
    flex-wrap: wrap;
    gap: 16px 40px;
    margin-bottom: 28px;
  }
  .place-name {
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgba(255, 255, 255, 0.6);
    margin-bottom: 4px;
  }
  .crew ul {
    list-style: none;
    padding: 0;
    margin: 0;
    font-size: 0.95rem;
  }
  .crew li {
    line-height: 1.7;
  }
  .crew .tag {
    background: rgba(255, 255, 255, 0.12);
    color: rgba(255, 255, 255, 0.85);
  }
  .crew .faint {
    color: rgba(255, 255, 255, 0.45);
  }
  .lede {
    max-width: 640px;
    color: rgba(255, 255, 255, 0.8);
    font-size: 1.05rem;
    margin-bottom: 24px;
  }
  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    gap: 14px;
    margin-top: -24px;
  }
  .stat {
    padding: 18px 18px 16px;
  }
  .stat .n {
    font-family: var(--font-display);
    font-size: 2.1rem;
    font-weight: 700;
    line-height: 1.1;
    color: var(--accent-ink);
  }
  .stat .l {
    color: var(--ink-2);
    font-size: 0.88rem;
    margin-top: 4px;
    line-height: 1.35;
  }
  .featured {
    margin-top: 32px;
  }
  .panel {
    padding: 22px 22px 12px;
  }
  .panel h2 {
    font-size: 1.35rem;
    margin-bottom: 2px;
  }
  section.container > h2 {
    margin-top: 40px;
  }
  .presets {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 14px;
  }
  .preset {
    padding: 18px;
    color: inherit;
    transition: transform 0.15s, border-color 0.15s;
  }
  .preset:hover {
    text-decoration: none;
    transform: translateY(-2px);
    border-color: var(--accent);
  }
  .preset h3 {
    margin-bottom: 4px;
  }
  .preset p {
    margin: 0;
  }
</style>

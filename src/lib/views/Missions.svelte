<script lang="ts">
  import type { Dataset, FlightStats } from '$lib/data/types';
  import { fmtDate, fmtDays } from '$lib/format';

  let { ds }: { ds: Dataset } = $props();

  let search = $state('');
  let dest = $state('all');
  let sortKey = $state<'launch' | 'duration' | 'crew'>('launch');
  let asc = $state(false);

  const rows = $derived.by(() => {
    const q = search.trim().toLowerCase();
    let r = ds.flightStats.filter((f) => dest === 'all' || f.flight.destination === dest);
    if (q) r = r.filter((f) => f.flight.name.toLowerCase().includes(q) || [...f.crewUp, ...f.crewDown].some((p) => p.name.toLowerCase().includes(q)));
    const key = (f: FlightStats) => (sortKey === 'launch' ? f.launch : sortKey === 'duration' ? f.duration : f.crewUp.length + f.crewDown.length);
    return [...r].sort((a, b) => (asc ? key(a) - key(b) : key(b) - key(a)));
  });
  function sortBy(k: typeof sortKey) {
    if (sortKey === k) asc = !asc;
    else {
      sortKey = k;
      asc = k === 'launch' ? false : false;
    }
  }
  const nation = (c: string) => ds.nationByCode.get(c)?.name ?? c;
</script>

<div class="container page">
  <h1>Missions</h1>
  <p class="muted">Every crewed spaceflight in the dataset: {ds.flights.length} launches from {fmtDate(new Date(ds.flightStats[0].launch))} to {fmtDate(new Date(ds.flightStats[ds.flightStats.length - 1].launch))}.</p>

  <div class="toolbar">
    <input type="search" placeholder="Search missions or crew…" bind:value={search} />
    <select bind:value={dest}>
      <option value="all">All destinations</option>
      {#each ds.destinations as d}<option value={d.id}>{d.name}</option>{/each}
    </select>
    <span class="faint small">{rows.length} missions</span>
  </div>

  <div class="card table-wrap">
    <table>
      <thead>
        <tr>
          <th><button onclick={() => sortBy('launch')}>Launch {sortKey === 'launch' ? (asc ? '↑' : '↓') : ''}</button></th>
          <th>Mission</th>
          <th>Launched by</th>
          <th>Destination</th>
          <th><button onclick={() => sortBy('duration')}>Duration {sortKey === 'duration' ? (asc ? '↑' : '↓') : ''}</button></th>
          <th><button onclick={() => sortBy('crew')}>Crew {sortKey === 'crew' ? (asc ? '↑' : '↓') : ''}</button></th>
        </tr>
      </thead>
      <tbody>
        {#each rows as f (f.flight.id)}
          {@const sameCrew = f.flight.crew_up.join() === f.flight.crew_down.join()}
          <tr>
            <td class="nowrap">{fmtDate(new Date(f.launch))}</td>
            <td>
              {#if f.flight.wiki}<a href={f.flight.wiki} target="_blank" rel="noopener">{f.flight.name}</a>{:else}{f.flight.name}{/if}
              {#if f.flight.sector === 'commercial'}<span class="tag">commercial</span>{/if}
              {#if f.landing === null}<span class="tag live">in progress</span>{/if}
            </td>
            <td class="nowrap"><span class="tag">{f.flight.launch_nation}</span> {nation(f.flight.launch_nation)}</td>
            <td class="nowrap">{ds.destById.get(f.flight.destination)?.name}</td>
            <td class="nowrap num">{f.landing === null ? '—' : fmtDays(f.duration)}</td>
            <td class="crew">
              {#if sameCrew}
                {f.crewUp.map((p) => p.name).join(', ')}
              {:else}
                <span class="faint">↑</span> {f.crewUp.length ? f.crewUp.map((p) => p.name).join(', ') : 'nobody'}<br />
                <span class="faint">↓</span> {f.crewDown.length ? f.crewDown.map((p) => p.name).join(', ') : 'nobody'}
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style>
  .page {
    padding-top: 32px;
  }
  .toolbar {
    display: flex;
    gap: 10px;
    align-items: center;
    margin: 16px 0 12px;
    flex-wrap: wrap;
  }
  input,
  select {
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 7px 10px;
    background: var(--bg-elev);
    min-width: 220px;
  }
  .table-wrap {
    overflow-x: auto;
  }
  th,
  td {
    padding: 8px 12px;
    border-bottom: 1px solid var(--line);
    font-size: 0.88rem;
    vertical-align: top;
    text-align: left;
  }
  th {
    background: var(--bg-muted);
    font-weight: 600;
    white-space: nowrap;
  }
  th button {
    border: 0;
    background: none;
    padding: 0;
    font-weight: 600;
  }
  tr:last-child td {
    border-bottom: 0;
  }
  .nowrap {
    white-space: nowrap;
  }
  .num {
    font-variant-numeric: tabular-nums;
  }
  .crew {
    color: var(--ink-2);
    max-width: 420px;
  }
  .tag.live {
    background: #dff5e8;
    color: #14733d;
  }
</style>

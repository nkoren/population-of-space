<script lang="ts">
  import type { Dataset, PersonStats } from '$lib/data/types';
  import { fmtDate, fmtDays, fmtInt } from '$lib/format';
  import { bornTime, fmtBorn } from '$lib/data/load';

  let { ds }: { ds: Dataset } = $props();

  let search = $state('');
  let nat = $state('all');
  let sortKey = $state<'first' | 'days' | 'flights' | 'name'>('first');
  let asc = $state(false);

  const nations = ds.nations.filter((n) => ds.people.some((p) => p.nationality.includes(n.code))).sort((a, b) => a.name.localeCompare(b.name));

  const rows = $derived.by(() => {
    const q = search.trim().toLowerCase();
    let r = ds.personStats.filter((p) => nat === 'all' || p.person.nationality.includes(nat));
    if (q) r = r.filter((p) => p.person.name.toLowerCase().includes(q));
    const key = (p: PersonStats) => (sortKey === 'first' ? p.first : sortKey === 'days' ? p.days : p.flights);
    return [...r].sort((a, b) => (sortKey === 'name' ? (asc ? 1 : -1) * a.person.name.localeCompare(b.person.name) : asc ? key(a) - key(b) : key(b) - key(a)));
  });
  function sortBy(k: typeof sortKey) {
    if (sortKey === k) asc = !asc;
    else {
      sortKey = k;
      asc = k === 'name';
    }
  }
  const arrow = (k: typeof sortKey) => (sortKey === k ? (asc ? ' ↑' : ' ↓') : '');
  const age = (p: PersonStats) => {
    const b = bornTime(p.person.born);
    return b === null ? null : Math.floor((p.first - b) / (365.25 * 86_400_000));
  };
</script>

<div class="container page">
  <h1>People</h1>
  <p class="muted">{fmtInt(ds.people.length)} people have flown to space. Time in space is the sum of every stay, from launch to landing.</p>

  <div class="toolbar">
    <input type="search" placeholder="Search by name…" bind:value={search} />
    <select bind:value={nat}>
      <option value="all">All nationalities</option>
      {#each nations as n}<option value={n.code}>{n.name}</option>{/each}
    </select>
    <span class="faint small">{rows.length} people</span>
  </div>

  <div class="card table-wrap">
    <table>
      <thead>
        <tr>
          <th><button onclick={() => sortBy('name')}>Name{arrow('name')}</button></th>
          <th>Nationality</th>
          <th>Sex</th>
          <th>Born</th>
          <th><button onclick={() => sortBy('first')}>First flight{arrow('first')}</button></th>
          <th class="num">Age then</th>
          <th class="num"><button onclick={() => sortBy('flights')}>Flights{arrow('flights')}</button></th>
          <th class="num"><button onclick={() => sortBy('days')}>Time in space{arrow('days')}</button></th>
        </tr>
      </thead>
      <tbody>
        {#each rows as p (p.person.id)}
          <tr>
            <td class="nowrap">
              {#if p.person.wiki}<a href={p.person.wiki} target="_blank" rel="noopener">{p.person.name}</a>{:else}{p.person.name}{/if}
            </td>
            <td class="nowrap">{#each p.person.nationality as c}<span class="tag">{c}</span> {/each}</td>
            <td>{p.person.sex}</td>
            <td class="nowrap">{fmtBorn(p.person.born, fmtDate)}</td>
            <td class="nowrap">{fmtDate(new Date(p.first))}<span class="faint"> · {p.stays[0]?.up.name}</span></td>
            <td class="num">{age(p) ?? '—'}</td>
            <td class="num">{p.flights}</td>
            <td class="num nowrap">{fmtDays(p.days)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style>
  .page {
    padding-top: 40px;
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
    padding: 7px 12px;
    border-bottom: 1px solid var(--line);
    font-size: 0.88rem;
    text-align: left;
  }
  th {
    background: var(--bg-elev);
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
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
</style>

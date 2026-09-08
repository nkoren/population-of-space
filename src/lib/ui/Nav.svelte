<script lang="ts">
  import { router, type Route } from '$lib/router.svelte';
  const links: { route: Route; label: string }[] = [
    { route: 'explore', label: 'Explorer' },
    { route: 'missions', label: 'Missions' },
    { route: 'people', label: 'People' },
    { route: 'about', label: 'About' },
  ];
</script>

<header>
  <div class="container bar">
    <a class="brand" href={router.href('home')}>
      <svg width="26" height="26" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="27" fill="#6ea8fe" />
        <ellipse cx="50" cy="50" rx="46" ry="12" fill="none" stroke="#f0c674" stroke-width="5" transform="rotate(-20 50 50)" />
      </svg>
      <span class="name">The Population <em>of</em> Space</span>
    </a>
    <nav>
      {#each links as l}
        <a href={router.href(l.route)} class:active={router.route === l.route}>{l.label}</a>
      {/each}
    </nav>
  </div>
</header>

<style>
  header {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 10;
    background: linear-gradient(180deg, rgba(6, 8, 15, 0.55), rgba(6, 8, 15, 0));
  }
  .bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 72px;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 12px;
    color: var(--ink);
    font-family: var(--font-display);
    font-size: 1.3rem;
  }
  .brand em {
    font-style: italic;
    opacity: 0.7;
  }
  nav {
    display: flex;
    gap: 4px;
  }
  nav a {
    height: 36px;
    display: inline-flex;
    align-items: center;
    padding: 0 14px;
    border-radius: 9px;
    font-weight: 500;
    font-size: 0.92rem;
    color: var(--ink-2);
  }
  nav a:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.08);
  }
  nav a.active {
    color: #fff;
    background: rgba(255, 255, 255, 0.12);
  }
  @media (max-width: 600px) {
    .bar {
      height: 60px;
    }
    .name {
      display: none;
    }
    nav a {
      padding: 0 9px;
      font-size: 0.85rem;
    }
  }
  @media (max-width: 380px) {
    .bar {
      gap: 6px;
    }
    nav {
      gap: 0;
      flex-wrap: wrap;
      justify-content: flex-end;
    }
    nav a {
      padding: 0 7px;
      font-size: 0.8rem;
      height: 30px;
    }
  }
</style>

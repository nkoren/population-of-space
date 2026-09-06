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
  <div class="stars" aria-hidden="true"></div>
  <div class="container bar">
    <a class="brand" href={router.href('home')}>
      <span class="logo" aria-hidden="true">
        <span class="planet"></span>
        <span class="ring"></span>
        <span class="moon"></span>
      </span>
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
    position: relative;
    background: radial-gradient(1200px 300px at 20% -50%, var(--space-2), var(--space) 70%);
    color: #fff;
    overflow: hidden;
  }
  .stars {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image:
      radial-gradient(1px 1px at 12% 30%, #fff 60%, transparent 61%),
      radial-gradient(1px 1px at 28% 70%, #fff 60%, transparent 61%),
      radial-gradient(1.5px 1.5px at 44% 20%, #fff 60%, transparent 61%),
      radial-gradient(1px 1px at 58% 60%, #fff 60%, transparent 61%),
      radial-gradient(1px 1px at 70% 35%, #fff 60%, transparent 61%),
      radial-gradient(1.5px 1.5px at 83% 75%, #fff 60%, transparent 61%),
      radial-gradient(1px 1px at 92% 25%, #fff 60%, transparent 61%),
      radial-gradient(1px 1px at 36% 85%, #fff 60%, transparent 61%),
      radial-gradient(1px 1px at 76% 12%, #fff 60%, transparent 61%);
    opacity: 0.55;
  }
  .bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 64px;
    position: relative;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 12px;
    color: #fff;
    font-family: var(--font-display);
    font-size: 1.25rem;
    font-weight: 600;
  }
  .brand:hover {
    text-decoration: none;
  }
  .brand em {
    font-style: italic;
    font-weight: 500;
    opacity: 0.75;
  }
  .logo {
    position: relative;
    width: 34px;
    height: 34px;
    display: inline-block;
  }
  .planet {
    position: absolute;
    inset: 8px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 35%, #9cc3ff, #4c8dff 60%, #2b5fc4);
  }
  .ring {
    position: absolute;
    left: -3px;
    right: -3px;
    top: 13px;
    height: 8px;
    border: 1.5px solid var(--gold);
    border-radius: 50%;
    transform: rotate(-20deg);
    opacity: 0.9;
  }
  .moon {
    position: absolute;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #fff;
    top: 50%;
    left: 50%;
    margin: -2.5px 0 0 -2.5px;
    transform-origin: 2.5px 2.5px;
    animation: orbit 6s linear infinite;
  }
  @keyframes orbit {
    from {
      transform: rotate(0deg) translateX(17px) rotate(0deg);
    }
    to {
      transform: rotate(360deg) translateX(17px) rotate(-360deg);
    }
  }
  nav {
    display: flex;
    gap: 4px;
  }
  nav a {
    color: rgba(255, 255, 255, 0.78);
    padding: 6px 12px;
    border-radius: 8px;
    font-weight: 500;
    font-size: 0.95rem;
  }
  nav a:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.08);
    text-decoration: none;
  }
  nav a.active {
    color: #fff;
    background: rgba(255, 255, 255, 0.14);
  }
  @media (max-width: 600px) {
    .name {
      display: none;
    }
    nav a {
      padding: 6px 9px;
      font-size: 0.9rem;
    }
  }
</style>

<script lang="ts">
  import { router } from '$lib/router.svelte';
  import { loadDataset } from '$lib/data/load';
  import Nav from '$lib/ui/Nav.svelte';
  import Footer from '$lib/ui/Footer.svelte';
  import Home from '$lib/views/Home.svelte';
  import Explorer from '$lib/views/Explorer.svelte';
  import Missions from '$lib/views/Missions.svelte';
  import People from '$lib/views/People.svelte';
  import About from '$lib/views/About.svelte';

  const data = loadDataset();
</script>

<svelte:window onclick={router.onclick} />

<div class="app">
  <Nav />
  <main class:offset={router.route !== 'home' && router.route !== 'explore'}>
    {#await data}
      <div class="loading container">
        <div class="orbit" aria-hidden="true"><span></span></div>
        <p class="muted">Loading six decades of spaceflight…</p>
      </div>
    {:then ds}
      {#if router.route === 'home'}
        <Home {ds} />
      {:else if router.route === 'explore'}
        <Explorer {ds} />
      {:else if router.route === 'missions'}
        <Missions {ds} />
      {:else if router.route === 'people'}
        <People {ds} />
      {:else}
        <About {ds} />
      {/if}
    {:catch err}
      <div class="container"><p>Could not load the dataset: {err.message}</p></div>
    {/await}
  </main>
  <Footer />
</div>

<style>
  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  main {
    flex: 1;
  }
  main.offset {
    padding-top: 72px;
  }
  .loading {
    padding: 160px 20px 80px;
    text-align: center;
  }
  .orbit {
    position: relative;
    width: 64px;
    height: 64px;
    margin: 0 auto 16px;
    border: 1px solid var(--line);
    border-radius: 50%;
  }
  .orbit::before {
    content: '';
    position: absolute;
    inset: 22px;
    border-radius: 50%;
    background: var(--accent);
  }
  .orbit span {
    position: absolute;
    top: -4px;
    left: 50%;
    width: 8px;
    height: 8px;
    margin-left: -4px;
    border-radius: 50%;
    background: var(--gold);
    transform-origin: 4px 36px;
    animation: spin 1.6s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>

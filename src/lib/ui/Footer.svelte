<script lang="ts">
  import { router } from '$lib/router.svelte';
</script>

<footer>
  <div class="container">
    <span>The Population of Space · a data explorer for the human presence beyond Earth.</span>
    <span>
      <a href={router.href('about')}>Methodology &amp; sources</a> · <a href={router.href('about')}>How to extend the data</a> · Photographs: NASA; China Manned Space Engineering Office (CC BY 4.0)
    </span>
  </div>
</footer>

<style>
  footer {
    margin-top: 64px;
    border-top: 1px solid var(--line);
    padding: 24px 0 32px;
    font-size: 0.82rem;
    color: var(--ink-3);
  }
  .container {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 24px;
    justify-content: space-between;
  }
</style>

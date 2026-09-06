<script lang="ts">
  // A labelled <select> for choosing a category (measure, dimension). Values within a
  // category use chips, so the two levels read differently.
  interface Option {
    id: string;
    label: string;
    hint?: string;
    disabled?: boolean;
  }
  interface Props {
    label: string;
    options: Option[];
    value: string;
    onchange: (id: string) => void;
  }
  let { label, options, value, onchange }: Props = $props();
  const selected = $derived(options.find((o) => o.id === value));
</script>

<fieldset>
  <legend class="label">{label}</legend>
  <div class="wrap">
    <select {value} aria-label={label} onchange={(e) => onchange((e.currentTarget as HTMLSelectElement).value)}>
      {#each options as o}
        <option value={o.id} disabled={o.disabled}>{o.label}</option>
      {/each}
    </select>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
  </div>
  {#if selected?.hint}
    <div class="hint">{selected.hint}</div>
  {/if}
</fieldset>

<style>
  fieldset {
    border: 0;
    padding: 0;
    margin: 0 0 20px;
    min-width: 0;
  }
  legend {
    padding: 0;
    margin-bottom: 8px;
  }
  .wrap {
    position: relative;
  }
  select {
    width: 100%;
    height: 40px;
    padding: 0 36px 0 12px;
    appearance: none;
    -webkit-appearance: none;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--line-strong);
    border-radius: 9px;
    color: var(--ink);
    font-weight: 500;
    cursor: pointer;
  }
  select:hover {
    border-color: var(--accent);
  }
  select:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }
  option {
    background: var(--bg-elev);
    color: var(--ink);
  }
  svg {
    position: absolute;
    right: 12px;
    top: 12px;
    color: var(--ink-3);
    pointer-events: none;
  }
  .hint {
    font-size: 0.78rem;
    color: var(--ink-3);
    margin-top: 6px;
    line-height: 1.4;
  }
  @media (max-width: 860px) {
    select {
      height: 44px;
    }
  }
</style>

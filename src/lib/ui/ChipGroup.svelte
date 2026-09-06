<script lang="ts">
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
    /** render as a single row of segments instead of wrapping chips */
    segmented?: boolean;
  }
  let { label, options, value, onchange, segmented = false }: Props = $props();
  const selected = $derived(options.find((o) => o.id === value));
</script>

<fieldset class:segmented>
  <legend class="label">{label}</legend>
  <div class="opts" role="radiogroup" aria-label={label}>
    {#each options as o}
      <button
        role="radio"
        aria-checked={o.id === value}
        class:on={o.id === value}
        disabled={o.disabled}
        title={o.hint}
        onclick={() => onchange(o.id)}>{o.label}</button
      >
    {/each}
  </div>
  {#if selected?.hint && !segmented}
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
  .opts {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  button {
    display: inline-flex;
    align-items: center;
    height: 34px;
    border: 1px solid var(--line-strong);
    background: transparent;
    border-radius: 999px;
    padding: 0 14px;
    font-size: 0.88rem;
    color: var(--ink-2);
    white-space: nowrap;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
  }
  button:hover:not(:disabled) {
    border-color: var(--accent);
    color: var(--ink);
  }
  button.on {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
    font-weight: 500;
  }
  button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .segmented .opts {
    display: inline-flex;
    gap: 0;
    border: 1px solid var(--line-strong);
    border-radius: 9px;
    overflow: hidden;
  }
  .segmented button {
    border: 0;
    border-radius: 0;
    border-right: 1px solid var(--line);
    padding: 0 11px;
    font-size: 0.84rem;
  }
  .segmented button:last-child {
    border-right: 0;
  }
  .segmented button.on {
    background: var(--accent-soft);
    color: #fff;
  }
  .hint {
    font-size: 0.78rem;
    color: var(--ink-3);
    margin-top: 6px;
    line-height: 1.4;
  }
  @media (max-width: 860px) {
    button {
      height: 38px;
    }
  }
</style>

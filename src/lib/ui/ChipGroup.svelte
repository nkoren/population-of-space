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
  <legend>{label}</legend>
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
    margin: 0 0 18px;
  }
  legend {
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--ink-3);
    padding: 0;
    margin-bottom: 7px;
  }
  .opts {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }
  button {
    border: 1px solid var(--line);
    background: var(--bg-elev);
    border-radius: 999px;
    padding: 4px 11px;
    font-size: 0.86rem;
    color: var(--ink-2);
    transition: background 0.15s, color 0.15s, border-color 0.15s;
    line-height: 1.4;
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
    border: 1px solid var(--line);
    border-radius: 8px;
    overflow: hidden;
  }
  .segmented button {
    border: 0;
    border-radius: 0;
    border-right: 1px solid var(--line);
  }
  .segmented button:last-child {
    border-right: 0;
  }
  .hint {
    font-size: 0.78rem;
    color: var(--ink-3);
    margin-top: 6px;
    line-height: 1.4;
  }
</style>

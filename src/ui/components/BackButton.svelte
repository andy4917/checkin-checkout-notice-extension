<script lang="ts">
  import * as MaterialIconModule from "./MaterialIcon.svelte";

  export let ariaLabel = "뒤로가기";
  export let buttonElement: HTMLButtonElement | null = null;
  export let className = "";
  export let disabled = false;
  export let label = "";
  export let onBack: () => void;

  const MaterialIcon = MaterialIconModule.default;

  $: resolvedAriaLabel = label ? `${label} 뒤로가기` : ariaLabel;
</script>

<button
  bind:this={buttonElement}
  class={className}
  type="button"
  aria-label={resolvedAriaLabel}
  disabled={disabled}
  onclick={onBack}
>
  <MaterialIcon name="arrow_back" size={20} />
  {#if label}
    <span>{label}</span>
  {/if}
</button>

<script lang="ts">
  import type { Language } from "../../types.js";

  export let languages: Array<{ id: Language; label: string }>;
  export let selectedLanguage: Language;
  export let isLanguageDisabled: (language: Language) => boolean = () => false;
  export let onSelectLanguage: (language: Language) => void;
</script>

<div class="language-control" role="group" aria-label="언어">
  <span>언어</span>
  <div class="language-segmented">
    {#each languages as lang}
      {@const disabled = isLanguageDisabled(lang.id)}
      <button
        class:active={selectedLanguage === lang.id}
        type="button"
        aria-pressed={selectedLanguage === lang.id}
        disabled={disabled}
        onclick={() => onSelectLanguage(lang.id)}
      >
        {lang.label}
      </button>
    {/each}
  </div>
</div>

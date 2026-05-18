<script lang="ts">
  import type { Language, PmsGuestRecord } from "../../types.js";
  import type { TemplateDefinition } from "../../catalog/template-types.js";
  import { resolveWorkRoomContext } from "../../domain/room-context.js";
  import * as LanguageSegmentedControlModule from "./LanguageSegmentedControl.svelte";

  const LanguageSegmentedControl = LanguageSegmentedControlModule.default;

  export let activeTemplates: TemplateDefinition[];
  export let languages: Array<{ id: Language; label: string }>;
  export let selectedLanguage: Language;
  export let selectedPmsRecord: PmsGuestRecord | null;
  export let showLanguageSelector: boolean;
  export let showRoomContext: boolean;
  export let showWingsStatus: boolean;
  export let wingsConnected: boolean;
  export let hasAnyTemplateForLanguage: (
    templates: readonly TemplateDefinition[],
    language: Language,
  ) => boolean;
  export let onSelectLanguage: (language: Language) => void;

  $: roomContext = resolveWorkRoomContext(selectedPmsRecord);
  $: hasHeaderContent = showRoomContext || showWingsStatus || showLanguageSelector;
</script>

{#if hasHeaderContent}
<section class="work-header">
  {#if showRoomContext}
    <div class="work-context-row">
      <div class:empty={!roomContext.selected} class="work-title-copy">
        {#if roomContext.selected}
          <h2>{roomContext.roomLabel}</h2>
        {/if}
      </div>
      {#if showWingsStatus}
        <div
          class:connected={wingsConnected}
          class="wings-status-pill"
          aria-label={wingsConnected ? "WINGS 연결됨" : "WINGS 연결 안됨"}
        >
          <i aria-hidden="true"></i>
          <span>WINGS</span>
        </div>
      {/if}
    </div>
  {:else if showWingsStatus}
    <div class="work-nav-row">
      <div
        class:connected={wingsConnected}
        class="wings-status-pill"
        aria-label={wingsConnected ? "WINGS 연결됨" : "WINGS 연결 안됨"}
      >
        <i aria-hidden="true"></i>
        <span>WINGS</span>
      </div>
    </div>
  {/if}

  {#if showLanguageSelector}
    <div class="work-controls">
      <LanguageSegmentedControl
        {languages}
        {selectedLanguage}
        isLanguageDisabled={(language) => !hasAnyTemplateForLanguage(activeTemplates, language)}
        onSelectLanguage={onSelectLanguage}
      />
    </div>

  {/if}
</section>
{/if}

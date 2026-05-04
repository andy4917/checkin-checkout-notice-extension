<script lang="ts">
  import type { Language } from "../../types.js";
  import type { MenuId, MenuItem } from "../../catalog/menu-routing.js";
  import type { TemplateDefinition } from "../../catalog/template-types.js";
  import * as LanguageSegmentedControlModule from "./LanguageSegmentedControl.svelte";
  import * as MaterialIconModule from "./MaterialIcon.svelte";

  const LanguageSegmentedControl = LanguageSegmentedControlModule.default;
  const MaterialIcon = MaterialIconModule.default;

  export let activeMenu: MenuId;
  export let activeTemplates: TemplateDefinition[];
  export let languages: Array<{ id: Language; label: string }>;
  export let navigationLocked: boolean;
  export let selectedLanguage: Language;
  export let selectedMenu: MenuItem | null;
  export let showWingsStatus: boolean;
  export let wingsConnected: boolean;
  export let hasAnyTemplateForLanguage: (
    templates: readonly TemplateDefinition[],
    language: Language,
  ) => boolean;
  export let onGoHome: () => void;
  export let onSelectLanguage: (language: Language) => void;

  $: workIconName = selectedMenu?.home?.icon || "design_services";
</script>

<section class="work-header">
  <div class="work-topbar">
    <button
      class="work-nav-button"
      type="button"
      aria-label="뒤로가기"
      disabled={navigationLocked}
      onclick={onGoHome}
    >
      <MaterialIcon name="arrow_back" size={20} />
    </button>
    <h1>{selectedMenu?.title}</h1>
    <button
      class="work-nav-button"
      type="button"
      aria-label="홈"
      disabled={navigationLocked}
      onclick={onGoHome}
    >
      <MaterialIcon name="home" size={20} />
    </button>
  </div>

  <div class="work-context-row">
    <span class="work-icon" aria-hidden="true">
      <MaterialIcon name={workIconName} size={22} filled />
    </span>
    <div class="work-title-copy">
      <h2>{selectedMenu?.title}</h2>
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
    {:else if activeMenu !== "SETTINGS" && activeMenu !== "OTA_RESERVATION_INPUT"}
      <div class="work-count" aria-label="템플릿 수">{activeTemplates.length}개</div>
    {/if}
  </div>

  {#if activeMenu !== "SETTINGS" && activeMenu !== "OTA_RESERVATION_INPUT"}
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

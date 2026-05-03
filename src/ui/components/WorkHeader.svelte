<script lang="ts">
  import type { Language } from "../../types.js";
  import type { MenuId, MenuItem, TemplateTab } from "../../catalog/menu-routing.js";
  import type { TemplateDefinition } from "../../catalog/template-types.js";

  export let activeMenu: MenuId;
  export let activeTabs: TemplateTab[];
  export let activeTemplates: TemplateDefinition[];
  export let languages: Array<{ id: Language; label: string }>;
  export let navigationLocked: boolean;
  export let selectedLanguage: Language;
  export let selectedMenu: MenuItem | null;
  export let selectedTabId: string;
  export let hasAnyTemplateForLanguage: (
    templates: readonly TemplateDefinition[],
    language: Language,
  ) => boolean;
  export let onGoHome: () => void;
  export let onLanguageChange: (event: Event) => void;
  export let onSelectTab: (tabId: string) => void;
</script>

<section class="work-header">
  <div class="work-title-row">
    <span class="work-icon" aria-hidden="true">{selectedMenu?.icon}</span>
    <div class="work-title-copy">
      <p class="eyebrow">선택 메뉴</p>
      <h1>{selectedMenu?.title}</h1>
    </div>
    <button
      class="menu-return-button"
      type="button"
      disabled={navigationLocked}
      onclick={onGoHome}
    >
      메뉴
    </button>
  </div>

  {#if activeMenu !== "SETTINGS" && activeMenu !== "OTA_RESERVATION_INPUT"}
    <div class="work-controls">
      <label>
        <span>언어</span>
        <select value={selectedLanguage} onchange={onLanguageChange}>
          {#each languages as lang}
            <option value={lang.id} disabled={!hasAnyTemplateForLanguage(activeTemplates, lang.id)}>
              {lang.label}
            </option>
          {/each}
        </select>
      </label>
      <div class="work-count" aria-label="템플릿 수">{activeTemplates.length}개</div>
    </div>

    <div class="tab-bar" role="tablist" aria-label="하위 메뉴">
      {#each activeTabs as tab}
        <button
          class:active={selectedTabId === tab.id}
          type="button"
          role="tab"
          aria-selected={selectedTabId === tab.id}
          onclick={() => onSelectTab(tab.id)}
        >
          {tab.label}
        </button>
      {/each}
    </div>
  {/if}
</section>

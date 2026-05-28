<script lang="ts">
  import { flushSync, onDestroy, tick } from "svelte";
  import type {
    HomeBottomNavigationItem,
    HomeNavigationLabels,
    HomeNavigationGroup,
    HomeNavigationItem,
    MenuId,
  } from "../../catalog/menu-routing.js";
  import type { UnifiedTemplateDefinition } from "../../catalog/template-types.js";
  import type { Language } from "../../types.js";
  import * as MaterialIconModule from "./MaterialIcon.svelte";

  const MaterialIcon = MaterialIconModule.default;
  const languageOptions: readonly Language[] = Object.freeze(["KO", "EN", "JP", "CN"]);

  export let bottomItems: readonly HomeBottomNavigationItem[];
  export let copiedTemplateId: string | null;
  export let groups: readonly HomeNavigationGroup[];
  export let inlineTemplatesByItemId: Readonly<Record<string, readonly UnifiedTemplateDefinition[]>>;
  export let labels: HomeNavigationLabels;
  export let initialGroupId = "";
  export let loading: boolean;
  export let languageChanging: boolean;
  export let selectedLanguage: Language;
  export let selectedBranchReady: boolean;
  export let onCopyTemplate: (target: HomeNavigationItem, templateId: string) => void;
  export let onSelectLanguage: (language: Language) => void;
  export let onOpenMenu: (target: MenuId | HomeNavigationItem) => void;
  export let onOpenBottomItem: (item: HomeBottomNavigationItem) => void;

  let activeGroupId = "";
  let renderedDetailGroupId = "";
  let initialGroupApplied = false;
  let lastOpenedGroupButton: HTMLButtonElement | null = null;
  let motionDirection: "forward" | "backward" | "replace" = "replace";
  let detailBackButton: HTMLButtonElement | null = null;
  let releaseDetailTimer: ReturnType<typeof setTimeout> | null = null;
  type ActionValue<T> = T | (() => T);

  function languageLabel(language: Language): string {
    return { KO: "KR", EN: "EN", JP: "JP", CN: "CH" }[language];
  }

  $: activeGroup = groups.find((group) => group.id === activeGroupId) || null;
  $: renderedDetailGroup =
    groups.find((group) => group.id === (activeGroupId || renderedDetailGroupId)) || null;
  $: activeSubmenuId = renderedDetailGroup ? getSubmenuPanelId(renderedDetailGroup.id) : undefined;
  $: if (!initialGroupApplied && initialGroupId && groups.some((group) => group.id === initialGroupId)) {
    activeGroupId = initialGroupId;
    renderedDetailGroupId = initialGroupId;
    motionDirection = "replace";
    initialGroupApplied = true;
  }

  onDestroy(() => {
    clearReleaseDetailTimer();
  });

  async function openGroup(groupId: string, triggerButton: HTMLButtonElement) {
    if (activeGroupId === groupId) {
      return;
    }

    clearReleaseDetailTimer();
    lastOpenedGroupButton = triggerButton;
    renderedDetailGroupId = groupId;
    activeGroupId = groupId;
    motionDirection = "forward";
    await tick();
    detailBackButton?.focus({ preventScroll: true });
  }

  async function goRoot() {
    clearReleaseDetailTimer();
    renderedDetailGroupId = activeGroupId;
    activeGroupId = "";
    motionDirection = "backward";
    releaseDetailTimer = setTimeout(() => {
      renderedDetailGroupId = "";
      releaseDetailTimer = null;
    }, 300);
    await tick();
    lastOpenedGroupButton?.focus({ preventScroll: true });
  }

  function openMenu(target: MenuId | HomeNavigationItem) {
    onOpenMenu(target);
  }

  function resolveActionValue<T>(value: ActionValue<T>): T {
    return typeof value === "function" ? (value as () => T)() : value;
  }

  function copyTemplateEvents(
    node: HTMLButtonElement,
    payload: ActionValue<{ item: HomeNavigationItem; templateId: string }>,
  ) {
    let currentPayload = payload;
    const handleClick = () => {
      const nextPayload = resolveActionValue(currentPayload);
      onCopyTemplate(nextPayload.item, nextPayload.templateId);
      flushSync();
    };
    node.onclick = handleClick;

    return {
      update(nextPayload: ActionValue<{ item: HomeNavigationItem; templateId: string }>) {
        currentPayload = nextPayload;
      },
      destroy() {
        node.onclick = null;
      },
    };
  }

  function openBottomItem(item: HomeBottomNavigationItem) {
    if (item.menuId) {
      onOpenMenu(item.menuId);
      return;
    }
    onOpenBottomItem(item);
  }

  function getSubmenuPanelId(groupId: string): string {
    return `home-submenu-${groupId}`;
  }

  function getSubmenuTitleId(groupId: string): string {
    return `home-submenu-title-${groupId}`;
  }

  function clearReleaseDetailTimer() {
    if (!releaseDetailTimer) {
      return;
    }

    clearTimeout(releaseDetailTimer);
    releaseDetailTimer = null;
  }

  function isAccordionGroup(group: HomeNavigationGroup | null): boolean {
    return group?.selectionMode === "accordion";
  }

  function getInlineTemplates(item: HomeNavigationItem): readonly UnifiedTemplateDefinition[] {
    return inlineTemplatesByItemId[item.id] || [];
  }

  function getRenderedDetailItems(group: HomeNavigationGroup): readonly HomeNavigationItem[] {
    if (!isAccordionGroup(group)) return group.items;
    const templateItems = group.items.filter((item) => getInlineTemplates(item).length > 0);
    return [
      ...templateItems.filter((item) => getInlineTemplates(item).length > 1),
      ...templateItems.filter((item) => getInlineTemplates(item).length === 1),
    ];
  }

  function shouldGroupInlineTemplates(item: HomeNavigationItem): boolean {
    return getInlineTemplates(item).length > 1;
  }

  function getDirectInlineTemplate(item: HomeNavigationItem): UnifiedTemplateDefinition | null {
    const templates = getInlineTemplates(item);
    return templates.length === 1 ? templates[0] : null;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key !== "Escape" || !activeGroup) {
      return;
    }

    event.preventDefault();
    void goRoot();
  }

</script>

<section class="home-surface" aria-label={labels.rootLabel}>
  <div
    class:backward={motionDirection === "backward"}
    class:detail-retained={!activeGroup && renderedDetailGroup}
    class:replace={motionDirection === "replace"}
    class:submenu-active={activeGroup}
    class="home-navigation-viewport"
    data-motion-direction={motionDirection}
  >
    <div class="home-navigation-track">
      <nav
        class="home-navigation-panel root-panel"
        aria-hidden={Boolean(activeGroup)}
        aria-label={labels.rootMenuLabel}
      >
        {#each groups as group}
          <button
            class="home-nav-root-item"
            type="button"
            aria-label={labels.openSubmenuLabel(group.title)}
            aria-haspopup="true"
            aria-expanded={activeGroup?.id === group.id}
            aria-controls={getSubmenuPanelId(group.id)}
            tabindex={activeGroup ? -1 : 0}
            onclick={(event) => openGroup(group.id, event.currentTarget)}
          >
            <span class="home-nav-icon" aria-hidden="true">
              <MaterialIcon name={group.icon} size={22} />
            </span>
            <span class="home-nav-label">
              <span class="home-nav-title-row">
                <span class="interactive-label">{group.title}</span>
              </span>
            </span>
            <b aria-hidden="true">
              <MaterialIcon name="chevron_right" size={20} />
            </b>
          </button>
        {/each}
      </nav>

      <nav
        class="home-navigation-panel detail-panel"
        id={activeSubmenuId}
        aria-hidden={!activeGroup}
        aria-label={renderedDetailGroup?.title || labels.defaultSubmenuLabel}
        aria-labelledby={renderedDetailGroup ? getSubmenuTitleId(renderedDetailGroup.id) : undefined}
      >
        {#if renderedDetailGroup}
          <button
            bind:this={detailBackButton}
            class="home-nav-back"
            type="button"
            aria-label={labels.backToRootLabel}
            onkeydown={handleKeydown}
            onclick={goRoot}
          >
            <MaterialIcon name="arrow_back" size={18} />
            <span id={getSubmenuTitleId(renderedDetailGroup.id)}>{renderedDetailGroup.title}</span>
          </button>
          {#if isAccordionGroup(renderedDetailGroup)}
            <div
              class:loading={languageChanging}
              class="home-language-strip"
              style={`--active-index: ${languageOptions.indexOf(selectedLanguage)}`}
              aria-label="템플릿 언어"
              aria-busy={languageChanging}
            >
              {#each languageOptions as language}
                <button
                  class:active={selectedLanguage === language}
                  type="button"
                  disabled={languageChanging}
                  aria-pressed={selectedLanguage === language}
                  onclick={() => onSelectLanguage(language)}
                >
                  {languageLabel(language)}
                </button>
              {/each}
            </div>
          {/if}
          <div class="home-submenu-list">
            {#each getRenderedDetailItems(renderedDetailGroup) as item}
              {#if isAccordionGroup(renderedDetailGroup) && shouldGroupInlineTemplates(item)}
                <details class="home-submenu-entry">
                  <summary class="home-submenu-item accordion-trigger" tabindex={activeGroup ? 0 : -1} onkeydown={handleKeydown}>
                    <span class="home-nav-icon" aria-hidden="true">
                      <MaterialIcon name={item.icon} size={20} />
                    </span>
                    <span class="home-nav-label">
                      <span class="home-nav-title-row">
                        <span class="interactive-label">{item.title}</span>
                        {#if item.badgeLabel}
                          <span class="home-nav-badge">{item.badgeLabel}</span>
                        {/if}
                      </span>
                    </span>
                    <b aria-hidden="true">
                      <MaterialIcon name="expand_more" size={18} />
                    </b>
                  </summary>
                  <div class="home-template-accordion" role="list">
                    {#if getInlineTemplates(item).length > 0}
                      {#each getInlineTemplates(item) as template}
                        <article class="home-template-row" role="listitem">
                          <div>
                            <strong>{template.title}</strong>
                          </div>
                          <button
                            class="home-template-copy"
                            type="button"
                            aria-label={copiedTemplateId === template.id ? `${template.title} 복사됨` : `${template.title} 복사`}
                            title={copiedTemplateId === template.id ? "복사됨" : "복사"}
                            disabled={loading}
                            use:copyTemplateEvents={{ item, templateId: template.id }}
                          >
                            <MaterialIcon name={copiedTemplateId === template.id ? "check" : "content_copy"} size={16} />
                          </button>
                        </article>
                      {/each}
                    {:else}
                      <p class="home-template-empty">현재 등록된 템플릿 없음</p>
                    {/if}
                  </div>
                </details>
              {:else if isAccordionGroup(renderedDetailGroup) && getDirectInlineTemplate(item)}
                {@const template = getDirectInlineTemplate(item)}
                {#if template}
                  <article class="home-submenu-entry" role="listitem">
                    <div class="home-submenu-item home-template-row-direct">
                      <span class="home-nav-icon" aria-hidden="true">
                        <MaterialIcon name={item.icon} size={20} />
                      </span>
                      <span class="home-nav-label">
                        <span class="home-nav-title-row">
                          <span class="interactive-label">{template.title}</span>
                        </span>
                      </span>
                      <button
                        class="home-template-copy"
                        type="button"
                        aria-label={copiedTemplateId === template.id ? `${template.title} 복사됨` : `${template.title} 복사`}
                        title={copiedTemplateId === template.id ? "복사됨" : "복사"}
                        disabled={loading}
                        use:copyTemplateEvents={{ item, templateId: template.id }}
                      >
                        <MaterialIcon name={copiedTemplateId === template.id ? "check" : "content_copy"} size={16} />
                      </button>
                    </div>
                  </article>
                {/if}
              {:else}
                <article class="home-submenu-entry">
                  <button
                    class="home-submenu-item"
                    type="button"
                    tabindex={activeGroup ? 0 : -1}
                    onkeydown={handleKeydown}
                    onclick={() => openMenu(item)}
                  >
                    <span class="home-nav-icon" aria-hidden="true">
                      <MaterialIcon name={item.icon} size={20} />
                    </span>
                    <span class="home-nav-label">
                      <span class="home-nav-title-row">
                        <span class="interactive-label">{item.title}</span>
                        {#if item.badgeLabel}
                          <span class="home-nav-badge">{item.badgeLabel}</span>
                        {/if}
                      </span>
                    </span>
                    <b aria-hidden="true">
                      <MaterialIcon name="chevron_right" size={18} />
                    </b>
                  </button>
                </article>
              {/if}
            {/each}
          </div>
        {/if}
      </nav>
    </div>
  </div>

  <nav class="home-fixed-bottom-bar" aria-label={labels.bottomMenuLabel}>
    {#each bottomItems as item}
      {#if item.menuId || item.action}
        <button type="button" disabled={Boolean(item.action) && !selectedBranchReady} onclick={() => openBottomItem(item)}>
          <MaterialIcon name={item.icon} size={20} />
          <span>{item.title}</span>
        </button>
      {:else}
        <button type="button" aria-disabled="true" disabled>
          <MaterialIcon name={item.icon} size={20} />
          <span>{item.title}</span>
        </button>
      {/if}
    {/each}
  </nav>
</section>

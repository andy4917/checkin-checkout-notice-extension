<script lang="ts">
  import { tick } from "svelte";
  import type {
    HomeBottomNavigationItem,
    HomeNavigationLabels,
    HomeNavigationGroup,
    MenuId,
  } from "../../catalog/menu-routing.js";
  import * as MaterialIconModule from "./MaterialIcon.svelte";

  const MaterialIcon = MaterialIconModule.default;

  export let bottomItems: readonly HomeBottomNavigationItem[];
  export let groups: readonly HomeNavigationGroup[];
  export let labels: HomeNavigationLabels;
  export let onOpenMenu: (menuId: MenuId) => void;

  let activeGroupId = "";
  let lastOpenedGroupButton: HTMLButtonElement | null = null;
  let motionDirection: "forward" | "backward" | "replace" = "replace";
  let detailBackButton: HTMLButtonElement | null = null;

  $: activeGroup = groups.find((group) => group.id === activeGroupId) || null;
  $: activeSubmenuId = activeGroup ? getSubmenuPanelId(activeGroup.id) : undefined;

  async function openGroup(groupId: string, triggerButton: HTMLButtonElement) {
    if (activeGroupId === groupId) {
      return;
    }

    lastOpenedGroupButton = triggerButton;
    activeGroupId = groupId;
    motionDirection = "forward";
    await tick();
    detailBackButton?.focus({ preventScroll: true });
  }

  async function goRoot() {
    activeGroupId = "";
    motionDirection = "backward";
    await tick();
    lastOpenedGroupButton?.focus({ preventScroll: true });
  }

  function openMenu(menuId: MenuId) {
    onOpenMenu(menuId);
  }

  function getSubmenuPanelId(groupId: string): string {
    return `home-submenu-${groupId}`;
  }

  function getSubmenuTitleId(groupId: string): string {
    return `home-submenu-title-${groupId}`;
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
        aria-label={activeGroup?.title || labels.defaultSubmenuLabel}
        aria-labelledby={activeGroup ? getSubmenuTitleId(activeGroup.id) : undefined}
      >
        {#if activeGroup}
          <button
            bind:this={detailBackButton}
            class="home-nav-back"
            type="button"
            aria-label={labels.backToRootLabel}
            onkeydown={handleKeydown}
            onclick={goRoot}
          >
            <MaterialIcon name="arrow_back" size={18} />
            <span id={getSubmenuTitleId(activeGroup.id)}>{activeGroup.title}</span>
          </button>
          <div class="home-submenu-list">
            {#each activeGroup.items as item}
              <button
                class="home-submenu-item"
                type="button"
                tabindex={activeGroup ? 0 : -1}
                onkeydown={handleKeydown}
                onclick={() => openMenu(item.menuId)}
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
            {/each}
          </div>
        {/if}
      </nav>
    </div>
  </div>

  <nav class="home-fixed-bottom-bar" aria-label={labels.bottomMenuLabel}>
    {#each bottomItems as item}
      {#if item.menuId}
        <button type="button" onclick={() => openMenu(item.menuId)}>
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

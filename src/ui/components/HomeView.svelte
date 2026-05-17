<script lang="ts">
  import { tick } from "svelte";
  import type {
    HomeBottomNavigationItem,
    HomeNavigationGroup,
    MenuId,
  } from "../../catalog/menu-routing.js";
  import * as MaterialIconModule from "./MaterialIcon.svelte";

  const MaterialIcon = MaterialIconModule.default;

  export let bottomItems: readonly HomeBottomNavigationItem[];
  export let groups: readonly HomeNavigationGroup[];
  export let onOpenMenu: (menuId: MenuId) => void;

  let activeGroupId = "";
  let lastOpenedGroupButton: HTMLButtonElement | null = null;
  let motionDirection: "forward" | "backward" | "replace" = "replace";
  let detailBackButton: HTMLButtonElement | null = null;

  $: activeGroup = groups.find((group) => group.id === activeGroupId) || null;

  async function openGroup(groupId: string, triggerButton: HTMLButtonElement) {
    if (activeGroupId === groupId) {
      return;
    }

    lastOpenedGroupButton = triggerButton;
    activeGroupId = groupId;
    motionDirection = "forward";
    await tick();
    detailBackButton?.focus();
  }

  async function goRoot() {
    activeGroupId = "";
    motionDirection = "backward";
    await tick();
    lastOpenedGroupButton?.focus();
  }

  function openMenu(menuId: MenuId) {
    onOpenMenu(menuId);
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key !== "Escape" || !activeGroup) {
      return;
    }

    event.preventDefault();
    void goRoot();
  }
</script>

<section class="home-surface" aria-label="홈 메뉴">
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
        aria-label="업무 그룹"
      >
        {#each groups as group}
          <button
            class="home-nav-root-item"
            type="button"
            aria-label={`${group.title} 메뉴 열기`}
            tabindex={activeGroup ? -1 : 0}
            onclick={(event) => openGroup(group.id, event.currentTarget)}
          >
            <span class="home-nav-icon" aria-hidden="true">
              <MaterialIcon name={group.icon} size={22} />
            </span>
            <span>{group.title}</span>
            <b aria-hidden="true">
              <MaterialIcon name="chevron_right" size={20} />
            </b>
          </button>
        {/each}
      </nav>

      <nav
        class="home-navigation-panel detail-panel"
        aria-hidden={!activeGroup}
        aria-label={activeGroup?.title || "하위 메뉴"}
      >
        {#if activeGroup}
          <button
            bind:this={detailBackButton}
            class="home-nav-back"
            type="button"
            onkeydown={handleKeydown}
            onclick={goRoot}
          >
            <MaterialIcon name="arrow_back" size={18} />
            <span>{activeGroup.title}</span>
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
                <span>{item.title}</span>
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

  <nav class="home-fixed-bottom-bar" aria-label="하단 업무 메뉴">
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

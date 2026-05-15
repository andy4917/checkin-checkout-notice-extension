<script lang="ts">
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
  let motionDirection: "forward" | "back" = "forward";

  $: activeGroup = groups.find((group) => group.id === activeGroupId) || null;

  function openGroup(groupId: string) {
    activeGroupId = groupId;
    motionDirection = "forward";
  }

  function goRoot() {
    activeGroupId = "";
    motionDirection = "back";
  }

  function openMenu(menuId: MenuId) {
    onOpenMenu(menuId);
  }
</script>

<section class="home-surface" aria-label="홈 메뉴">
  <div
    class:back={motionDirection === "back"}
    class:submenu-active={activeGroup}
    class="home-navigation-viewport"
  >
    <div class="home-navigation-track">
      <nav class="home-navigation-panel root-panel" aria-label="업무 그룹">
        {#each groups as group}
          <button
            class="home-nav-root-item"
            type="button"
            aria-label={`${group.title} 메뉴 열기`}
            onclick={() => openGroup(group.id)}
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

      <nav class="home-navigation-panel detail-panel" aria-label={activeGroup?.title || "하위 메뉴"}>
        {#if activeGroup}
          <button class="home-nav-back" type="button" onclick={goRoot}>
            <MaterialIcon name="arrow_back" size={18} />
            <span>{activeGroup.title}</span>
          </button>
          <div class="home-submenu-list">
            {#each activeGroup.items as item}
              <button
                class="home-submenu-item"
                type="button"
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

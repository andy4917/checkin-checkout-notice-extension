<script lang="ts">
  import type { HomeMenuSection, HomeQuickAction, MenuId } from "../../catalog/menu-routing.js";
  import * as HomeIconModule from "./HomeIcon.svelte";
  import type { HomeIconName } from "./HomeIcon.svelte";

  const HomeIcon = HomeIconModule.default;

  export let footerActions: readonly HomeQuickAction[];
  export let sections: readonly HomeMenuSection[];
  export let onOpenMenu: (menuId: MenuId) => void;

  function toHomeIconName(icon: string): HomeIconName {
    return icon as HomeIconName;
  }
</script>

<nav class="home-surface" aria-label="홈 메뉴">
  {#each sections as section}
    {#if section.id === "primary"}
      <section class="priority-menu" aria-label={section.title}>
        {#each section.items as menu}
          <button
            class:primary={menu.home?.tone === "primary"}
            class="priority-card"
            type="button"
            onclick={() => onOpenMenu(menu.id)}
          >
            <span class="priority-icon" aria-hidden="true">
              <HomeIcon name={toHomeIconName(menu.home?.icon || menu.icon)} size={32} strokeWidth={2.35} />
            </span>
            <span class="menu-text">
              <strong>{menu.home?.title || menu.title}</strong>
              <small>{menu.home?.description || menu.description}</small>
            </span>
            <span class="menu-arrow" aria-hidden="true">
              <HomeIcon name="chevron-right" size={24} strokeWidth={2.6} />
            </span>
          </button>
        {/each}
      </section>
    {:else}
      <section class="home-menu-section" aria-label={section.title}>
        <h2>{section.title}</h2>
        <div class="home-list-card">
          {#each section.items as menu}
            <button type="button" onclick={() => onOpenMenu(menu.id)}>
              <span class="list-icon" aria-hidden="true">
                <HomeIcon name={toHomeIconName(menu.home?.icon || menu.icon)} size={22} strokeWidth={2} />
              </span>
              <span>{menu.home?.title || menu.title}</span>
              <b aria-hidden="true">
                <HomeIcon name="chevron-right" size={20} strokeWidth={2.6} />
              </b>
            </button>
          {/each}
        </div>
      </section>
    {/if}
  {/each}
</nav>

<nav class="home-bottom-bar" aria-label="빠른 실행">
  {#each footerActions as action}
    <button type="button" onclick={() => action.menuId && onOpenMenu(action.menuId)}>
      <span aria-hidden="true">
        <HomeIcon name={toHomeIconName(action.icon)} size={24} strokeWidth={2.1} />
      </span>
      <strong>{action.label}</strong>
    </button>
  {/each}
</nav>

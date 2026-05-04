<script lang="ts">
  import type { HomeMenuSection, MenuId } from "../../catalog/menu-routing.js";
  import * as MaterialIconModule from "./MaterialIcon.svelte";

  const MaterialIcon = MaterialIconModule.default;

  export let sections: readonly HomeMenuSection[];
  export let onOpenMenu: (menuId: MenuId) => void;

  function openMenu(menuId: MenuId) {
    onOpenMenu(menuId);
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
            onclick={() => openMenu(menu.id)}
          >
            <span class="priority-icon" aria-hidden="true">
              <MaterialIcon name={menu.home?.icon || menu.icon} size={32} />
            </span>
            <span class="menu-text">
              <strong>{menu.home?.title || menu.title}</strong>
              <small>{menu.home?.description || menu.description}</small>
            </span>
            <span class="menu-arrow" aria-hidden="true">
              <MaterialIcon name="chevron_right" size={24} />
            </span>
          </button>
        {/each}
      </section>
    {:else}
      <section class="home-menu-section" aria-label={section.title}>
        <h2>{section.title}</h2>
        <div class="home-list-stack">
          {#each section.items as menu}
            <button
              class="home-list-item"
              type="button"
              onclick={() => openMenu(menu.id)}
            >
              <span class="list-icon" aria-hidden="true">
                <MaterialIcon name={menu.home?.icon || menu.icon} size={20} />
              </span>
              <span>{menu.home?.title || menu.title}</span>
              <b aria-hidden="true">
                <MaterialIcon name="chevron_right" size={18} />
              </b>
            </button>
          {/each}
        </div>
      </section>
    {/if}
  {/each}
</nav>

<script lang="ts">
  import type { MenuGroup, MenuId, MenuItem } from "../../catalog/menu-routing.js";

  export let groups: readonly MenuGroup[];
  export let settingsMenu: MenuItem;
  export let onOpenMenu: (menuId: MenuId) => void;
</script>

<nav class="menu-stack" aria-label="메뉴">
  {#each groups as group}
    <section class="menu-group" aria-label={group.title}>
      <h2>{group.title}</h2>
      <div class="menu-grid">
        {#each group.items as menu}
          <button class="menu-button" type="button" onclick={() => onOpenMenu(menu.id)}>
            <span class="menu-icon" aria-hidden="true">{menu.icon}</span>
            <span class="menu-text">
              <strong>{menu.title}</strong>
              <small>{menu.description}</small>
            </span>
          </button>
        {/each}
      </div>
    </section>
  {/each}
</nav>

<section class="settings-entry" aria-label="설정">
  <button class="settings-menu-button" type="button" onclick={() => onOpenMenu(settingsMenu.id)}>
    <span class="menu-icon" aria-hidden="true">{settingsMenu.icon}</span>
    <span class="menu-text">
      <strong>{settingsMenu.title}</strong>
      <small>{settingsMenu.description}</small>
    </span>
  </button>
</section>

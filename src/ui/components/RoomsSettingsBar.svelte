<script lang="ts">
  import type { HomeQuickAction, MenuId } from "../../catalog/menu-routing.js";
  import * as MaterialIconModule from "./MaterialIcon.svelte";

  const MaterialIcon = MaterialIconModule.default;

  export let footerActions: readonly HomeQuickAction[];
  export let onOpenMenu: (menuId: MenuId) => void;

  let bottomSheetOpen = false;
  let selectedFooterAction: HomeQuickAction | null = null;

  $: footerActionTitle = selectedFooterAction?.label || "빠른 실행";

  function selectFooterAction(action: HomeQuickAction) {
    selectedFooterAction = action;
  }

  function closeBottomSheet() {
    bottomSheetOpen = false;
    selectedFooterAction = null;
  }

  function confirmFooterAction() {
    if (!selectedFooterAction) return;
    onOpenMenu(selectedFooterAction.menuId);
    closeBottomSheet();
  }
</script>

<button
  class:open={bottomSheetOpen}
  class="home-bottom-toggle"
  type="button"
  aria-haspopup="dialog"
  aria-expanded={bottomSheetOpen}
  onclick={() => (bottomSheetOpen = !bottomSheetOpen)}
>
  <span aria-hidden="true">
    <MaterialIcon name={bottomSheetOpen ? "expand_more" : "menu_book"} size={20} />
  </span>
  <strong>Rooms & Settings</strong>
</button>

<div
  class:open={bottomSheetOpen}
  class="ui-scrim subtle home-bottom-scrim"
  role="presentation"
  onclick={closeBottomSheet}
></div>
<div
  class:open={bottomSheetOpen}
  class="home-bottom-sheet"
  role="dialog"
  aria-modal={bottomSheetOpen}
  aria-hidden={!bottomSheetOpen}
  aria-label="Rooms & Settings"
>
  <div class="sheet-handle" aria-hidden="true"></div>
  <header class="sheet-header home-sheet-header">
    <strong>Rooms & Settings</strong>
  </header>

  <nav class="home-bottom-action-list" aria-label="Rooms & Settings 메뉴">
    {#each footerActions as action}
      <button
        class:selected={selectedFooterAction?.id === action.id}
        type="button"
        aria-pressed={selectedFooterAction?.id === action.id}
        tabindex={bottomSheetOpen ? 0 : -1}
        onclick={() => selectFooterAction(action)}
      >
        <span class="action-icon" aria-hidden="true">
          <MaterialIcon name={action.icon} size={22} />
        </span>
        <strong>{action.label}</strong>
      </button>
    {/each}
  </nav>

  {#if selectedFooterAction}
    <section class="home-action-popover" aria-label={`${footerActionTitle} 조정`}>
      <div>
        <strong>{footerActionTitle}</strong>
        <span>메뉴 열기</span>
      </div>
      <button
        type="button"
        tabindex={bottomSheetOpen ? 0 : -1}
        onclick={confirmFooterAction}
      >
        열기
      </button>
    </section>
  {/if}
</div>

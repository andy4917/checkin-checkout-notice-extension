<script lang="ts">
  import type { MenuId, RoomsSettingsCommandId } from "../../catalog/menu-routing.js";
  import type { ResolvedRoomsSettingsAction } from "../rooms-settings-actions.js";
  import * as MaterialIconModule from "./MaterialIcon.svelte";

  const MaterialIcon = MaterialIconModule.default;

  export let footerActions: readonly ResolvedRoomsSettingsAction[];
  export let onOpenMenu: (menuId: MenuId) => void;
  export let onRunCommand: (commandId: RoomsSettingsCommandId) => void | Promise<void>;

  let bottomSheetOpen = false;
  let selectedFooterAction: ResolvedRoomsSettingsAction | null = null;

  $: footerActionTitle = selectedFooterAction?.label || "빠른 실행";
  $: footerActionDetail = selectedFooterAction?.disabledReason || selectedFooterAction?.detailLabel || "";

  function selectFooterAction(action: ResolvedRoomsSettingsAction) {
    selectedFooterAction = action;
  }

  function closeBottomSheet() {
    bottomSheetOpen = false;
    selectedFooterAction = null;
  }

  function confirmFooterAction() {
    if (!selectedFooterAction || !selectedFooterAction.enabled) return;
    if (selectedFooterAction.kind === "menu") {
      onOpenMenu(selectedFooterAction.menuId);
      closeBottomSheet();
      return;
    }

    void onRunCommand(selectedFooterAction.commandId);
    closeBottomSheet();
  }
</script>

<button
  class:hidden={bottomSheetOpen}
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
        class:disabled={!action.enabled}
        type="button"
        aria-pressed={selectedFooterAction?.id === action.id}
        aria-disabled={!action.enabled}
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
        <span>{footerActionDetail}</span>
      </div>
      <button
        type="button"
        disabled={!selectedFooterAction.enabled}
        tabindex={bottomSheetOpen ? 0 : -1}
        onclick={confirmFooterAction}
      >
        {selectedFooterAction.confirmLabel}
      </button>
    </section>
  {/if}
</div>

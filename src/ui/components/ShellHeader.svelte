<script lang="ts">
  import type { BranchId, PmsGuestRecord } from "../../types.js";
  import type { MenuId } from "../../catalog/menu-routing.js";
  import * as HomeIconModule from "./HomeIcon.svelte";

  export let activeMenu: MenuId | null;
  export let branchOptions: Array<{
    id: BranchId;
    label: string;
    headerLabel?: string;
    locationLabel?: string;
  }>;
  export let navigationLocked: boolean;
  export let selectedBranchId: BranchId | "";
  export let selectedPmsRecord: PmsGuestRecord | null;
  export let onBack: () => void;
  export let onBranchChange: (event: Event) => void;

  const HomeIcon = HomeIconModule.default;
  const logoUrl = new URL("../../assets/logo.png", import.meta.url).href;
  let branchMenuOpen = false;

  $: selectedBranch = branchOptions.find((branch) => branch.id === selectedBranchId) || null;
  $: selectedBranchHeaderLabel = selectedBranch?.headerLabel || selectedBranch?.label || "Select branch";
  $: headerDate = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  function toggleBranchMenu() {
    if (navigationLocked) return;
    branchMenuOpen = !branchMenuOpen;
  }

  function chooseBranch(branchId: BranchId) {
    onBranchChange({ target: { value: branchId } } as unknown as Event);
    branchMenuOpen = false;
  }
</script>

<header class="app-header">
  {#if activeMenu !== null}
    <button
      class="icon-button"
      type="button"
      aria-label="뒤로가기"
      title="뒤로가기"
      disabled={navigationLocked}
      onclick={onBack}
    >
      ‹
    </button>
  {/if}

  <div class="header-left-lockup">
    <img class="brand-logo" src={logoUrl} alt="UH Suite" />

    <div class="branch-selector">
      <button
        class:unselected={!selectedBranch}
        class="branch-trigger"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={branchMenuOpen}
        disabled={navigationLocked}
        onclick={toggleBranchMenu}
      >
        <span>{selectedBranchHeaderLabel}</span>
        <span class="branch-chevron" aria-hidden="true">
          <HomeIcon name="chevron-down" size={18} strokeWidth={2.3} />
        </span>
      </button>

      {#if branchMenuOpen}
        <div class="branch-menu" role="listbox" aria-label="지점 선택">
          {#each branchOptions as branch}
            <button
              class:active={selectedBranchId === branch.id}
              type="button"
              role="option"
              aria-selected={selectedBranchId === branch.id}
              onclick={() => chooseBranch(branch.id)}
            >
              <span>
                <strong>{branch.headerLabel || branch.label}</strong>
                {#if branch.locationLabel}
                  <small>{branch.locationLabel}</small>
                {/if}
              </span>
              {#if selectedBranchId === branch.id}
                <b aria-hidden="true"><HomeIcon name="check" size={24} strokeWidth={2.4} /></b>
              {/if}
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <div class="header-room-slot" aria-label="선택 객실">
    {#if activeMenu !== null && selectedPmsRecord}
      <strong>{selectedPmsRecord.displayRoom || selectedPmsRecord.roomNo}</strong>
      {#if selectedPmsRecord.guestName}
        <span>{selectedPmsRecord.guestName}</span>
      {/if}
    {/if}
  </div>

  <div class="header-date" aria-label="오늘 날짜">
    <span>{headerDate}</span>
  </div>
</header>

<script lang="ts">
  import type { BranchId, PmsGuestRecord } from "../../types.js";
  import type { MenuId } from "../../catalog/menu-routing.js";

  export let activeMenu: MenuId | null;
  export let branchOptions: Array<{ id: BranchId; label: string; locationLabel?: string }>;
  export let navigationLocked: boolean;
  export let selectedBranchId: BranchId | "";
  export let selectedPmsRecord: PmsGuestRecord | null;
  export let onBack: () => void;
  export let onBranchChange: (event: Event) => void;

  const logoUrl = new URL("../../assets/logo.png", import.meta.url).href;
  let branchMenuOpen = false;

  $: selectedBranch = branchOptions.find((branch) => branch.id === selectedBranchId) || null;
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

  <div class="brand-lockup">
    <img class="brand-logo" src={logoUrl} alt="UH Suite" />
  </div>

  <div class="branch-selector">
    <button
      class="branch-trigger"
      type="button"
      aria-haspopup="listbox"
      aria-expanded={branchMenuOpen}
      disabled={navigationLocked}
      onclick={toggleBranchMenu}
    >
      <span>{selectedBranch ? selectedBranch.label : "지점 선택"}</span>
      <span class="branch-chevron" aria-hidden="true">⌄</span>
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
              <strong>{branch.label}</strong>
              {#if branch.locationLabel}
                <small>{branch.locationLabel}</small>
              {/if}
            </span>
            {#if selectedBranchId === branch.id}
              <b aria-hidden="true">✓</b>
            {/if}
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <div class="header-date" aria-label="오늘 날짜">
    <span>{headerDate}</span>
    <span aria-hidden="true">▣</span>
  </div>

  {#if activeMenu !== null && selectedPmsRecord}
    <div class="selected-room-header" aria-label="선택 객실">
      <strong>{selectedPmsRecord.displayRoom || selectedPmsRecord.roomNo}</strong>
      {#if selectedPmsRecord.guestName}
        <span>{selectedPmsRecord.guestName}</span>
      {/if}
    </div>
  {/if}
</header>

<script lang="ts">
  import type { BranchId, PmsGuestRecord } from "../../types.js";
  import type { MenuId } from "../../catalog/menu-routing.js";

  export let activeMenu: MenuId | null;
  export let branchOptions: Array<{ id: BranchId; label: string }>;
  export let navigationLocked: boolean;
  export let selectedBranchId: BranchId | "";
  export let selectedPmsRecord: PmsGuestRecord | null;
  export let onBack: () => void;
  export let onBranchChange: (event: Event) => void;
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
    <img class="brand-logo" src="logo.png" alt="UH Suite" />
    <strong>UH SUITE</strong>
  </div>

  <label class="branch-picker" aria-label="지점 선택">
    <select value={selectedBranchId} onchange={onBranchChange}>
      <option value="">지점 선택</option>
      {#each branchOptions as branch}
        <option value={branch.id}>{branch.label}</option>
      {/each}
    </select>
  </label>

  {#if activeMenu !== null && selectedPmsRecord}
    <div class="selected-room-header" aria-label="선택 객실">
      <strong>{selectedPmsRecord.displayRoom || selectedPmsRecord.roomNo}</strong>
      {#if selectedPmsRecord.guestName}
        <span>{selectedPmsRecord.guestName}</span>
      {/if}
    </div>
  {/if}
</header>

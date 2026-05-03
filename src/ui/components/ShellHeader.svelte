<script lang="ts">
  import type { BranchId } from "../../types.js";
  import * as MaterialIconModule from "./MaterialIcon.svelte";

  export let branchOptions: Array<{
    id: BranchId;
    label: string;
    headerLabel?: string;
    locationLabel?: string;
  }>;
  export let navigationLocked: boolean;
  export let selectedBranchId: BranchId | "";
  export let onBranchChange: (event: Event) => void;

  const MaterialIcon = MaterialIconModule.default;
  const logoUrl = new URL("../../assets/logo.png", import.meta.url).href;
  let branchPanelOpen = false;

  $: selectedBranch = branchOptions.find((branch) => branch.id === selectedBranchId) || null;
  $: selectedBranchHeaderLabel = selectedBranch?.headerLabel || selectedBranch?.label || "지점";
  $: headerDate = formatHeaderDate(new Date());

  function toggleBranchPanel() {
    if (navigationLocked) return;
    branchPanelOpen = !branchPanelOpen;
  }

  function chooseBranch(branchId: BranchId) {
    onBranchChange({ target: { value: branchId } } as unknown as Event);
    branchPanelOpen = false;
  }

  function formatHeaderDate(date: Date): string {
    const parts = new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const valueByType = new Map(parts.map((part) => [part.type, part.value]));
    return `${valueByType.get("year") || ""}.${valueByType.get("month") || ""}.${valueByType.get("day") || ""}`;
  }
</script>

<header class="app-header">
  <div class="header-left-lockup">
    <img class="brand-logo" src={logoUrl} alt="UH Suite" />

    <div class="branch-selector">
      <button
        class:unselected={!selectedBranch}
        class="branch-trigger"
        type="button"
        aria-haspopup="dialog"
        aria-expanded={branchPanelOpen}
        disabled={navigationLocked}
        onclick={toggleBranchPanel}
      >
        <span>{selectedBranchHeaderLabel}</span>
        <span class="branch-chevron" aria-hidden="true">
          <MaterialIcon name="expand_more" size={18} />
        </span>
      </button>
    </div>
  </div>

  <div class="header-room-slot" aria-hidden="true"></div>

  <div class="header-date" aria-label="오늘 날짜">
    <span>{headerDate}</span>
  </div>
</header>

{#if branchPanelOpen}
  <div
    class="ui-scrim"
    role="presentation"
    onclick={() => (branchPanelOpen = false)}
  ></div>
  <div
    class="branch-picker-sheet"
    role="dialog"
    aria-modal="true"
    aria-label="지점 선택"
  >
    <div class="sheet-handle" aria-hidden="true"></div>
    <header class="sheet-header">
      <div>
        <strong>지점 선택</strong>
        <span>UH Suite 지점</span>
      </div>
      <button type="button" aria-label="닫기" onclick={() => (branchPanelOpen = false)}>×</button>
    </header>
    <div class="branch-sheet-list" role="listbox" aria-label="지점 목록">
      {#each branchOptions as branch}
        <button
          class:selected={selectedBranchId === branch.id}
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
          <b aria-hidden="true"><MaterialIcon name="check" size={22} /></b>
        </button>
      {/each}
    </div>
  </div>
{/if}

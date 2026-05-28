<script lang="ts">
  import { getHeaderLogoUrl } from "../../assets/asset-catalog.js";
  import type { BranchId } from "../../types.js";
  import * as MaterialIconModule from "./MaterialIcon.svelte";

  export let branchOptions: Array<{
    id: BranchId;
    label: string;
    headerLabel?: string;
    locationLabel?: string;
  }>;
  export let activeMenuTitle: string | null = null;
  export let navigationLocked: boolean;
  export let selectedBranchId: BranchId | "";
  export let onBranchChange: (event: Event) => void;
  export let onBack: () => void;

  const MaterialIcon = MaterialIconModule.default;
  let branchPanelOpen = false;

  $: selectedBranch = branchOptions.find((branch) => branch.id === selectedBranchId) || null;
  $: selectedBranchHeaderLabel = selectedBranch?.headerLabel || selectedBranch?.label || "지점";
  $: workMode = Boolean(activeMenuTitle);
  $: activeLogoUrl = getHeaderLogoUrl(selectedBranchId);
  $: headerDate = formatHeaderDate(new Date());
  $: if (workMode && branchPanelOpen) {
    branchPanelOpen = false;
  }

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

<header class:work-mode={workMode} class="app-header">
  <div class="header-left-lockup">
    {#if workMode}
      <button
        class="header-back-button"
        type="button"
        aria-label="뒤로가기"
        disabled={navigationLocked}
        onclick={onBack}
      >
        <MaterialIcon name="arrow_back" size={20} />
      </button>
      {#if selectedBranch}
        <img class="work-branch-logo" src={activeLogoUrl} alt={selectedBranchHeaderLabel} />
      {/if}
    {:else}
      <div class="branch-selector">
        <button
          class:unselected={!selectedBranch}
          class="branch-logo-trigger"
          type="button"
          aria-label={selectedBranch ? "지점 변경" : "지점 선택"}
          aria-haspopup="dialog"
          aria-expanded={branchPanelOpen}
          disabled={navigationLocked}
          onclick={toggleBranchPanel}
        >
          <img class="brand-logo" src={activeLogoUrl} alt={selectedBranch ? selectedBranchHeaderLabel : "UH Suite"} />
          {#if !selectedBranch}
            <span class="branch-chevron" aria-hidden="true">
              <MaterialIcon name="expand_more" size={18} />
            </span>
          {/if}
        </button>
      </div>
    {/if}
  </div>

  <div class="header-room-slot" aria-hidden="true"></div>

  <div class="header-date" aria-label="오늘 날짜">
    <MaterialIcon name="calendar_today" size={15} />
    <span>{headerDate}</span>
  </div>

  {#if !workMode && branchPanelOpen}
    <div
      class="branch-picker-strip"
      role="listbox"
      aria-label="지점 선택"
    >
      {#each branchOptions as branch}
        <button
          class:selected={selectedBranchId === branch.id}
          type="button"
          role="option"
          aria-selected={selectedBranchId === branch.id}
          onclick={() => chooseBranch(branch.id)}
        >
          <span>{branch.headerLabel || branch.label}</span>
          {#if selectedBranchId === branch.id}
            <MaterialIcon name="check" size={16} />
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</header>

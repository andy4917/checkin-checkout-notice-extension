<script lang="ts">
  import { tick } from "svelte";
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
  export let branchPickerEnabled: boolean;
  export let navigationLocked: boolean;
  export let selectedBranchId: BranchId | "";
  export let onBranchChange: (branchId: BranchId) => void | Promise<void>;

  const MaterialIcon = MaterialIconModule.default;
  let branchApplyingId: BranchId | "" = "";
  let branchPanelOpen = false;
  let headerElement: HTMLElement | null = null;
  let branchTriggerElement: HTMLButtonElement | null = null;

  $: selectedBranch = branchOptions.find((branch) => branch.id === selectedBranchId) || null;
  $: selectedBranchHeaderLabel = selectedBranch?.headerLabel || selectedBranch?.label || "지점";
  $: workMode = Boolean(activeMenuTitle);
  $: activeLogoUrl = getHeaderLogoUrl(selectedBranchId);
  $: headerDate = formatHeaderDate(new Date());

  $: if (!branchPickerEnabled || navigationLocked) {
    branchPanelOpen = false;
  }

  function toggleBranchPanel() {
    if (!branchPickerEnabled || navigationLocked || branchApplyingId) return;
    branchPanelOpen = !branchPanelOpen;
  }

  async function closeBranchPanel(restoreFocus = false) {
    if (!branchPanelOpen) return;
    branchPanelOpen = false;
    if (restoreFocus) {
      await tick();
      branchTriggerElement?.focus({ preventScroll: true });
    }
  }

  async function chooseBranch(branchId: BranchId) {
    if (!branchPickerEnabled || navigationLocked || branchApplyingId) return;
    if (branchId === selectedBranchId) {
      await closeBranchPanel(true);
      return;
    }
    branchApplyingId = branchId;
    let applied = false;
    try {
      await onBranchChange(branchId);
      applied = true;
    } finally {
      branchApplyingId = "";
      if (applied) {
        await closeBranchPanel(true);
      }
    }
  }

  function handleWindowKeydown(event: KeyboardEvent) {
    if (branchPanelOpen && event.key === "Escape") {
      void closeBranchPanel(true);
    }
  }

  function handleWindowPointerdown(event: PointerEvent) {
    const target = event.target;
    if (
      branchPanelOpen &&
      target instanceof Node &&
      headerElement &&
      !headerElement.contains(target)
    ) {
      void closeBranchPanel();
    }
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

<svelte:window onkeydown={handleWindowKeydown} onpointerdown={handleWindowPointerdown} />

<header bind:this={headerElement} class:work-mode={workMode} class="app-header">
  <div class="header-left-lockup">
    <div class="branch-selector">
      <button
        class:locked={!branchPickerEnabled}
        class:unselected={!selectedBranch}
        class="header-logo-mark"
        bind:this={branchTriggerElement}
        type="button"
        aria-controls="branch-selection-popup"
        aria-expanded={branchPanelOpen}
        aria-label="지점 선택"
        aria-busy={Boolean(branchApplyingId)}
        disabled={!branchPickerEnabled || navigationLocked || Boolean(branchApplyingId)}
        onclick={toggleBranchPanel}
      >
        <img class="brand-logo" src={activeLogoUrl} alt={selectedBranch ? selectedBranchHeaderLabel : "UH Suite"} />
        {#if branchApplyingId}
          <MaterialIcon name="sync" size={16} />
        {/if}
      </button>
    </div>
  </div>

  <div class="header-room-slot" aria-hidden="true"></div>

  <div class="header-date" aria-label="오늘 날짜">
    <MaterialIcon name="calendar_today" size={15} />
    <span>{headerDate}</span>
  </div>

  {#if branchPanelOpen}
    <div
      id="branch-selection-popup"
      class="branch-selection-popup"
      role="group"
      aria-label="지점 선택"
    >
      {#each branchOptions as branch}
        <button
          class:selected={branch.id === selectedBranchId}
          type="button"
          aria-pressed={branch.id === selectedBranchId}
          disabled={navigationLocked || Boolean(branchApplyingId)}
          onclick={() => chooseBranch(branch.id)}
        >
          <span>{branch.headerLabel || branch.label}</span>
          <small>{branch.locationLabel}</small>
        </button>
      {/each}
    </div>
  {/if}
</header>

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
  export let branchPickerEnabled: boolean;
  export let navigationLocked: boolean;
  export let selectedBranchId: BranchId | "";
  export let onBranchChange: (event: Event) => void | Promise<void>;

  const MaterialIcon = MaterialIconModule.default;
  let branchApplyingId: BranchId | "" = "";

  $: selectedBranch = branchOptions.find((branch) => branch.id === selectedBranchId) || null;
  $: selectedBranchHeaderLabel = selectedBranch?.headerLabel || selectedBranch?.label || "지점";
  $: workMode = Boolean(activeMenuTitle);
  $: activeLogoUrl = getHeaderLogoUrl(selectedBranchId);
  $: headerDate = formatHeaderDate(new Date());

  function nextBranchId(): BranchId | "" {
    if (branchOptions.length === 0) return "";
    const currentIndex = branchOptions.findIndex((branch) => branch.id === selectedBranchId);
    return branchOptions[(currentIndex + 1) % branchOptions.length]?.id || branchOptions[0]?.id || "";
  }

  async function chooseNextBranch() {
    if (!branchPickerEnabled || navigationLocked || branchApplyingId) return;
    const branchId = nextBranchId();
    if (!branchId) return;
    branchApplyingId = branchId;
    try {
      await onBranchChange({ target: { value: branchId } } as unknown as Event);
    } finally {
      branchApplyingId = "";
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

<header class:work-mode={workMode} class="app-header">
  <div class="header-left-lockup">
    {#if workMode}
      {#if selectedBranch}
        <img class="work-branch-logo" src={activeLogoUrl} alt={selectedBranchHeaderLabel} />
      {/if}
    {:else}
      <div class="branch-selector">
        <button
          class:unselected={!selectedBranch}
          class="header-logo-mark"
          type="button"
          aria-label={selectedBranch ? "다음 지점 선택" : "지점 선택"}
          disabled={!branchPickerEnabled || navigationLocked || Boolean(branchApplyingId)}
          onclick={chooseNextBranch}
        >
          <img class="brand-logo" src={activeLogoUrl} alt={selectedBranch ? selectedBranchHeaderLabel : "UH Suite"} />
          {#if branchApplyingId}
            <MaterialIcon name="sync" size={16} />
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
</header>

<script lang="ts">
  import type { BottomPanelState } from "../side-panel-navigation-controller.svelte.js";
  import type { PmsGuestRecord } from "../../types.js";
  import * as BackButtonModule from "./BackButton.svelte";
  import * as MaterialIconModule from "./MaterialIcon.svelte";

  const BackButton = BackButtonModule.default;
  const MaterialIcon = MaterialIconModule.default;

  export let panel: BottomPanelState;
  export let records: readonly PmsGuestRecord[];
  export let selectedRecordId: string | null;
  export let searchTerm: string;
  export let statusMessage: string;
  export let statusTone: "neutral" | "success" | "error";
  export let loading: boolean;
  export let onBack: () => void;
  export let onRefresh: () => void;
  export let onSearch: (value: string) => void;
  export let onSelectRecord: (recordId: string) => void;

  function handleSearch(event: Event) {
    onSearch((event.currentTarget as HTMLInputElement).value);
  }

  $: emptyLabel = loading
    ? "PMS 조회 중"
    : statusTone === "error"
      ? "PMS 연결 확인 필요"
      : "표시할 PMS 기록이 없습니다.";
</script>

<section class="pms-panel" aria-label={panel.title}>
  <BackButton className="home-nav-back work-nav-back" label={panel.title} onBack={onBack} />

  <div class="pms-toolbar single">
    <button class="soft-action" type="button" disabled={loading} onclick={onRefresh}>
      <MaterialIcon name="refresh" size={18} />
      <span>새로고침</span>
    </button>
  </div>

  {#if statusMessage}
    <p
      aria-live="polite"
      class:success={statusTone === "success"}
      class:error={statusTone === "error"}
      class="work-status"
      role={statusTone === "error" ? "alert" : "status"}
    >
      {statusMessage}
    </p>
  {/if}

  <label class="pms-search">
    <MaterialIcon name="search" size={17} />
    <input value={searchTerm} aria-label="PMS 목록 검색" oninput={handleSearch} />
  </label>

  <div class="pms-record-list" aria-label={`${panel.title} PMS 목록`}>
    {#if records.length === 0}
      <div class="work-empty">
        <MaterialIcon name="meeting_room" size={20} />
        <span>{emptyLabel}</span>
      </div>
    {:else}
      {#each records as record}
        <button
          class:selected={selectedRecordId === record.id}
          class="pms-record-row"
          type="button"
          onclick={() => onSelectRecord(record.id)}
        >
          <span class="pms-room">
            {record.displayRoom || record.roomNo}
          </span>
          <span class="pms-record-main">
            {#if record.guestName}
              <strong>{record.guestName}</strong>
            {/if}
            {#if record.statusLabel || record.departureDate}
              <small>
                {#if record.statusLabel}
                  <span>{record.statusLabel}</span>
                {/if}
                {#if record.departureDate}
                  <span>{record.departureDate}</span>
                {/if}
              </small>
            {/if}
          </span>
          <MaterialIcon name={selectedRecordId === record.id ? "check" : "chevron_right"} size={18} />
        </button>
      {/each}
    {/if}
  </div>
</section>

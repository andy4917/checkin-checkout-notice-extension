<script lang="ts">
  import type { BottomPanelState } from "../side-panel-navigation-controller.svelte.js";
  import type { PmsGuestRecord } from "../../types.js";
  import * as MaterialIconModule from "./MaterialIcon.svelte";

  const MaterialIcon = MaterialIconModule.default;
  const NA_LABEL = "N/A";

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

  function valueOrNa(value: string): string {
    return value.trim() || NA_LABEL;
  }
</script>

<section class="pms-panel" aria-label={panel.title}>
  <div class="pms-toolbar">
    <button class="soft-action" type="button" onclick={onBack}>
      <MaterialIcon name="arrow_back" size={18} />
      <span>돌아가기</span>
    </button>
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
    <input value={searchTerm} placeholder="객실 또는 이름" oninput={handleSearch} />
  </label>

  <div class="pms-record-list" aria-label={`${panel.title} PMS 목록`}>
    {#if records.length === 0}
      <div class="work-empty">
        <MaterialIcon name="meeting_room" size={20} />
        <span>현재 등록된 PMS 기록 없음</span>
      </div>
    {:else}
      {#each records as record}
        <button
          class:selected={selectedRecordId === record.id}
          class="pms-record-row"
          type="button"
          onclick={() => onSelectRecord(record.id)}
        >
          <span class:na={!record.displayRoom && !record.roomNo} class="pms-room">
            {valueOrNa(record.displayRoom || record.roomNo)}
          </span>
          <span class="pms-record-main">
            <strong class:na={!record.guestName}>{valueOrNa(record.guestName)}</strong>
            <small>
              <span class:na={!record.statusLabel}>{valueOrNa(record.statusLabel)}</span>
              <span class:na={!record.departureDate}>{valueOrNa(record.departureDate)}</span>
            </small>
          </span>
          <MaterialIcon name={selectedRecordId === record.id ? "check" : "chevron_right"} size={18} />
        </button>
      {/each}
    {/if}
  </div>
</section>

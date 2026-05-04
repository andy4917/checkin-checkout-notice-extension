<script lang="ts">
  import type { BranchId, PmsGuestRecord, TabMode } from "../../types.js";
  import * as LoadingImageModule from "./LoadingImage.svelte";

  const LoadingImage = LoadingImageModule.default;

  export let pmsLoading: boolean;
  export let pmsMode: TabMode;
  export let pmsRecords: PmsGuestRecord[];
  export let pmsSearchTerm: string;
  export let selectedBranchId: BranchId | "";
  export let selectedPmsRecord: PmsGuestRecord | null;
  export let selectedPmsRecordId: string;
  export let visiblePmsRecords: PmsGuestRecord[];
  export let recordBadgeLabel: (record: PmsGuestRecord) => string;
  export let onPmsSearchChange: (event: Event) => void;
  export let onSelectPmsMode: (mode: TabMode) => void | Promise<void>;
  export let onSelectPmsRecord: (record: PmsGuestRecord) => void;
  export let onSyncPmsGuestRecords: () => void | Promise<void>;

  let roomPanelOpen = false;

  function chooseRoom(record: PmsGuestRecord) {
    onSelectPmsRecord(record);
    roomPanelOpen = false;
  }
</script>

<section class="room-bottom-bar" aria-label="객실 선택">
  {#if selectedPmsRecord}
    <aside
      class="selected-room-overlay"
      aria-live="polite"
      aria-label="선택된 객실"
    >
      <strong>{selectedPmsRecord.displayRoom || selectedPmsRecord.roomNo}</strong>
      {#if selectedPmsRecord.guestName}
        <span>{selectedPmsRecord.guestName}</span>
      {/if}
      {#if recordBadgeLabel(selectedPmsRecord)}
        <em>{recordBadgeLabel(selectedPmsRecord)}</em>
      {/if}
    </aside>
  {/if}

  <button
    class="room-bottom-summary"
    type="button"
    aria-expanded={roomPanelOpen}
    aria-controls="room-bottom-panel"
    onclick={() => (roomPanelOpen = !roomPanelOpen)}
  >
    <span>객실</span>
    <strong>{pmsMode === "ARRIVAL" ? "입실" : "퇴실"}</strong>
    <small>{selectedPmsRecord ? "선택됨" : "미선택"}</small>
  </button>

  {#if roomPanelOpen}
  <div
    id="room-bottom-panel"
    class="room-bottom-panel"
  >
    <div class="pms-panel-header">
      <div>
        <p class="eyebrow">객실 선택</p>
        <h2>{pmsMode === "ARRIVAL" ? "입실 예정" : "퇴실 예정"}</h2>
      </div>
      <button type="button" disabled={pmsLoading || !selectedBranchId} onclick={onSyncPmsGuestRecords}>
        {#if pmsLoading}
          <LoadingImage compact label="객실 목록 로딩 중" />
        {:else}
          객실 불러오기
        {/if}
      </button>
    </div>

    <div class="pms-controls">
      <div class="segmented-control" aria-label="객실 조회 모드">
        <button
          class:active={pmsMode === "ARRIVAL"}
          type="button"
          disabled={pmsLoading}
          onclick={() => onSelectPmsMode("ARRIVAL")}
        >
          입실
        </button>
        <button
          class:active={pmsMode === "DEPARTURE"}
          type="button"
          disabled={pmsLoading}
          onclick={() => onSelectPmsMode("DEPARTURE")}
        >
          퇴실
        </button>
      </div>
      <label>
        <span>검색</span>
        <input name="room-search" value={pmsSearchTerm} oninput={onPmsSearchChange} />
      </label>
    </div>

    <div class="pms-record-list">
      {#if !selectedBranchId}
        <article class="pms-record empty">지점을 선택해주세요.</article>
      {:else if pmsRecords.length === 0 && !pmsLoading}
        <article class="pms-record empty">객실을 불러오세요.</article>
      {:else}
        {#each visiblePmsRecords as record}
          {@const badgeLabel = recordBadgeLabel(record)}
          <button
            class:active={selectedPmsRecordId === record.id}
            class="pms-record pms-record-button"
            type="button"
            onclick={() => chooseRoom(record)}
          >
            <div>
              <strong>{record.displayRoom || record.roomNo}</strong>
              {#if record.guestName}
                <span>{record.guestName}</span>
              {/if}
              {#if badgeLabel}
                <em>{badgeLabel}</em>
              {/if}
            </div>
            <div>
              {#if record.statusLabel || record.statusCode}
                <span>{record.statusLabel || record.statusCode}</span>
              {/if}
              {#if record.departureDate}
                <span>{record.departureDate}</span>
              {/if}
            </div>
          </button>
        {/each}
      {/if}
    </div>
  </div>
  {/if}
</section>

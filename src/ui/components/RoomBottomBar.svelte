<script lang="ts">
  import type { BranchId, PmsGuestRecord, TabMode } from "../../types.js";

  export let pmsLoading: boolean;
  export let pmsMode: TabMode;
  export let pmsRecords: PmsGuestRecord[];
  export let pmsSearchTerm: string;
  export let selectedBranchId: BranchId | "";
  export let selectedPmsRecord: PmsGuestRecord | null;
  export let selectedPmsRecordId: string;
  export let visiblePmsRecords: PmsGuestRecord[];
  export let onPmsSearchChange: (event: Event) => void;
  export let onSelectPmsMode: (mode: TabMode) => void | Promise<void>;
  export let onSelectPmsRecord: (record: PmsGuestRecord) => void;
  export let onSyncPmsGuestRecords: () => void | Promise<void>;
</script>

<section class="room-bottom-bar" aria-label="객실 선택">
  <div class="room-bottom-summary">
    <span>선택 객실</span>
    <strong>
      {selectedPmsRecord
        ? selectedPmsRecord.displayRoom || selectedPmsRecord.roomNo
        : "미선택"}
    </strong>
    {#if selectedPmsRecord?.guestName}
      <small>{selectedPmsRecord.guestName}</small>
    {/if}
  </div>
  <div class="room-bottom-panel">
    <div class="pms-panel-header">
      <div>
        <p class="eyebrow">객실 선택</p>
        <h2>{pmsMode === "ARRIVAL" ? "입실 예정" : "퇴실 예정"}</h2>
      </div>
      <button type="button" disabled={pmsLoading || !selectedBranchId} onclick={onSyncPmsGuestRecords}>
        {pmsLoading ? "불러오는 중" : "객실 불러오기"}
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
        <input value={pmsSearchTerm} oninput={onPmsSearchChange} />
      </label>
    </div>

    <div class="pms-record-list">
      {#if !selectedBranchId}
        <article class="pms-record empty">지점을 선택해주세요.</article>
      {:else if pmsRecords.length === 0 && !pmsLoading}
        <article class="pms-record empty">객실을 불러오세요.</article>
      {:else}
        {#each visiblePmsRecords as record}
          <button
            class:active={selectedPmsRecordId === record.id}
            class="pms-record pms-record-button"
            type="button"
            onclick={() => onSelectPmsRecord(record)}
          >
            <div>
              <strong>{record.displayRoom || record.roomNo}</strong>
              {#if record.guestName}
                <span>{record.guestName}</span>
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
</section>

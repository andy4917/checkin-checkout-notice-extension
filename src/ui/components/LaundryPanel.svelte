<script lang="ts">
  import type { BranchId, PmsGuestRecord } from "../../types.js";
  import type { LaundryRecord, LaundryStatus } from "../../laundry/types.js";
  import * as LoadingImageModule from "./LoadingImage.svelte";
  import * as MaterialIconModule from "./MaterialIcon.svelte";

  const LoadingImage = LoadingImageModule.default;
  const MaterialIcon = MaterialIconModule.default;

  const statusOptions: Array<LaundryStatus | "ALL"> = [
    "ALL",
    "RECEIVED",
    "IN_PROGRESS",
    "READY",
    "PICKED_UP",
  ];

  export let filteredLaundryRecords: LaundryRecord[];
  export let laundryItemSummary: string;
  export let laundryLoading: boolean;
  export let laundryNote: string;
  export let laundrySearchTerm: string;
  export let laundryStatusFilter: LaundryStatus | "ALL";
  export let selectedBranchId: BranchId | "";
  export let selectedPmsRecord: PmsGuestRecord | null;
  export let laundryStatusLabel: (status: LaundryStatus) => string;
  export let nextLaundryStatus: (status: LaundryStatus) => LaundryStatus;
  export let onAddLaundry: () => void | Promise<void>;
  export let onLaundryItemSummaryChange: (value: string) => void;
  export let onLaundryNoteChange: (value: string) => void;
  export let onLaundrySearchTermChange: (value: string) => void;
  export let onLaundryStatusFilterChange: (status: LaundryStatus | "ALL") => void;
  export let onLoadLaundryRecords: () => void | Promise<void>;
  export let onSetLaundryStatus: (
    record: LaundryRecord,
    status: LaundryStatus,
  ) => void | Promise<void>;
</script>

<section class="laundry-panel" aria-label="세탁물 관리">
  <div class="pms-panel-header">
    <div>
      <p class="eyebrow">세탁물</p>
      <h2>
        <MaterialIcon name="local_laundry_service" size={19} filled />
        세탁물 기록
      </h2>
    </div>
    <button type="button" disabled={laundryLoading} onclick={onLoadLaundryRecords}>
      {#if laundryLoading}
        <LoadingImage compact label="세탁물 로딩 중" />
      {:else}
        새로고침
      {/if}
    </button>
  </div>

  <div class="laundry-form">
    <label>
      <span>세탁물 내용</span>
      <input
        name="laundry-item-summary"
        value={laundryItemSummary}
        oninput={(event) => onLaundryItemSummaryChange((event.target as HTMLInputElement).value)}
      />
    </label>
    <label>
      <span>메모</span>
      <input
        name="laundry-note"
        value={laundryNote}
        oninput={(event) => onLaundryNoteChange((event.target as HTMLInputElement).value)}
      />
    </label>
    <button type="button" disabled={laundryLoading || !selectedBranchId} onclick={onAddLaundry}>
      추가
    </button>
  </div>

  <div class="laundry-filters">
    <div class="segmented-control" aria-label="세탁물 상태">
      {#each statusOptions as status}
        <button
          class:active={laundryStatusFilter === status}
          type="button"
          onclick={() => onLaundryStatusFilterChange(status)}
        >
          {status === "ALL" ? "전체" : laundryStatusLabel(status)}
        </button>
      {/each}
    </div>
    <label>
      <span>검색</span>
      <input
        name="laundry-search"
        value={laundrySearchTerm}
        oninput={(event) => onLaundrySearchTermChange((event.target as HTMLInputElement).value)}
      />
    </label>
  </div>

  <div class="laundry-list">
    {#if !selectedBranchId}
      <article class="pms-record empty">지점을 선택해주세요.</article>
    {:else if filteredLaundryRecords.length === 0}
      <article class="pms-record empty">세탁물 기록이 없습니다.</article>
    {:else}
      {#each filteredLaundryRecords as record}
        <article class="laundry-record">
          <div class="laundry-record-main">
            {#if record.displayRoom || record.roomNo}
              <strong>{record.displayRoom || record.roomNo}</strong>
            {/if}
            {#if record.guestName || selectedPmsRecord?.guestName}
              <span>{record.guestName || selectedPmsRecord?.guestName}</span>
            {/if}
            <p>{record.itemSummary}</p>
            {#if record.note}
              <small>{record.note}</small>
            {/if}
          </div>
          <div class="laundry-record-actions">
            <span>{laundryStatusLabel(record.status)}</span>
            {#if nextLaundryStatus(record.status) !== record.status}
              <button
                type="button"
                disabled={laundryLoading}
                onclick={() => onSetLaundryStatus(record, nextLaundryStatus(record.status))}
              >
                다음
              </button>
            {/if}
            <button
              class="secondary"
              type="button"
              disabled={laundryLoading || record.status === "CANCELLED"}
              onclick={() => onSetLaundryStatus(record, "CANCELLED")}
            >
              취소
            </button>
          </div>
        </article>
      {/each}
    {/if}
  </div>
</section>

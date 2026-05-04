<script lang="ts">
  import type { BranchId } from "../../types.js";
  import type { OtaReservationInputPreview } from "../../application/ota-reservation-input.js";
  import * as LoadingImageModule from "./LoadingImage.svelte";
  import * as MaterialIconModule from "./MaterialIcon.svelte";

  const LoadingImage = LoadingImageModule.default;
  const MaterialIcon = MaterialIconModule.default;

  export let otaLoading: boolean;
  export let otaPreview: OtaReservationInputPreview | null;
  export let selectedBranchId: BranchId | "";
  export let otaPreviewSummary: (preview: OtaReservationInputPreview) => string;
  export let onFillWingsReservation: () => void | Promise<void>;
  export let onLoadOtaReservation: () => void | Promise<void>;
</script>

<section class="pms-panel" aria-label="OTA 예약 입력">
  <div class="pms-panel-header">
    <div>
      <p class="eyebrow">OTA</p>
      <h2>
        <MaterialIcon name="travel_explore" size={19} filled />
        네이버/스테이션 예약 입력
      </h2>
    </div>
    <button type="button" disabled={otaLoading || !selectedBranchId} onclick={onLoadOtaReservation}>
      {#if otaLoading}
        <LoadingImage compact label="OTA 예약정보 로딩 중" />
      {:else}
        예약정보 가져오기
      {/if}
    </button>
  </div>

  <div class="pms-record-list">
    {#if !selectedBranchId}
      <article class="pms-record empty">지점을 선택해주세요.</article>
    {:else if otaPreview}
      <article class="pms-record">
        <div>
          <strong>{otaPreview.draft.guestName}</strong>
          <span>{otaPreview.draft.source === "naver" ? "네이버" : "스테이션"} {otaPreview.draft.sourceReservationId}</span>
        </div>
        <div>
          <span>{otaPreview.draft.checkInDate} - {otaPreview.draft.checkOutDate}</span>
          {#if otaPreview.draft.roomTypeName}
            <span>{otaPreview.draft.roomTypeName}</span>
          {/if}
        </div>
      </article>
      <article class="template-card">
        <div class="template-main">
          <div class="template-meta">
            <span>{Object.keys(otaPreview.fields).length}개 입력값</span>
            <span>저장 수동</span>
          </div>
          <h2>WINGS 신규예약 입력값</h2>
          {#if otaPreviewSummary(otaPreview)}
            <p class="template-summary">{otaPreviewSummary(otaPreview)}</p>
          {/if}
        </div>
        <button type="button" disabled={otaLoading} onclick={onFillWingsReservation}>
          {#if otaLoading}
            <LoadingImage compact label="WINGS 입력 중" />
          {:else}
            <MaterialIcon name="login" size={18} />
            WINGS에 입력
          {/if}
        </button>
      </article>
    {/if}
  </div>
</section>

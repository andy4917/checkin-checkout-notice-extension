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
  export let onFillWingsReservation: () => void | Promise<void>;
  export let onLoadOtaReservation: () => void | Promise<void>;
</script>

<section class="pms-panel" aria-label="OTA 예약 입력">
  <section class="ota-extract-card" aria-label="OTA 예약정보 가져오기">
    <span class="ota-extract-icon" aria-hidden="true">
      <MaterialIcon name="content_paste_search" size={30} />
    </span>
    <h2>예약정보</h2>
    <button type="button" disabled={otaLoading || !selectedBranchId} onclick={onLoadOtaReservation}>
      {#if otaLoading}
        <LoadingImage compact label="예약정보 로딩 중" />
      {:else}
        <MaterialIcon name="bolt" size={18} />
        예약정보 가져오기
      {/if}
    </button>
  </section>

  <div class="ota-flow-list">
    {#if otaPreview}
      <article class="ota-summary-card">
        <div class="section-heading-row">
          <span>{otaPreview.draft.source === "naver" ? "네이버" : "스테이션"}</span>
        </div>
        <dl class="ota-summary-grid">
          <div>
            <dt>고객명</dt>
            <dd>{otaPreview.draft.guestName || "-"}</dd>
          </div>
          <div>
            <dt>예약번호</dt>
            <dd>{otaPreview.draft.sourceReservationId || "-"}</dd>
          </div>
          <div>
            <dt>투숙일</dt>
            <dd>{otaPreview.draft.checkInDate} - {otaPreview.draft.checkOutDate}</dd>
          </div>
          <div>
            <dt>객실</dt>
            <dd>{otaPreview.draft.roomTypeName || "-"}</dd>
          </div>
        </dl>
      </article>
      <article class="ota-action-card">
        <span aria-hidden="true"><MaterialIcon name="keyboard_return" size={20} /></span>
        <div>
          <h3>WINGS 입력</h3>
        </div>
        <button type="button" disabled={otaLoading} onclick={onFillWingsReservation}>
          {#if otaLoading}
            <LoadingImage compact label="WINGS 입력 중" />
          {:else}
            <MaterialIcon name="login" size={18} />
            입력
          {/if}
        </button>
      </article>
    {/if}
  </div>
</section>

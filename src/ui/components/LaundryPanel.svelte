<script lang="ts">
  import type { BranchId, PmsGuestRecord } from "../../types.js";
  import type {
    LaundryMachineType,
    LaundryRecord,
    LaundryStatus,
  } from "../../laundry/types.js";
  import * as LoadingImageModule from "./LoadingImage.svelte";
  import * as MaterialIconModule from "./MaterialIcon.svelte";

  const LoadingImage = LoadingImageModule.default;
  const MaterialIcon = MaterialIconModule.default;

  export let filteredLaundryRecords: LaundryRecord[];
  export let laundryItemSummary: string;
  export let laundryLoading: boolean;
  export let selectedBranchId: BranchId | "";
  export let selectedPmsRecord: PmsGuestRecord | null;
  export let onAddLaundry: () => void | Promise<void>;
  export let onLaundryItemSummaryChange: (value: string) => void;
  export let onLoadLaundryRecords: () => void | Promise<void>;
  export let onSetLaundryStatus: (
    record: LaundryRecord,
    status: LaundryStatus,
    machineType?: LaundryMachineType,
  ) => void | Promise<void>;

  const dragMimeType = "application/x-laundry-record-id";

  function roomLabel(record: LaundryRecord) {
    return record.displayRoom || record.roomNo || "객실";
  }

  function machineRecords(machineType: LaundryMachineType) {
    return filteredLaundryRecords.filter(
      (record) => record.status === "IN_PROGRESS" && record.machineType === machineType,
    );
  }

  function laneRecords(status: LaundryStatus) {
    return filteredLaundryRecords.filter((record) => record.status === status);
  }

  function dropRecord(
    event: DragEvent,
    status: LaundryStatus,
    machineType?: LaundryMachineType,
  ) {
    event.preventDefault();
    const recordId = event.dataTransfer?.getData(dragMimeType) || event.dataTransfer?.getData("text/plain");
    const record = filteredLaundryRecords.find((candidate) => candidate.id === recordId);
    if (!record || laundryLoading) return;
    void onSetLaundryStatus(record, status, machineType);
  }

  function startDrag(event: DragEvent, record: LaundryRecord) {
    event.dataTransfer?.setData(dragMimeType, record.id);
    event.dataTransfer?.setData("text/plain", record.id);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
  }

  function allowDrop(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
  }

  function submitRoomBlock(event: SubmitEvent) {
    event.preventDefault();
    void onAddLaundry();
  }

  $: washerRecords = machineRecords("WASHER");
  $: dryerRecords = machineRecords("DRYER");
  $: waitingRecords = laneRecords("RECEIVED");
  $: readyRecords = laneRecords("READY");
  $: selectedRoomLabel = selectedPmsRecord?.displayRoom || selectedPmsRecord?.roomNo || "";
  $: washerCount = washerRecords.length;
  $: dryerCount = dryerRecords.length;
</script>

<section class="laundry-manager" aria-label="세탁물 관리">
  <header class="laundry-manager-header">
    <button
      class="icon-refresh-button"
      type="button"
      disabled={laundryLoading}
      aria-label="새로고침"
      onclick={onLoadLaundryRecords}
    >
      {#if laundryLoading}
        <LoadingImage compact label="세탁물 로딩 중" />
      {:else}
        <MaterialIcon name="sync" size={20} />
      {/if}
    </button>
  </header>

  <section class="laundry-machine-section" aria-label="활성 머신">
    <div class="laundry-section-heading">
      <h3>세탁 / 건조</h3>
      <span>{washerCount + dryerCount}</span>
    </div>
    <div class="laundry-machine-grid">
      <article
        class="laundry-machine-card"
        aria-label="세탁기"
        ondragover={allowDrop}
        ondrop={(event) => dropRecord(event, "IN_PROGRESS", "WASHER")}
      >
        <div class="laundry-machine-topline">
          <MaterialIcon name="local_laundry_service" size={26} />
          <span>{washerCount}</span>
        </div>
        <h4>세탁기</h4>
        <div class="laundry-machine-slots">
          {#if washerRecords.length > 0}
            {#each washerRecords as record}
              <button
                class="laundry-room-chip dark"
                type="button"
                draggable="true"
                ondragstart={(event) => startDrag(event, record)}
              >
                {roomLabel(record)}
              </button>
            {/each}
          {/if}
        </div>
        <div class="laundry-progress-track"><span style={`width: ${washerCount > 0 ? 65 : 0}%`}></span></div>
      </article>

      <article
        class="laundry-machine-card"
        aria-label="건조기"
        ondragover={allowDrop}
        ondrop={(event) => dropRecord(event, "IN_PROGRESS", "DRYER")}
      >
        <div class="laundry-machine-topline">
          <MaterialIcon name="mode_fan" size={26} />
          <span>{dryerCount}</span>
        </div>
        <h4>건조기</h4>
        <div class="laundry-machine-slots">
          {#if dryerRecords.length > 0}
            {#each dryerRecords as record}
              <button
                class="laundry-room-chip muted"
                type="button"
                draggable="true"
                ondragstart={(event) => startDrag(event, record)}
              >
                {roomLabel(record)}
              </button>
            {/each}
          {/if}
        </div>
        <div class="laundry-progress-track"><span style={`width: ${dryerCount > 0 ? 45 : 0}%`}></span></div>
      </article>
    </div>
  </section>

  <form class="laundry-start-process" aria-label="객실 블록 생성" onsubmit={submitRoomBlock}>
    <label>
      <span>객실번호</span>
      <div>
        <input
          name="laundry-room-number"
          aria-label="객실번호"
          placeholder={selectedRoomLabel || "객실번호"}
          value={laundryItemSummary}
          oninput={(event) => onLaundryItemSummaryChange((event.target as HTMLInputElement).value)}
        />
        <MaterialIcon name="door_front" size={20} />
      </div>
    </label>
    <button type="submit" disabled={laundryLoading || !selectedBranchId || !laundryItemSummary.trim()}>
      객실 블록 생성
    </button>
  </form>

  <section class="laundry-board" aria-label="세탁물 상태 보드">
    <div
      class="laundry-lane"
      role="list"
      ondragover={allowDrop}
      ondrop={(event) => dropRecord(event, "RECEIVED")}
    >
      <div class="laundry-section-heading">
        <h3>대기</h3>
        <span>{waitingRecords.length}</span>
      </div>
      <div class="laundry-lane-stack">
        {#if waitingRecords.length > 0}
          {#each waitingRecords as record}
            <article
              class="laundry-task-card"
              draggable="true"
              ondragstart={(event) => startDrag(event, record)}
            >
              <span><MaterialIcon name="hourglass_empty" size={22} /></span>
              <div>
                <strong>Room {roomLabel(record)}</strong>
              </div>
              <MaterialIcon name="drag_indicator" size={20} />
            </article>
          {/each}
        {/if}
      </div>
    </div>

    <div
      class="laundry-lane ready"
      role="list"
      ondragover={allowDrop}
      ondrop={(event) => dropRecord(event, "READY")}
    >
      <div class="laundry-section-heading">
        <h3>완료</h3>
        <span>{readyRecords.length}</span>
      </div>
      <div class="laundry-lane-stack">
        {#if readyRecords.length > 0}
          {#each readyRecords as record}
            <article
              class="laundry-task-card ready"
              draggable="true"
              ondragstart={(event) => startDrag(event, record)}
            >
              <span><MaterialIcon name="check_circle" size={22} /></span>
              <div>
                <strong>Room {roomLabel(record)}</strong>
              </div>
            </article>
          {/each}
        {/if}
      </div>
    </div>
  </section>
</section>

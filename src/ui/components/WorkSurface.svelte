<script lang="ts">
  import { getAvailableTemplateLanguages } from "../../catalog/template-renderer.js";
  import { resolveTemplateGroups } from "../../catalog/template-groups.js";
  import { usesWorkLanguageSelector } from "../../catalog/menu-routing.js";
  import type { MenuItem } from "../../catalog/menu-routing.js";
  import type { TemplateVariable, UnifiedTemplateDefinition } from "../../catalog/template-types.js";
  import type { OtaReservationInputPreview } from "../../application/ota-reservation-input.js";
  import {
    getOtaSourceLabel,
    OTA_SOURCE_PRESENTATIONS,
  } from "../../application/ota-reservation-input.js";
  import type {
    AirportVanCopyTarget,
    AirportVanFormValues,
    AirportVanPaymentMethod,
    AirportVanRideDirection,
  } from "../../application/airport-van-form.js";
  import {
    AIRPORT_VAN_FIELD_PRESENTATIONS,
    AIRPORT_VAN_PAYMENT_OPTIONS,
    AIRPORT_VAN_RIDE_DIRECTION_OPTIONS,
    getAirportVanRoutePointLabels,
  } from "../../application/airport-van-form.js";
  import {
    LAUNDRY_ACTIVE_TARGETS,
    LAUNDRY_COMPLETED_TARGET,
    LAUNDRY_SCHEDULED_TARGET,
    getAllowedLaundryMoveTargets,
  } from "../../application/laundry-records.js";
  import { isPrimaryRemarkTemplateId } from "../../domain/remarks.js";
  import type { LaundryColumnView } from "../../application/laundry-records.js";
  import type { LaundryMoveTarget, LaundryRecord } from "../../laundry/types.js";
  import type { Language } from "../../types.js";
  import { getManualVariables, getTemplateRequirement as resolveTemplateRequirement } from "../template-list-state.js";
  import * as BackButtonModule from "./BackButton.svelte";
  import * as MaterialIconModule from "./MaterialIcon.svelte";

  const BackButton = BackButtonModule.default;
  const MaterialIcon = MaterialIconModule.default;
  const airportVanRideDirectionOptions = AIRPORT_VAN_RIDE_DIRECTION_OPTIONS;
  const airportVanPaymentOptions = AIRPORT_VAN_PAYMENT_OPTIONS;
  const airportVanFieldPresentations = AIRPORT_VAN_FIELD_PRESENTATIONS;
  const getRoutePointLabels = getAirportVanRoutePointLabels;
  const laundryActiveTargets = LAUNDRY_ACTIVE_TARGETS;
  const laundryCompletedTarget = LAUNDRY_COMPLETED_TARGET;
  const laundryScheduledTarget = LAUNDRY_SCHEDULED_TARGET;
  const otaSourcePresentations = OTA_SOURCE_PRESENTATIONS;
  const getOtaLabel = getOtaSourceLabel;
  const airportVanMainFields = [
    { name: "rideDate", icon: "calendar_today" },
    { name: "rideTime", icon: "schedule" },
    { name: "guestName", icon: "person" },
    { name: "guestContact", icon: "call" },
  ] as const;
  const airportVanFlightFields = [
    { name: "airportName", icon: "flight" },
    { name: "terminal", icon: "meeting_room" },
    { name: "flightNo", icon: "travel_explore" },
    { name: "flightTime", icon: "schedule" },
  ] as const;
  const airportVanLuggageFields = [
    { name: "passengerCount", icon: "person" },
    { name: "largeLuggageCount", icon: "luggage" },
    { name: "smallLuggageCount", icon: "luggage" },
  ] as const;

  export let menu: MenuItem;
  export let templates: readonly UnifiedTemplateDefinition[];
  export let selectedLanguage: Language;
  export let selectedBranchReady: boolean;
  export let statusMessage: string;
  export let statusTone: "neutral" | "success" | "error";
  export let copiedTemplateId: string | null;
  export let loading: boolean;
  export let laundryColumnViews: readonly LaundryColumnView[];
  export let otaPreview: OtaReservationInputPreview | null;
  export let airportVanFormValues: AirportVanFormValues;
  export let templateVariableValues: Record<string, string>;
  export let templateValues: Record<string, string>;
  export let hasSelectedPmsRecord: boolean;
  export let requiredManualVariables: readonly TemplateVariable[];
  export let onSelectLanguage: (language: Language) => void;
  export let onCopyTemplate: (templateId: string) => void;
  export let onCreateLaundryRecord: (itemSummary: string) => void;
  export let onBack: () => void;
  export let onMoveLaundryRecord: (recordId: string, target: LaundryMoveTarget) => void;
  export let onRemoveLaundryRecord: (recordId: string) => void;
  export let onLoadOtaPreview: () => void;
  export let onFillOtaPreview: () => void;
  export let onResetTemplateSettings: () => void;
  export let onSetTemplateVariableValue: (variableName: string, value: string) => void | Promise<void>;
  export let onSetAirportVanFormValue: (fieldName: keyof AirportVanFormValues, value: string) => void;
  export let onCopyAirportVanText: (target: AirportVanCopyTarget) => void;
  export let onUpsertRoomRemark: (templateId: string) => void | Promise<void>;

  let resetArmed = false;
  let expandedTemplateId: string | null = null;
  let laundryInputValue = "";
  let draggedLaundryRecordId = "";
  let invalidDropTarget: LaundryMoveTarget | null = null;
  let laundryActionRecordId: string | null = null;
  let selectedTemplateId = "";
  let pendingRoomRemarkTemplateId = "";

  $: templateGroups = resolveTemplateGroups(templates);
  $: availableLanguages = Array.from(
    new Set(templates.flatMap((template) => getAvailableTemplateLanguages(template))),
  ) as Language[];
  $: showLanguageSelector = usesWorkLanguageSelector(menu.id) && availableLanguages.length > 0;
  $: airportRoutePointLabels = getRoutePointLabels(airportVanFormValues.rideDirection);
  $: selectedTemplate = templates.find((template) => template.id === selectedTemplateId) || null;
  $: selectedTemplateVariables = selectedTemplate ? getManualVariables(selectedTemplate) : [];
  $: roomContextLabel = templateValue("displayRoom") || templateValue("roomNo");
  $: roomMemoFeaturedTemplates = templates.filter((template) => isPrimaryRemarkTemplateId(template.id));
  $: roomMemoOtherTemplates = templates.filter((template) => !isPrimaryRemarkTemplateId(template.id));
  $: if (
    menu.screenKind === "roomRemarkMemo" &&
    (!selectedTemplateId || !templates.some((template) => template.id === selectedTemplateId)) &&
    roomMemoFeaturedTemplates[0]
  ) {
    selectedTemplateId = roomMemoFeaturedTemplates[0].id;
  }

  function laundryBlockTitle(record: LaundryRecord): string {
    return record.displayRoom || record.roomNo || record.itemSummary;
  }

  function laundryMoveTargets(record: LaundryRecord): LaundryMoveTarget[] {
    return getAllowedLaundryMoveTargets(record);
  }

  function laundryColumn(target: LaundryMoveTarget): LaundryColumnView | null {
    return laundryColumnViews.find((column) => column.target === target) || null;
  }

  function laundryColumnRecords(target: LaundryMoveTarget): LaundryRecord[] {
    return laundryColumn(target)?.records || [];
  }

  function airportFieldPresentation(fieldName: keyof AirportVanFormValues) {
    return airportVanFieldPresentations[fieldName] || { label: fieldName, placeholder: fieldName };
  }

  function findLaundryRecord(recordId: string): LaundryRecord | null {
    return laundryColumnViews.flatMap((column) => column.records).find((record) => record.id === recordId) || null;
  }

  function languageLabel(language: Language): string {
    return { KO: "KR", EN: "EN", JP: "JP", CN: "CH" }[language];
  }

  function getTemplateRequirement(template: UnifiedTemplateDefinition): string {
    return resolveTemplateRequirement(template, {
      hasSelectedPmsRecord,
      templateValues,
      templateVariableValues,
    });
  }

  function templateValue(variableName: string): string {
    return templateVariableValues[variableName] || templateValues[variableName] || "";
  }

  function toggleTemplate(templateId: string) {
    expandedTemplateId = expandedTemplateId === templateId ? null : templateId;
  }

  function roomRemarkValue(template: UnifiedTemplateDefinition): string {
    const variable = getManualVariables(template)[0];
    if (!variable) return "";
    return templateValue(variable.name).trim();
  }

  function roomRemarkNumericValue(template: UnifiedTemplateDefinition): number {
    const rawValue = roomRemarkValue(template);
    if (!rawValue) return 0;
    const parsed = Number.parseInt(rawValue, 10);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }

  function roomRemarkPrimaryVariable(template: UnifiedTemplateDefinition): TemplateVariable | null {
    return getManualVariables(template)[0] || null;
  }

  function chooseRoomRemarkTemplate(templateId: string) {
    selectedTemplateId = selectedTemplateId === templateId ? "" : templateId;
    expandedTemplateId = selectedTemplateId;
  }

  async function adjustRoomRemarkCount(template: UnifiedTemplateDefinition, delta: number) {
    const variable = roomRemarkPrimaryVariable(template);
    if (!variable) return;
    const nextValue = Math.max(0, roomRemarkNumericValue(template) + delta);
    selectedTemplateId = template.id;
    expandedTemplateId = template.id;
    await onSetTemplateVariableValue(variable.name, String(nextValue));
  }

  async function applyRoomRemark(templateId: string) {
    const template = templates.find((item) => item.id === templateId) || null;
    const variable = template ? roomRemarkPrimaryVariable(template) : null;
    if (template && variable?.name === "count" && !roomRemarkValue(template)) {
      await onSetTemplateVariableValue(variable.name, "0");
    }
    pendingRoomRemarkTemplateId = templateId;
    try {
      await onUpsertRoomRemark(templateId);
    } finally {
      pendingRoomRemarkTemplateId = "";
    }
  }

  function handleVariableInput(variableName: string, event: Event) {
    onSetTemplateVariableValue(variableName, (event.currentTarget as HTMLInputElement).value);
  }

  function handleAirportVanInput(fieldName: keyof AirportVanFormValues, event: Event) {
    onSetAirportVanFormValue(fieldName, (event.currentTarget as HTMLInputElement).value);
  }

  function handleLaundryInput(event: Event) {
    laundryInputValue = (event.currentTarget as HTMLInputElement).value;
  }

  function createLaundryFromInput() {
    const value = laundryInputValue.trim();
    if (!value) return;
    onCreateLaundryRecord(value);
    laundryInputValue = "";
  }

  function startLaundryDrag(event: DragEvent, record: LaundryRecord) {
    draggedLaundryRecordId = record.id;
    laundryActionRecordId = null;
    event.dataTransfer?.setData("text/plain", record.id);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
  }

  function finishLaundryDrag() {
    draggedLaundryRecordId = "";
  }

  function handleLaundryDragOver(event: DragEvent, target: LaundryMoveTarget) {
    event.preventDefault();
    const record = draggedLaundryRecordId ? findLaundryRecord(draggedLaundryRecordId) : null;
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = record && laundryMoveTargets(record).includes(target) ? "move" : "none";
    }
  }

  function dropLaundryRecord(event: DragEvent, target: LaundryMoveTarget) {
    event.preventDefault();
    const recordId = event.dataTransfer?.getData("text/plain") || draggedLaundryRecordId;
    const record = recordId ? findLaundryRecord(recordId) : null;
    draggedLaundryRecordId = "";
    if (!recordId || !record) return;
    if (!laundryMoveTargets(record).includes(target)) {
      invalidDropTarget = target;
      setTimeout(() => {
        invalidDropTarget = null;
      }, 260);
    }
    onMoveLaundryRecord(recordId, target);
  }

  function openLaundryActions(event: MouseEvent, recordId: string) {
    event.preventDefault();
    laundryActionRecordId = laundryActionRecordId === recordId ? null : recordId;
  }

  function removeLaundryBlock(recordId: string) {
    laundryActionRecordId = null;
    onRemoveLaundryRecord(recordId);
  }

  function setAirportVanChoice(
    fieldName: "rideDirection" | "paymentMethod",
    value: AirportVanRideDirection | AirportVanPaymentMethod,
  ) {
    onSetAirportVanFormValue(fieldName, value);
  }

  function requestResetTemplateSettings() {
    if (!resetArmed) {
      resetArmed = true;
      return;
    }
    resetArmed = false;
    onResetTemplateSettings();
  }
</script>

<section class="work-surface" aria-label={menu.title}>
  <BackButton className="home-nav-back work-nav-back" label={menu.title} onBack={onBack} />

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

  {#if !selectedBranchReady}
    <div class="work-empty">
      <MaterialIcon name="domain" size={20} />
      <span>지점을 선택하여주십시오.</span>
    </div>
  {:else if menu.screenKind === "otaReservationInput"}
    <div class="source-segment" aria-label="예약 소스">
      {#each otaSourcePresentations as source}
        <span class:active={otaPreview?.draft.source === source.source}>{source.label}</span>
      {/each}
    </div>

    <section class="operation-card">
      <div class="operation-mark">
        <MaterialIcon name="travel_explore" size={28} />
      </div>
      <strong>예약정보 추출</strong>
      <button class="primary-action" type="button" disabled={loading} onclick={onLoadOtaPreview}>
        <MaterialIcon name="bolt" size={18} />
        <span>예약정보 가져오기</span>
      </button>
    </section>

    {#if otaPreview}
      <section class="data-card" aria-label="추출된 예약정보">
        <div class="data-card-head">
          <span>{getOtaLabel(otaPreview.draft.source)}</span>
          <b>{otaPreview.draft.sourceReservationId}</b>
        </div>
        <dl class="data-grid">
          <div><dt>고객명</dt><dd>{otaPreview.draft.guestName}</dd></div>
          <div><dt>일정</dt><dd>{otaPreview.draft.checkInDate} - {otaPreview.draft.checkOutDate}</dd></div>
          <div><dt>객실</dt><dd>{otaPreview.draft.roomTypeName || otaPreview.draft.roomTypeCode}</dd></div>
          <div><dt>금액</dt><dd>{otaPreview.draft.totalAmount || otaPreview.draft.roomFee}</dd></div>
        </dl>
      </section>
    {/if}

    <div class="work-dock">
      <button class="primary-action" type="button" disabled={loading || !otaPreview} onclick={onFillOtaPreview}>
        <MaterialIcon name="keyboard_return" size={18} />
        <span>WINGS 입력</span>
      </button>
    </div>
  {:else if menu.screenKind === "airportVan"}
    <section class="airport-van-panel" aria-label="공항밴 입력">
      <div class="source-segment" aria-label="이용 구분">
        {#each airportVanRideDirectionOptions as option}
          <button
            class:active={airportVanFormValues.rideDirection === option.value}
            type="button"
            onclick={() => setAirportVanChoice("rideDirection", option.value)}
          >
            {option.label}
          </button>
        {/each}
      </div>

      <section class="airport-route-card" aria-label="이동 경로">
        <label class="airport-route-point">
          <span>{airportRoutePointLabels.first}</span>
          <input
            value={airportVanFormValues.airportName || ""}
            placeholder={airportFieldPresentation("airportName").placeholder}
            oninput={(event) => handleAirportVanInput("airportName", event)}
          />
        </label>
        <span class="airport-route-switch" aria-hidden="true">
          <MaterialIcon name="arrow_downward" size={16} />
        </span>
        <label class="airport-route-point">
          <span>{airportRoutePointLabels.second}</span>
          <input
            value={airportVanFormValues.roomNo || ""}
            placeholder={airportFieldPresentation("roomNo").placeholder}
            oninput={(event) => handleAirportVanInput("roomNo", event)}
          />
        </label>
      </section>

      <section class="airport-field-grid compact" aria-label="탑승 정보">
        {#each airportVanMainFields as field}
          <label class="airport-field">
            <MaterialIcon name={field.icon} size={18} />
            <span>{airportFieldPresentation(field.name).label}</span>
            <input
              value={airportVanFormValues[field.name] || ""}
              placeholder={airportFieldPresentation(field.name).placeholder}
              oninput={(event) => handleAirportVanInput(field.name, event)}
            />
          </label>
        {/each}
      </section>

      <section class="airport-field-grid" aria-label="항공편 정보">
        {#each airportVanFlightFields as field}
          <label class="airport-field">
            <MaterialIcon name={field.icon} size={18} />
            <span>{airportFieldPresentation(field.name).label}</span>
            <input
              value={airportVanFormValues[field.name] || ""}
              placeholder={airportFieldPresentation(field.name).placeholder}
              oninput={(event) => handleAirportVanInput(field.name, event)}
            />
          </label>
        {/each}
      </section>

      <details class="work-disclosure">
        <summary>
          <span>인원 / 수하물 / 요청</span>
          <MaterialIcon name="expand_more" size={18} />
        </summary>
        <div class="airport-field-grid compact">
          {#each airportVanLuggageFields as field}
            <label class="airport-field">
              <MaterialIcon name={field.icon} size={18} />
              <span>{airportFieldPresentation(field.name).label}</span>
              <input
                value={airportVanFormValues[field.name] || ""}
                placeholder={airportFieldPresentation(field.name).placeholder}
                oninput={(event) => handleAirportVanInput(field.name, event)}
              />
            </label>
          {/each}
          <label class="airport-field wide">
            <MaterialIcon name="edit_note" size={18} />
            <span>{airportFieldPresentation("requestNote").label}</span>
            <input
              value={airportVanFormValues.requestNote || ""}
              placeholder={airportFieldPresentation("requestNote").placeholder}
              oninput={(event) => handleAirportVanInput("requestNote", event)}
            />
          </label>
        </div>
      </details>

      <section class="payment-grid" aria-label="결제수단">
          {#each airportVanPaymentOptions as option}
            <button
              class:active={airportVanFormValues.paymentMethod === option.value}
              type="button"
              onclick={() => setAirportVanChoice("paymentMethod", option.value)}
            >
              <MaterialIcon name={option.icon || "payments"} size={20} />
              {option.label}
            </button>
          {/each}
      </section>
    </section>

    <div class="work-dock">
      <button class="primary-action" type="button" disabled={loading} onclick={() => onCopyAirportVanText("workLog")}>
        <MaterialIcon name={copiedTemplateId === "airport-van-workLog" ? "check" : "assignment"} size={18} />
        <span>{copiedTemplateId === "airport-van-workLog" ? "업무 복사됨" : "업무 기록 복사"}</span>
      </button>
      <button class="primary-action" type="button" disabled={loading} onclick={() => onCopyAirportVanText("guestMessage")}>
        <MaterialIcon name={copiedTemplateId === "airport-van-guestMessage" ? "check" : "chat_bubble"} size={18} />
        <span>{copiedTemplateId === "airport-van-guestMessage" ? "고객 복사됨" : "고객 전달 복사"}</span>
      </button>
    </div>
  {:else if menu.screenKind === "laundry"}
    <section class="laundry-status-board" aria-label="진행 중">
      <h3>진행 중</h3>
      <div class="laundry-running-grid">
        {#each laundryActiveTargets as target}
          {@const column = laundryColumn(target)}
          <section
            class={`laundry-running ${draggedLaundryRecordId ? "drop-target" : ""} ${invalidDropTarget === target ? "invalid-drop" : ""}`}
            role="list"
            ondragover={(event) => handleLaundryDragOver(event, target)}
            ondrop={(event) => dropLaundryRecord(event, target)}
          >
            <header>
              <span>{column?.title}</span>
              <b>{column?.records.length || 0}</b>
            </header>
            <div class="laundry-room-chips">
              {#if column && column.records.length > 0}
                {#each column.records as record}
                  <button
                    class="laundry-chip"
                    type="button"
                    draggable="true"
                    oncontextmenu={(event) => openLaundryActions(event, record.id)}
                    ondragstart={(event) => startLaundryDrag(event, record)}
                    ondragend={finishLaundryDrag}
                  >
                    {laundryBlockTitle(record)}
                  </button>
                {/each}
              {:else}
                <span class="laundry-chip empty">없음</span>
              {/if}
            </div>
          </section>
        {/each}
      </div>
    </section>

    <section class="laundry-add-row" aria-label="세탁물 추가">
      <span class="laundry-add-icon" aria-hidden="true">
        <MaterialIcon name="add_notes" size={22} />
      </span>
      <input
        value={laundryInputValue}
        placeholder="세탁 서비스 신청 객실 입력"
        oninput={handleLaundryInput}
        onkeydown={(event) => {
          if (event.key === "Enter") createLaundryFromInput();
        }}
      />
      <button type="button" disabled={loading || !laundryInputValue.trim()} onclick={createLaundryFromInput} aria-label="세탁 블록 생성">
        <MaterialIcon name="chevron_right" size={20} />
      </button>
    </section>

    <section
      class={`laundry-scheduled ${draggedLaundryRecordId ? "drop-target" : ""} ${invalidDropTarget === laundryScheduledTarget ? "invalid-drop" : ""}`}
      aria-label="세탁 예정"
      ondragover={(event) => handleLaundryDragOver(event, laundryScheduledTarget)}
      ondrop={(event) => dropLaundryRecord(event, laundryScheduledTarget)}
    >
      <header>
        <h3>세탁 예정</h3>
        <b>{laundryColumnRecords(laundryScheduledTarget).length}</b>
      </header>
      <div class="laundry-task-list" role="list">
        {#if laundryColumnRecords(laundryScheduledTarget).length > 0}
          {#each laundryColumnRecords(laundryScheduledTarget) as record}
            <article
              class="laundry-task"
              draggable="true"
              role="listitem"
              oncontextmenu={(event) => openLaundryActions(event, record.id)}
              ondragstart={(event) => startLaundryDrag(event, record)}
              ondragend={finishLaundryDrag}
            >
              <div>
                <strong>{laundryBlockTitle(record)}</strong>
                <span>{record.itemSummary}</span>
              </div>
              <button type="button" aria-label="세탁 작업 메뉴" onclick={(event) => openLaundryActions(event, record.id)}>
                <MaterialIcon name="more_horiz" size={18} />
              </button>
              {#if laundryActionRecordId === record.id}
                <div class="laundry-context-actions">
                  <button type="button" disabled={loading} onclick={() => removeLaundryBlock(record.id)}>
                    <MaterialIcon name="delete_forever" size={15} />
                    <span>제거</span>
                  </button>
                </div>
              {/if}
            </article>
          {/each}
        {:else}
          <div class="column-empty">없음</div>
        {/if}
      </div>
    </section>

    <details
      class={`work-disclosure laundry-completed ${draggedLaundryRecordId ? "drop-target" : ""} ${invalidDropTarget === laundryCompletedTarget ? "invalid-drop" : ""}`}
      ondragover={(event) => handleLaundryDragOver(event, laundryCompletedTarget)}
      ondrop={(event) => dropLaundryRecord(event, laundryCompletedTarget)}
    >
      <summary>
        <span>완료</span>
        <b>{laundryColumnRecords(laundryCompletedTarget).length}</b>
        <MaterialIcon name="expand_more" size={18} />
      </summary>
      <div class="laundry-task-list" role="list">
        {#if laundryColumnRecords(laundryCompletedTarget).length > 0}
          {#each laundryColumnRecords(laundryCompletedTarget) as record}
            <article
              class="laundry-task"
              draggable="true"
              role="listitem"
              oncontextmenu={(event) => openLaundryActions(event, record.id)}
              ondragstart={(event) => startLaundryDrag(event, record)}
              ondragend={finishLaundryDrag}
            >
              <div>
                <strong>{laundryBlockTitle(record)}</strong>
                <span>{record.itemSummary}</span>
              </div>
            </article>
          {/each}
        {:else}
          <div class="column-empty">없음</div>
        {/if}
      </div>
    </details>

  {:else if menu.screenKind === "salesManagement"}
    <section class="sales-console" aria-label="매지출 입력">
      <section class="template-pick-list" aria-label="매지출 양식">
        {#each templates as template}
          <article class:active={copiedTemplateId === template.id} class="template-pick-row">
            <button type="button" onclick={() => onCopyTemplate(template.id)}>
              <span class="template-icon" aria-hidden="true">
                <MaterialIcon name={template.icon} size={18} />
              </span>
              <strong>{template.title}</strong>
            </button>
            <button
              class="copy-action"
              type="button"
              aria-label={getTemplateRequirement(template) || `${template.title} 복사`}
              disabled={loading || Boolean(getTemplateRequirement(template))}
              onclick={() => onCopyTemplate(template.id)}
            >
              <MaterialIcon name={copiedTemplateId === template.id ? "check" : "content_copy"} size={17} />
            </button>
          </article>
        {/each}
      </section>
    </section>
  {:else if menu.screenKind === "roomRemarkMemo"}
    <section class="room-memo-console" aria-label="객실 정보 메모">
      <header class="room-memo-head">
        <strong>{roomContextLabel || "객실 선택"}</strong>
        <span>{hasSelectedPmsRecord ? "선택됨" : "미선택"}</span>
      </header>

      {#if roomMemoFeaturedTemplates.length > 0}
        <section class="room-inventory-grid" aria-label="객실 물품 리마크">
          {#each roomMemoFeaturedTemplates as template}
            {@const variable = roomRemarkPrimaryVariable(template)}
            <article class:active={selectedTemplate?.id === template.id} class="inventory-stepper">
              <button class="inventory-main" type="button" onclick={() => chooseRoomRemarkTemplate(template.id)}>
                <span class="inventory-icon" aria-hidden="true">
                  <MaterialIcon name={template.icon} size={18} />
                </span>
                <strong>{template.title}</strong>
              </button>
              {#if variable?.name === "count"}
                <div class="inventory-count-stepper" aria-label={`${template.title} 수량`}>
                  <button type="button" disabled={loading || roomRemarkNumericValue(template) <= 0} aria-label={`${template.title} 감소`} onclick={() => adjustRoomRemarkCount(template, -1)}>-</button>
                  <output>{roomRemarkNumericValue(template)}</output>
                  <button type="button" disabled={loading} aria-label={`${template.title} 증가`} onclick={() => adjustRoomRemarkCount(template, 1)}>+</button>
                </div>
              {:else if variable}
                <input
                  value={templateValue(variable.name)}
                  placeholder={variable.label}
                  oninput={(event) => handleVariableInput(variable.name, event)}
                />
              {/if}
              <button
                class:applying={pendingRoomRemarkTemplateId === template.id}
                class="copy-action"
                type="button"
                aria-busy={pendingRoomRemarkTemplateId === template.id}
                aria-label={getTemplateRequirement(template) || `${template.title} WINGS 리마크 입력`}
                disabled={loading || Boolean(getTemplateRequirement(template))}
                onclick={() => applyRoomRemark(template.id)}
              >
                <MaterialIcon name={pendingRoomRemarkTemplateId === template.id ? "sync" : copiedTemplateId === template.id ? "check" : "edit_note"} size={17} />
              </button>
            </article>
          {/each}
        </section>
      {/if}

      {#if roomMemoOtherTemplates.length > 0}
        <section class="room-note-panel" aria-label="추가 리마크">
          <header>
            <strong>추가 리마크</strong>
          </header>
          <div class="template-list">
            {#each roomMemoOtherTemplates as template}
              <article class:expanded={expandedTemplateId === template.id} class="template-card">
                <button
                  aria-expanded={expandedTemplateId === template.id}
                  class="template-card-main"
                  type="button"
                  onclick={() => chooseRoomRemarkTemplate(template.id)}
                >
                  <div class="template-card-head">
                    <span class="template-icon" aria-hidden="true">
                      <MaterialIcon name={template.icon} size={18} />
                    </span>
                    <div>
                      <strong>{template.title}</strong>
                    </div>
                  </div>
                </button>
                {#if getManualVariables(template).length > 0}
                  <button
                    class="template-field-toggle"
                    type="button"
                    aria-label={`${template.title} 입력값`}
                    aria-expanded={expandedTemplateId === template.id}
                    onclick={() => chooseRoomRemarkTemplate(template.id)}
                  >
                    <MaterialIcon name="edit_note" size={16} />
                  </button>
                {/if}
                {#if expandedTemplateId === template.id && getManualVariables(template).length > 0}
                  <div class="template-input-panel">
                    {#each getManualVariables(template) as variable}
                      <label class:required={variable.kind === "manualRequired"} class="variable-field">
                        <span>{variable.label}</span>
                        <input
                          value={templateVariableValues[variable.name] || ""}
                          placeholder={variable.label}
                          oninput={(event) => handleVariableInput(variable.name, event)}
                        />
                      </label>
                    {/each}
                  </div>
                {/if}
                <button
                  class:applying={pendingRoomRemarkTemplateId === template.id}
                  class="copy-action"
                  type="button"
                  aria-busy={pendingRoomRemarkTemplateId === template.id}
                  aria-label={getTemplateRequirement(template) || `${template.title} WINGS 리마크 입력`}
                  disabled={loading || Boolean(getTemplateRequirement(template))}
                  onclick={() => applyRoomRemark(template.id)}
                >
                  <MaterialIcon name={pendingRoomRemarkTemplateId === template.id ? "sync" : copiedTemplateId === template.id ? "check" : "edit_note"} size={17} />
                </button>
              </article>
            {/each}
          </div>
        </section>
      {/if}
    </section>
  {:else if menu.screenKind === "templateSettings"}
    <section class="settings-panel">
      <header class="settings-editor-head">
        <span class="template-icon" aria-hidden="true">
          <MaterialIcon name={menu.icon} size={20} />
        </span>
        <strong>{menu.title}</strong>
      </header>
      {#if resetArmed}
        <p class="reset-confirmation">사용자 수정값이 삭제됩니다.</p>
      {/if}
      <button class="danger-action" type="button" disabled={loading} onclick={requestResetTemplateSettings}>
        <MaterialIcon name="restart_alt" size={18} />
        <span>{resetArmed ? "다시 눌러 초기화" : "템플릿 설정 초기화"}</span>
      </button>
    </section>
  {:else if menu.screenKind === "formSettings"}
    <section class="settings-panel">
      <header class="settings-editor-head">
        <span class="template-icon" aria-hidden="true">
          <MaterialIcon name={menu.icon} size={20} />
        </span>
        <strong>{menu.title}</strong>
      </header>
      {#if requiredManualVariables.length > 0}
        <section class="settings-inputs" aria-label="필수 입력값">
          <header>
            <strong>필수 입력값</strong>
          </header>
          <div class="variable-grid">
            {#each requiredManualVariables as variable}
              <label class="variable-field">
                <span>{variable.label}</span>
                <input
                  value={templateVariableValues[variable.name] || ""}
                  placeholder={variable.label}
                  oninput={(event) => handleVariableInput(variable.name, event)}
                />
              </label>
            {/each}
          </div>
        </section>
      {/if}
    </section>
  {:else if menu.screenKind === "settings"}
    <div class="work-empty">
      <MaterialIcon name={menu.icon} size={20} />
      <span>현재 설정 항목 없음</span>
    </div>
  {:else}
    {#if showLanguageSelector}
      <div class="language-strip" aria-label="템플릿 언어">
        {#each availableLanguages as language}
          <button
            class:active={selectedLanguage === language}
            type="button"
            onclick={() => onSelectLanguage(language)}
          >
            {languageLabel(language)}
          </button>
        {/each}
      </div>
    {/if}

    {#if templateGroups.length === 0}
      <div class="work-empty">
        <MaterialIcon name="description" size={20} />
        <span>현재 등록된 템플릿 없음, 필요한 탬플릿을 추가해주십시오.</span>
      </div>
    {:else}
    <div class="accordion-stack">
      {#each templateGroups as group}
        <details class="work-accordion" open>
          <summary>
            <span>{group.label}</span>
          </summary>
          <div class="template-list">
            {#each group.templates as template}
              <article class:expanded={expandedTemplateId === template.id} class="template-card">
                <button
                  aria-expanded={expandedTemplateId === template.id}
                  class="template-card-main"
                  type="button"
                  onclick={() => toggleTemplate(template.id)}
                >
                  <div class="template-card-head">
                    <span class="template-icon" aria-hidden="true">
                      <MaterialIcon name={template.icon} size={18} />
                    </span>
                    <div>
                      <strong>{template.title}</strong>
                    </div>
                  </div>
                </button>
                {#if getManualVariables(template).length > 0}
                  <button
                    class="template-field-toggle"
                    type="button"
                    aria-label={`${template.title} 입력값`}
                    aria-expanded={expandedTemplateId === template.id}
                    onclick={() => toggleTemplate(template.id)}
                  >
                    <MaterialIcon name="edit_note" size={16} />
                  </button>
                {/if}
                {#if expandedTemplateId === template.id && getManualVariables(template).length > 0}
                  <div class="template-input-panel">
                    {#each getManualVariables(template) as variable}
                      <label class:required={variable.kind === "manualRequired"} class="variable-field">
                        <span>{variable.label}</span>
                        <input
                          value={templateVariableValues[variable.name] || ""}
                          placeholder={variable.label}
                          oninput={(event) => handleVariableInput(variable.name, event)}
                        />
                      </label>
                    {/each}
                  </div>
                {/if}
                <button
                  class="copy-action"
                  type="button"
                  aria-label={getTemplateRequirement(template) || `${template.title} 복사`}
                  title={getTemplateRequirement(template) || "복사"}
                  disabled={loading || Boolean(getTemplateRequirement(template))}
                  onclick={() => onCopyTemplate(template.id)}
                >
                  <MaterialIcon name={copiedTemplateId === template.id ? "check" : "content_copy"} size={17} />
                </button>
              </article>
            {/each}
          </div>
        </details>
      {/each}
    </div>
    {/if}
  {/if}
</section>

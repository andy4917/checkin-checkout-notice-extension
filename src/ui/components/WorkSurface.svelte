<script lang="ts">
  import { getAvailableTemplateLanguages } from "../../catalog/template-renderer.js";
  import { resolveTemplateGroups } from "../../catalog/template-groups.js";
  import { settingsNavigationItems, settingsUtilityItems, usesWorkLanguageSelector } from "../../catalog/menu-routing.js";
  import type { MenuId, MenuItem } from "../../catalog/menu-routing.js";
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
    AirportVanTextFieldName,
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
  import {
    SALES_EXPENSE_CATEGORIES,
    formatSalesExpenseAmount,
    type SalesExpenseCategory,
  } from "../../application/sales-expense-form.js";
  import type { LaundryColumnView } from "../../application/laundry-records.js";
  import type { LaundryMoveTarget, LaundryRecord } from "../../laundry/types.js";
  import type { WorkRoomContext } from "../../domain/room-context.js";
  import type { Language } from "../../types.js";
  import {
    getManualVariables as resolveManualTemplateVariables,
    getTemplateRequirement as resolveTemplateRequirement,
  } from "../template-list-state.js";
  import * as BackButtonModule from "./BackButton.svelte";
  import * as MaterialIconModule from "./MaterialIcon.svelte";
  import * as RoomRemarkSurfaceModule from "./RoomRemarkSurface.svelte";

  const BackButton = BackButtonModule.default;
  const MaterialIcon = MaterialIconModule.default;
  const RoomRemarkSurface = RoomRemarkSurfaceModule.default;
  const airportVanRideDirectionOptions = AIRPORT_VAN_RIDE_DIRECTION_OPTIONS;
  const airportVanPaymentOptions = AIRPORT_VAN_PAYMENT_OPTIONS;
  const airportVanFieldPresentations = AIRPORT_VAN_FIELD_PRESENTATIONS;
  const getRoutePointLabels = getAirportVanRoutePointLabels;
  const laundryActiveTargets = LAUNDRY_ACTIVE_TARGETS;
  const laundryCompletedTarget = LAUNDRY_COMPLETED_TARGET;
  const laundryScheduledTarget = LAUNDRY_SCHEDULED_TARGET;
  const otaSourcePresentations = OTA_SOURCE_PRESENTATIONS;
  const getOtaLabel = getOtaSourceLabel;
  const salesExpenseCategories = SALES_EXPENSE_CATEGORIES;
  const settingsLinks = settingsNavigationItems;
  const settingsUtilities = settingsUtilityItems;
  const airportVanMainFields = [
    { name: "rideDate", icon: "calendar_today" },
    { name: "rideTime", icon: "schedule" },
    { name: "guestName", icon: "person" },
    { name: "guestContact", icon: "call" },
  ] satisfies readonly { name: AirportVanTextFieldName; icon: string }[];
  const airportVanFlightFields = [
    { name: "airportName", icon: "flight" },
    { name: "terminal", icon: "meeting_room" },
    { name: "flightNo", icon: "travel_explore" },
    { name: "flightTime", icon: "schedule" },
  ] satisfies readonly { name: AirportVanTextFieldName; icon: string }[];
  const airportVanLuggageFields = [
    { name: "passengerCount", icon: "person" },
    { name: "largeLuggageCount", icon: "luggage" },
    { name: "smallLuggageCount", icon: "luggage" },
  ] satisfies readonly { name: AirportVanTextFieldName; icon: string }[];
  type OtaPreviewRow = Readonly<{
    label: string;
    value: string;
  }>;

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
  export let workRoomContext: WorkRoomContext;
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
  export let onOpenMenu: (target: MenuId) => void;
  export let onSetTemplateVariableValue: (variableName: string, value: string) => void | Promise<void>;
  export let onUpdateTemplateOverride: (input: {
    templateId: string;
    title: string;
    language: Language;
    body: string;
  }) => void | Promise<void>;
  export let onSetAirportVanFormValue: (fieldName: keyof AirportVanFormValues, value: string) => void | Promise<void>;
  export let onCopyAirportVanText: (target: AirportVanCopyTarget) => void;
  export let onUpsertRoomRemark: (templateId: string) => void | Promise<void>;

  let resetArmed = false;
  let expandedTemplateId: string | null = null;
  let laundryInputValue = "";
  let draggedLaundryRecordId = "";
  let invalidDropTarget: LaundryMoveTarget | null = null;
  let laundryActionRecordId: string | null = null;
  let selectedSalesTemplateId = "";
  let templateEditorTemplateId = "";
  let templateEditorTitle = "";
  let templateEditorBody = "";
  let templateEditorDraftKey = "";

  $: templateGroups = resolveTemplateGroups(templates);
  $: availableLanguages = Array.from(
    new Set(templates.flatMap((template) => getAvailableTemplateLanguages(template))),
  ) as Language[];
  $: showLanguageSelector = usesWorkLanguageSelector(menu.id) && availableLanguages.length > 0;
  $: airportRoutePointLabels = getRoutePointLabels(airportVanFormValues.rideDirection);
  $: if (
    menu.screenKind === "salesManagement" &&
    (!selectedSalesTemplateId || !templates.some((template) => template.id === selectedSalesTemplateId)) &&
    templates[0]
  ) {
    selectedSalesTemplateId = templates[0].id;
  }
  $: selectedSalesTemplate = templates.find((template) => template.id === selectedSalesTemplateId) || templates[0] || null;
  $: if (
    menu.screenKind === "templateSettings" &&
    (!templateEditorTemplateId || !templates.some((template) => template.id === templateEditorTemplateId)) &&
    templates[0]
  ) {
    templateEditorTemplateId = templates[0].id;
  }
  $: templateEditorTemplate = templates.find((template) => template.id === templateEditorTemplateId) || templates[0] || null;
  $: templateEditorCurrentKey = `${templateEditorTemplate?.id || ""}:${selectedLanguage}`;
  $: if (menu.screenKind === "templateSettings" && templateEditorTemplate && templateEditorDraftKey !== templateEditorCurrentKey) {
    templateEditorTitle = templateEditorTemplate.title;
    templateEditorBody = templateEditorTemplate.languages[selectedLanguage] || "";
    templateEditorDraftKey = templateEditorCurrentKey;
  }
  $: branchRequiredForMenu = requiresBranchSelection(menu.screenKind);

  function requiresBranchSelection(screenKind: MenuItem["screenKind"]): boolean {
    return screenKind !== "settings";
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

  function airportFieldPresentation(fieldName: AirportVanTextFieldName) {
    return airportVanFieldPresentations[fieldName];
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

  function templateManualVariables(template: UnifiedTemplateDefinition): TemplateVariable[] {
    return resolveManualTemplateVariables(template);
  }

  function templateValue(variableName: string): string {
    return templateVariableValues[variableName] || templateValues[variableName] || "";
  }

  function salesCategoryActive(category: SalesExpenseCategory): boolean {
    return templateValue("salesItem") === category.itemValue || templateValue("itemName") === category.itemValue;
  }

  async function selectSalesCategory(category: SalesExpenseCategory) {
    await onSetTemplateVariableValue("salesItem", category.itemValue);
    await onSetTemplateVariableValue("itemName", category.itemValue);
  }

  async function handleSalesInput(variableName: string, event: Event) {
    await onSetTemplateVariableValue(variableName, (event.currentTarget as HTMLInputElement | HTMLTextAreaElement).value);
  }

  function handleTemplateEditorTemplateChange(event: Event) {
    templateEditorTemplateId = (event.currentTarget as HTMLSelectElement).value;
  }

  function handleTemplateEditorTitle(event: Event) {
    templateEditorTitle = (event.currentTarget as HTMLInputElement).value;
  }

  function handleTemplateEditorBody(event: Event) {
    templateEditorBody = (event.currentTarget as HTMLTextAreaElement).value;
  }

  function saveTemplateEditor() {
    if (!templateEditorTemplate || !templateEditorTitle.trim()) return;
    onUpdateTemplateOverride({
      templateId: templateEditorTemplate.id,
      title: templateEditorTitle,
      language: selectedLanguage,
      body: templateEditorBody,
    });
  }

  function salesAmountDisplay(): string {
    return formatSalesExpenseAmount(templateValue("amount"));
  }

  function otaDateRange(): string {
    if (!otaPreview) return "";
    return [otaPreview.draft.checkInDate, otaPreview.draft.checkOutDate].filter(Boolean).join(" - ");
  }

  function otaRoomLabel(): string {
    if (!otaPreview) return "";
    return otaPreview.draft.roomTypeName || otaPreview.draft.roomTypeCode || "";
  }

  function otaAmountLabel(): string {
    if (!otaPreview) return "";
    return otaPreview.draft.totalAmount || otaPreview.draft.roomFee || "";
  }

  function appendOtaPreviewRow(rows: OtaPreviewRow[], label: string, value: string | undefined) {
    const trimmedValue = value?.trim();
    if (!trimmedValue) return;
    rows.push({ label, value: trimmedValue });
  }

  function otaPreviewHeaderMeta(): string {
    if (!otaPreview) return "";
    return [
      getOtaLabel(otaPreview.draft.source),
      otaPreview.draft.sourceReservationId.trim(),
    ].filter(Boolean).join(" ");
  }

  function otaPreviewRows(): OtaPreviewRow[] {
    if (!otaPreview) return [];
    const rows: OtaPreviewRow[] = [];
    appendOtaPreviewRow(rows, "예약처", getOtaLabel(otaPreview.draft.source));
    appendOtaPreviewRow(rows, "예약번호", otaPreview.draft.sourceReservationId);
    appendOtaPreviewRow(rows, "고객명", otaPreview.draft.guestName);
    appendOtaPreviewRow(rows, "일정", otaDateRange());
    appendOtaPreviewRow(rows, "객실", otaRoomLabel());
    appendOtaPreviewRow(rows, "금액", otaAmountLabel());

    const fieldCount = Object.values(otaPreview.fields).filter((value) => value.trim().length > 0).length;
    if (fieldCount > 0) {
      rows.push({ label: "입력 필드", value: `${fieldCount}개` });
    }
    return rows;
  }

  function copySelectedSalesTemplate() {
    if (!selectedSalesTemplate) return;
    onCopyTemplate(selectedSalesTemplate.id);
  }

  function toggleTemplate(templateId: string) {
    expandedTemplateId = expandedTemplateId === templateId ? null : templateId;
  }

  async function handleVariableInput(variableName: string, event: Event) {
    await onSetTemplateVariableValue(variableName, (event.currentTarget as HTMLInputElement).value);
  }

  async function handleAirportVanInput(fieldName: keyof AirportVanFormValues, event: Event) {
    await onSetAirportVanFormValue(fieldName, (event.currentTarget as HTMLInputElement).value);
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

  async function setAirportVanChoice(
    fieldName: "rideDirection" | "paymentMethod",
    value: AirportVanRideDirection | AirportVanPaymentMethod,
  ) {
    await onSetAirportVanFormValue(fieldName, value);
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

  {#if branchRequiredForMenu && !selectedBranchReady}
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

    <section class="operation-card ota-fetch-card" aria-label="예약정보 추출">
      <strong>예약정보 추출</strong>
      <button class="primary-action" type="button" disabled={loading} onclick={onLoadOtaPreview}>
        <MaterialIcon name="bolt" size={18} />
        <span>예약정보 가져오기</span>
      </button>
    </section>

    {#if otaPreview}
      {@const previewRows = otaPreviewRows()}
      <section class="data-card ota-preview-card" aria-label="추출된 예약정보">
        <div class="data-card-head">
          <strong>추출된 예약정보</strong>
          <span>{otaPreviewHeaderMeta()}</span>
        </div>
        <dl class="data-grid">
          {#each previewRows as row}
            <div>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          {/each}
        </dl>
      </section>

      <div class="work-dock">
        <button class="primary-action" type="button" disabled={loading} onclick={onFillOtaPreview}>
          <MaterialIcon name="keyboard_return" size={18} />
          <span>WINGS 입력</span>
        </button>
      </div>
    {/if}
  {:else if menu.screenKind === "airportVan"}
    <section class="airport-van-panel" aria-label="공항밴 입력">
      <div class="source-segment" aria-label="이용 구분">
        {#each airportVanRideDirectionOptions as option}
          <button
            class:active={airportVanFormValues.rideDirection === option.value}
            type="button"
            disabled={loading}
            onclick={() => setAirportVanChoice("rideDirection", option.value)}
          >
            {option.label}
          </button>
        {/each}
      </div>

      <h3 class="work-section-title">이동 경로</h3>
      <section class="airport-route-card" aria-label="이동 경로">
        <label class="airport-route-point">
          <span>{airportRoutePointLabels.first}</span>
          <input
            value={airportVanFormValues.airportName || ""}
            aria-label={airportFieldPresentation("airportName").label}
            disabled={loading}
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
            aria-label={airportFieldPresentation("roomNo").label}
            disabled={loading}
            oninput={(event) => handleAirportVanInput("roomNo", event)}
          />
        </label>
      </section>

      <h3 class="work-section-title">탑승 정보</h3>
      <section class="airport-field-grid compact" aria-label="탑승 정보">
        {#each airportVanMainFields as field}
          <label class="airport-field">
            <MaterialIcon name={field.icon} size={18} />
            <span>{airportFieldPresentation(field.name).label}</span>
            <input
              value={airportVanFormValues[field.name] || ""}
              aria-label={airportFieldPresentation(field.name).label}
              disabled={loading}
              oninput={(event) => handleAirportVanInput(field.name, event)}
            />
          </label>
        {/each}
      </section>

      <h3 class="work-section-title">항공편 정보</h3>
      <section class="airport-field-grid flight-grid" aria-label="항공편 정보">
        {#each airportVanFlightFields as field}
          <label class="airport-field">
            <MaterialIcon name={field.icon} size={18} />
            <span>{airportFieldPresentation(field.name).label}</span>
            <input
              value={airportVanFormValues[field.name] || ""}
              aria-label={airportFieldPresentation(field.name).label}
              disabled={loading}
              oninput={(event) => handleAirportVanInput(field.name, event)}
            />
          </label>
        {/each}
      </section>

      <h3 class="work-section-title">결제수단</h3>
      <section class="payment-grid" aria-label="결제수단">
          {#each airportVanPaymentOptions as option}
            <button
              class:active={airportVanFormValues.paymentMethod === option.value}
              type="button"
              disabled={loading}
              onclick={() => setAirportVanChoice("paymentMethod", option.value)}
            >
              <MaterialIcon name={option.icon || "payments"} size={20} />
              {option.label}
            </button>
          {/each}
      </section>

      <div class="work-dock">
        <button class="primary-action" type="button" disabled={loading} onclick={() => onCopyAirportVanText("workLog")}>
          <MaterialIcon name={copiedTemplateId === "airport-van-workLog" ? "check" : "assignment"} size={18} />
          <span>업무 기록 복사</span>
        </button>
        <button class="primary-action" type="button" disabled={loading} onclick={() => onCopyAirportVanText("guestMessage")}>
          <MaterialIcon name={copiedTemplateId === "airport-van-guestMessage" ? "check" : "chat_bubble"} size={18} />
          <span>고객 전달 복사</span>
        </button>
      </div>

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
                aria-label={airportFieldPresentation(field.name).label}
                disabled={loading}
                oninput={(event) => handleAirportVanInput(field.name, event)}
              />
            </label>
          {/each}
          <label class="airport-field wide">
            <MaterialIcon name="edit_note" size={18} />
            <span>{airportFieldPresentation("requestNote").label}</span>
            <input
              value={airportVanFormValues.requestNote || ""}
              aria-label={airportFieldPresentation("requestNote").label}
              disabled={loading}
              oninput={(event) => handleAirportVanInput("requestNote", event)}
            />
          </label>
        </div>
      </details>
    </section>
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
      <label class="laundry-add-field">
        <span>세탁 서비스 신청 객실 입력</span>
        <input
          value={laundryInputValue}
          aria-label="세탁 서비스 신청 객실 입력"
          oninput={handleLaundryInput}
          onkeydown={(event) => {
            if (event.key === "Enter") createLaundryFromInput();
          }}
        />
      </label>
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
        {/if}
      </div>
    </details>

  {:else if menu.screenKind === "salesManagement"}
    <section class="sales-console" aria-label="매지출 입력">
      <section class="sales-amount-panel" aria-label="매지출 금액">
        <span>새 지출</span>
        <label>
          <b aria-hidden="true">₩</b>
          <input
            value={templateValue("amount")}
            aria-label="매지출 금액"
            inputmode="numeric"
            disabled={loading}
            oninput={(event) => handleSalesInput("amount", event)}
          />
        </label>
        <output aria-label="표시 금액">{salesAmountDisplay()}</output>
      </section>

      <section class="sales-category-panel" aria-label="매지출 카테고리">
        <strong>카테고리</strong>
        <div>
          {#each salesExpenseCategories as category}
            <button
              class:active={salesCategoryActive(category)}
              type="button"
              disabled={loading}
              onclick={() => selectSalesCategory(category)}
            >
              {category.label}
            </button>
          {/each}
        </div>
      </section>

      <label class="sales-detail-panel">
        <span>상세 <small>(선택)</small></span>
        <textarea
          value={templateValue("memo")}
          aria-label="매지출 상세 메모"
          rows="4"
          disabled={loading}
          oninput={(event) => handleSalesInput("memo", event)}
        ></textarea>
      </label>

      <div class="work-dock">
        <button
          class="primary-action"
          type="button"
          disabled={loading || !selectedSalesTemplate}
          onclick={copySelectedSalesTemplate}
        >
          <MaterialIcon name={copiedTemplateId === selectedSalesTemplate?.id ? "check" : "content_copy"} size={18} />
          <span>매지출 보고 복사</span>
        </button>
      </div>

      {#if templates.length > 1}
        <section class="sales-template-panel" aria-label="보고 양식">
          {#each templates as template}
            <button
              class:active={selectedSalesTemplate?.id === template.id}
              type="button"
              onclick={() => (selectedSalesTemplateId = template.id)}
            >
              {template.title}
            </button>
          {/each}
        </section>
      {/if}
    </section>
  {:else if menu.screenKind === "roomRemarkMemo"}
    <RoomRemarkSurface
      templates={templates}
      templateValues={templateValues}
      templateVariableValues={templateVariableValues}
      workRoomContext={workRoomContext}
      copiedTemplateId={copiedTemplateId}
      loading={loading}
      onSetTemplateVariableValue={onSetTemplateVariableValue}
      onUpsertRoomRemark={onUpsertRoomRemark}
    />
  {:else if menu.screenKind === "settings"}
    <section class="settings-panel" aria-label="설정">
      <header class="settings-surface-head">
        <strong>운영 설정</strong>
        <span>하단바 유틸리티</span>
      </header>

      <section class="settings-section" aria-labelledby="settings-utility-title">
        <header>
          <strong id="settings-utility-title">운영 경계</strong>
        </header>
        <div class="settings-utility-list">
          {#each settingsUtilities as item}
            <article class="settings-utility-row">
              <span class="template-icon" aria-hidden="true">
                <MaterialIcon name={item.icon} size={20} />
              </span>
              <div>
                <strong>{item.title}</strong>
                <span>{item.description}</span>
              </div>
            </article>
          {/each}
        </div>
      </section>

      <section class="settings-section" aria-labelledby="settings-shortcut-title">
        <header>
          <strong id="settings-shortcut-title">편집 바로가기</strong>
        </header>
        <div class="settings-shortcut-list">
          {#each settingsLinks as item}
            <button class="settings-link-row" type="button" onclick={() => onOpenMenu(item.menuId)}>
              <span class="template-icon" aria-hidden="true">
                <MaterialIcon name={item.icon} size={20} />
              </span>
              <span class="settings-link-copy">
                <strong>{item.title}</strong>
                <span>{item.description}</span>
              </span>
              <MaterialIcon name="chevron_right" size={18} />
            </button>
          {/each}
        </div>
      </section>
    </section>
  {:else if menu.screenKind === "templateSettings"}
    <section class="template-editor-panel" aria-label="안내문 편집 / 빠른답변 편집">
      <div class="template-editor-controls">
        <label>
          <span>템플릿</span>
          <select value={templateEditorTemplate?.id || ""} onchange={handleTemplateEditorTemplateChange}>
            {#each templates as template}
              <option value={template.id}>{template.title}</option>
            {/each}
          </select>
        </label>
        <div class="language-strip template-editor-language" aria-label="템플릿 언어">
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
      </div>

      {#if templateEditorTemplate}
        <section class="template-editor-card">
          <header>
            <strong>안내문 / 빠른답변 편집</strong>
            <span>{templateEditorTemplate.audience === "internal" ? "업무" : "고객"}</span>
          </header>
          <label class="template-editor-field">
            <span>제목</span>
            <input
              value={templateEditorTitle}
              aria-label="템플릿 제목"
              oninput={handleTemplateEditorTitle}
            />
          </label>
          <label class="template-editor-field">
            <span>본문</span>
            <textarea
              value={templateEditorBody}
              aria-label="템플릿 본문"
              rows="9"
              oninput={handleTemplateEditorBody}
            ></textarea>
          </label>
          <button
            class="primary-action"
            type="button"
            disabled={loading || !templateEditorTitle.trim()}
            onclick={saveTemplateEditor}
          >
            <MaterialIcon name="save" size={18} />
            <span>저장하기</span>
          </button>
        </section>
      {/if}

      <section class="active-template-list" aria-label="활성 템플릿">
        <header>
          <strong>활성 템플릿</strong>
        </header>
        {#each templates.slice(0, 6) as template}
          <button
            class:active={templateEditorTemplate?.id === template.id}
            type="button"
            onclick={() => (templateEditorTemplateId = template.id)}
          >
            <span>{template.title}</span>
            <small>{getAvailableTemplateLanguages(template).map(languageLabel).join(" ")}</small>
          </button>
        {/each}
      </section>

      {#if resetArmed}
        <p class="reset-confirmation">사용자 수정값이 삭제됩니다.</p>
      {/if}
      <button class="danger-action" type="button" disabled={loading} onclick={requestResetTemplateSettings}>
        <MaterialIcon name="restart_alt" size={18} />
        <span>{resetArmed ? "다시 눌러 초기화" : "템플릿 설정 초기화"}</span>
      </button>
    </section>
  {:else if menu.screenKind === "formSettings"}
    <section class="settings-panel" aria-label="업무 양식 편집">
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
                  aria-label={variable.label}
                  disabled={loading}
                  oninput={(event) => handleVariableInput(variable.name, event)}
                />
              </label>
            {/each}
          </div>
        </section>
      {/if}
    </section>
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
        <span>등록된 템플릿이 없습니다.</span>
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
                {#if templateManualVariables(template).length > 0}
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
                {#if expandedTemplateId === template.id && templateManualVariables(template).length > 0}
                  <div class="template-input-panel">
                    {#each templateManualVariables(template) as variable}
                      <label class:required={variable.kind === "manualRequired"} class="variable-field">
                        <span>{variable.label}</span>
                        <input
                          value={templateVariableValues[variable.name] || ""}
                          aria-label={variable.label}
                          disabled={loading}
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

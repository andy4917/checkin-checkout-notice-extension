<script lang="ts">
  import { onMount } from "svelte";
  import { getBranchOptions, isBranchId } from "../config/branches.js";
  import { guardRequiredContext } from "../application/context-guard.js";
  import { syncGuests } from "../application/sync-guests.js";
  import {
    addLaundryRecord,
    queryLaundryRecords,
    updateLaundryStatus,
  } from "../application/laundry-records.js";
  import {
    getAvailableTemplateLanguages,
    hasTemplateLanguage,
    renderTemplate,
  } from "../catalog/template-renderer.js";
  import {
    UNIFIED_TEMPLATE_CATALOG,
    applyStoredUnifiedTemplateState,
    scopeUnifiedTemplateForBranch,
  } from "../catalog/template-catalog.js";
  import {
    filterTemplatesForMenu,
    getMenu,
    getTabsForMenu,
    matchesTemplateTab,
    menuGroups,
    settingsMenu,
    type MenuId,
  } from "../catalog/menu-routing.js";
  import {
    ALL_BRANCH_IDS,
    TemplateCatalogSchemaError,
    createCustomTemplateDefinition,
    normalizeBranchScope,
    validateTemplateDefinitionForSave,
  } from "../catalog/template-schema.js";
  import { getBusinessDateParts } from "../domain/dates.js";
  import { filterPmsGuestRecords } from "../domain/guests.js";
  import { createRemarkLine, getBuiltInRemarkType } from "../domain/remarks.js";
  import {
    fillWingsReservationFromPreview,
    loadOtaReservationPreview,
    type OtaReservationInputPreview,
  } from "../application/ota-reservation-input.js";
  import {
    STORAGE_CORRUPTION_RECOVERY_MESSAGE,
    readExtensionStateWithRecovery,
    setLastBranchId,
    writeExtensionState,
  } from "../platform/chrome-storage.js";
  import { getActiveTabContext, type TabContext, EMPTY_TAB_CONTEXT } from "../platform/tab-context.js";
  import type { BranchId, Language, PmsGuestRecord, TabMode } from "../types.js";
  import type { LaundryRecord, LaundryStatus } from "../laundry/types.js";
  import { DEFAULT_EXTENSION_STATE } from "../platform/storage-schema.js";
  import type {
    StoredExtensionState,
    TemplateAudience,
    TemplateCategory,
    TemplateContextRequirement,
    TemplateDefinition,
    UnifiedTemplateDefinition,
  } from "../catalog/template-types.js";

  const branchDisplayLabels: Record<BranchId, string> = {
    coex: "The Coex",
    gangnam: "The Gangnam",
    seolleung: "The Seolleung",
  };

  const homeMenuGroups = menuGroups;
  const homeSettingsMenu = settingsMenu;

  const branchOptions = getBranchOptions().map((branch) => ({
    ...branch,
    label: branchDisplayLabels[branch.id],
  }));

  const languages: Array<{ id: Language; label: string }> = [
    { id: "KO", label: "한국어" },
    { id: "EN", label: "English" },
    { id: "JP", label: "日本語" },
    { id: "CN", label: "中文" },
  ];

  const categoryOptions: Array<{ id: TemplateCategory; label: string }> = [
    { id: "CUSTOMER_RECORDS", label: "객실 정보 메모" },
    { id: "GUEST_NOTICE", label: "고객 안내문" },
    { id: "QUICK_REPLY", label: "빠른 문의 답변" },
    { id: "WORK_TEMPLATE", label: "업무보고 생성" },
  ];

  const audienceOptions: Array<{ id: TemplateAudience; label: string }> = [
    { id: "guest", label: "고객" },
    { id: "internal", label: "내부" },
    { id: "pmsRemark", label: "객실 메모" },
  ];

  const contextOptions: Array<{ id: TemplateContextRequirement; label: string }> = [
    { id: "none", label: "없음" },
    { id: "pmsPage", label: "WINGS" },
    { id: "guestRecord", label: "고객정보" },
  ];

  let activeMenu: MenuId | null = null;
  let selectedTabId = "all";
  let selectedBranchId: BranchId | "" = "";
  let selectedLanguage: Language = "KO";
  let tabContext: TabContext = { ...EMPTY_TAB_CONTEXT };
  let storedState: StoredExtensionState = { ...DEFAULT_EXTENSION_STATE };
  let catalogTemplates: UnifiedTemplateDefinition[] = [...UNIFIED_TEMPLATE_CATALOG];
  let statusMessage = "지점을 선택하고 메뉴를 열어주세요.";
  let copiedTemplateId = "";
  let settingsTemplateId = UNIFIED_TEMPLATE_CATALOG[0]?.id || "";
  let editTitle = "";
  let editBody = "";
  let editBranchScope: Record<BranchId, boolean> = createBranchScopeSelection();
  let newCategory: TemplateCategory = "GUEST_NOTICE";
  let newAudience: TemplateAudience = "guest";
  let newContext: TemplateContextRequirement = "none";
  let newTitle = "";
  let newBody = "";
  let newBranchScope: Record<BranchId, boolean> = createBranchScopeSelection();
  let pmsMode: TabMode = "ARRIVAL";
  let pmsQueryDate = getBusinessDateParts().apiDate;
  let pmsRecords: PmsGuestRecord[] = [];
  let pmsSearchTerm = "";
  let pmsLoading = false;
  let selectedPmsRecordId = "";
  let templateDraftValues: Record<string, Record<string, string>> = {};
  let laundryRecords: LaundryRecord[] = [];
  let laundryItemSummary = "";
  let laundryNote = "";
  let laundrySearchTerm = "";
  let laundryStatusFilter: LaundryStatus | "ALL" = "ALL";
  let laundryLoading = false;
  let otaLoading = false;
  let otaPreview: OtaReservationInputPreview | null = null;

  $: selectedMenu = activeMenu ? getMenu(activeMenu) : null;
  $: navigationLocked = hasSettingsDraft();
  $: menuTemplates =
    activeMenu && activeMenu !== "SETTINGS" && activeMenu !== "OTA_RESERVATION_INPUT"
      ? filterTemplatesForMenu(activeMenu, catalogTemplates)
      : [];
  $: activeTabs =
    activeMenu && activeMenu !== "SETTINGS" && activeMenu !== "OTA_RESERVATION_INPUT"
      ? getTabsForMenu(activeMenu)
      : [];
  $: if (
    activeMenu &&
    activeMenu !== "SETTINGS" &&
    activeMenu !== "OTA_RESERVATION_INPUT" &&
    activeTabs.length > 0 &&
    !activeTabs.some((tab) => tab.id === selectedTabId)
  ) {
    selectedTabId = activeTabs[0].id;
  }
  $: scopedTemplates = selectedBranchId
    ? menuTemplates
        .filter((template) => template.branchScope.includes(selectedBranchId))
        .map((template) => scopeUnifiedTemplateForBranch(template, selectedBranchId))
    : menuTemplates;
  $: activeTemplates =
    activeMenu && activeMenu !== "SETTINGS"
      && activeMenu !== "OTA_RESERVATION_INPUT"
      ? scopedTemplates.filter((template) => matchesTemplateTab(activeMenu, selectedTabId, template))
      : [];
  $: if (
    activeMenu &&
    activeMenu !== "SETTINGS" &&
    activeMenu !== "OTA_RESERVATION_INPUT" &&
    activeTemplates.length > 0 &&
    !hasAnyTemplateForLanguage(activeTemplates, selectedLanguage)
  ) {
    selectedLanguage = getFirstAvailableLanguage(activeTemplates) || selectedLanguage;
  }
  $: visiblePmsRecords = filterPmsGuestRecords(pmsRecords, pmsSearchTerm);
  $: selectedPmsRecord =
    pmsRecords.find((record) => record.id === selectedPmsRecordId) || null;
  $: filteredLaundryRecords = laundryRecords.filter((record) => {
    if (laundryStatusFilter !== "ALL" && record.status !== laundryStatusFilter) return false;
    const term = laundrySearchTerm.trim().toLowerCase();
    if (!term) return true;
    return [
      record.guestName,
      record.roomNo,
      record.displayRoom,
      record.itemSummary,
      record.note,
      laundryStatusLabel(record.status),
    ].join(" ").toLowerCase().includes(term);
  });

  onMount(async () => {
    activeMenu = null;
    selectedTabId = "all";
    tabContext = await getActiveTabContext();
    try {
      const { state: storedState, recovered } = await readExtensionStateWithRecovery();
      if (storedState.lastBranchId) {
        selectedBranchId = storedState.lastBranchId;
      }
      applyState(storedState);
      if (recovered) {
        statusMessage = STORAGE_CORRUPTION_RECOVERY_MESSAGE;
      }
    } catch (error) {
      statusMessage = error instanceof Error ? error.message : String(error);
    }
  });

  async function handleBranchChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    selectedBranchId = isBranchId(target.value) ? target.value : "";
    resetRoomContextState();
    if (selectedBranchId) {
      await setLastBranchId(selectedBranchId);
      statusMessage = "선택 지점을 저장했습니다.";
      if (activeMenu === "LAUNDRY_MANAGEMENT") {
        await loadLaundryRecords();
      }
    } else {
      laundryRecords = [];
      statusMessage = "지점을 선택해주세요.";
    }
  }

  function handleLanguageChange(event: Event) {
    selectedLanguage = (event.target as HTMLSelectElement).value as Language;
    refreshEditFields(settingsTemplateId);
  }

  function openMenu(menuId: MenuId) {
    if (navigationLocked) {
      statusMessage = "작성 또는 설정 중에는 이동할 수 없습니다.";
      return;
    }
    activeMenu = menuId;
    selectedTabId = "all";
    copiedTemplateId = "";
    if (menuId === "SETTINGS") {
      refreshEditFields(settingsTemplateId);
    }
    if (menuId === "OTA_RESERVATION_INPUT") {
      otaPreview = null;
    }
    if (menuId === "LAUNDRY_MANAGEMENT") {
      void loadLaundryRecords();
    }
    statusMessage =
      menuId === "SETTINGS"
        ? "수정할 항목을 선택해주세요."
        : menuId === "OTA_RESERVATION_INPUT"
          ? "OTA 상세 예약 탭에서 예약정보를 가져오세요."
          : "템플릿을 선택해 복사하세요.";
    scrollToTop();
  }

  function goBack() {
    if (navigationLocked) {
      statusMessage = "저장하거나 취소한 뒤 이동할 수 있습니다.";
      return;
    }
    activeMenu = null;
    selectedTabId = "all";
    copiedTemplateId = "";
    statusMessage = "시작화면으로 돌아왔습니다.";
    scrollToTop();
  }

  function goHome() {
    goBack();
  }

  function selectTab(tabId: string) {
    selectedTabId = tabId;
    copiedTemplateId = "";
    scrollToTop();
  }

  async function selectPmsMode(mode: TabMode) {
    if (pmsMode === mode) return;
    pmsMode = mode;
    selectedPmsRecordId = "";
    templateDraftValues = {};
    await syncPmsGuestRecords();
  }

  async function syncPmsGuestRecords() {
    if (!selectedBranchId) {
      pmsRecords = [];
      statusMessage = "지점을 선택해주세요.";
      return;
    }

    pmsLoading = true;
    statusMessage = "객실 목록을 불러오는 중입니다.";
    try {
      const result = await syncGuests({
        date: pmsQueryDate,
        mode: pmsMode,
        branchId: selectedBranchId,
        searchTerm: pmsSearchTerm,
      });
      pmsRecords = result.records;
      if (!pmsRecords.some((record) => record.id === selectedPmsRecordId)) {
        selectedPmsRecordId = "";
        templateDraftValues = {};
      }
      statusMessage = `객실 ${result.records.length}건을 불러왔습니다.`;
    } catch (error) {
      pmsRecords = [];
      statusMessage = error instanceof Error ? error.message : String(error);
    } finally {
      pmsLoading = false;
    }
  }

  function handlePmsSearchChange(event: Event) {
    pmsSearchTerm = (event.target as HTMLInputElement).value;
  }

  function selectPmsRecord(record: PmsGuestRecord) {
    if (selectedPmsRecordId !== record.id) {
      templateDraftValues = {};
      copiedTemplateId = "";
    }
    selectedPmsRecordId = record.id;
    if (!laundryItemSummary && activeMenu === "LAUNDRY_MANAGEMENT") {
      laundryNote = laundryNote || record.guestName;
    }
    statusMessage = `${record.displayRoom || record.roomNo} ${record.guestName || ""}`.trim()
      ? `${record.displayRoom || record.roomNo} ${record.guestName || ""}`.trim() + " 선택"
      : "객실을 선택했습니다.";
  }

  async function loadLaundryRecords() {
    laundryLoading = true;
    try {
      laundryRecords = await queryLaundryRecords({
        branchId: selectedBranchId || undefined,
      });
      statusMessage = `세탁물 ${laundryRecords.length}건을 불러왔습니다.`;
    } catch (error) {
      laundryRecords = [];
      statusMessage = error instanceof Error ? error.message : String(error);
    } finally {
      laundryLoading = false;
    }
  }

  async function addLaundry() {
    if (!selectedBranchId) {
      statusMessage = "지점을 선택해주세요.";
      return;
    }
    if (!laundryItemSummary.trim()) {
      statusMessage = "세탁물 내용을 입력해주세요.";
      return;
    }

    laundryLoading = true;
    try {
      await addLaundryRecord({
        branchId: selectedBranchId,
        guestName: selectedPmsRecord?.guestName || templateDraftValue("laundry-complete-message", "guestName"),
        roomNo: selectedPmsRecord?.roomNo || templateDraftValue("laundry-complete-message", "roomNo"),
        displayRoom:
          selectedPmsRecord?.displayRoom ||
          templateDraftValue("laundry-complete-message", "roomNo"),
        itemSummary: laundryItemSummary,
        note: laundryNote,
        sourcePmsGuestId: selectedPmsRecord?.id,
      });
      laundryItemSummary = "";
      laundryNote = "";
      await loadLaundryRecords();
      statusMessage = "세탁물 기록을 추가했습니다.";
    } catch (error) {
      statusMessage = error instanceof Error ? error.message : String(error);
    } finally {
      laundryLoading = false;
    }
  }

  async function setLaundryStatus(record: LaundryRecord, status: LaundryStatus) {
    laundryLoading = true;
    try {
      await updateLaundryStatus(record.id, status);
      await loadLaundryRecords();
      statusMessage = "세탁물 상태를 변경했습니다.";
    } catch (error) {
      statusMessage = error instanceof Error ? error.message : String(error);
    } finally {
      laundryLoading = false;
    }
  }

  async function loadOtaReservation() {
    if (!selectedBranchId) {
      statusMessage = "지점을 선택해주세요.";
      return;
    }

    otaLoading = true;
    statusMessage = "OTA 예약정보를 가져오는 중입니다.";
    try {
      otaPreview = await loadOtaReservationPreview(selectedBranchId);
      statusMessage = "OTA 예약정보를 WINGS 입력값으로 변환했습니다.";
    } catch (error) {
      otaPreview = null;
      statusMessage = error instanceof Error ? error.message : String(error);
    } finally {
      otaLoading = false;
    }
  }

  async function fillWingsReservation() {
    if (!otaPreview) {
      statusMessage = "먼저 OTA 예약정보를 가져오세요.";
      return;
    }

    otaLoading = true;
    statusMessage = "WINGS 신규예약 화면에 값을 입력하는 중입니다.";
    try {
      const result = await fillWingsReservationFromPreview(otaPreview);
      statusMessage = `WINGS 입력 완료: ${result.filled.length}개 입력, ${result.missing.length}개 미발견. 저장은 직접 확인 후 진행해주세요.`;
    } catch (error) {
      statusMessage = error instanceof Error ? error.message : String(error);
    } finally {
      otaLoading = false;
    }
  }

  async function copyTemplate(template: TemplateDefinition) {
    const guard = guardRequiredContext(template.requiresContext, currentWorkContext());
    if (!guard.ok) {
      statusMessage = guard.message;
      return;
    }
    if (!hasTemplateLanguage(template, selectedLanguage)) {
      statusMessage = "선택한 언어의 번역본이 없어 비활성화되었습니다.";
      return;
    }

    try {
      const remarkType =
        template.audience === "pmsRemark" ? getBuiltInRemarkType(template.id) : null;
      const values = templateValues(template);
      const text = remarkType
        ? createRemarkLine(remarkType, values)
        : renderTemplate(template, selectedLanguage, values);
      await navigator.clipboard.writeText(text);
      copiedTemplateId = template.id;
      statusMessage = "복사되었습니다.";
    } catch (error) {
      statusMessage = error instanceof Error ? error.message : String(error);
    }
  }

  async function saveTemplateEdit() {
    const template = catalogTemplates.find((item) => item.id === settingsTemplateId);
    if (!template) return;

    try {
      const branchScope = normalizeBranchScope(getSelectedBranches(editBranchScope));
      const nextState = cloneStoredState(storedState);
      const languageBody = editBody;

      if (isBuiltInTemplate(template.id)) {
        const previous = nextState.templateOverrides[template.id] || {};
        nextState.templateOverrides[template.id] = {
          ...previous,
          title: editTitle.trim() || template.title,
          branchScope,
          languages: { ...(previous.languages || {}), [selectedLanguage]: languageBody },
          variables: mergeTemplateVariables(template.variables, extractTemplateVariables(languageBody)),
          defaultValue: languageBody || template.defaultValue,
        };
      } else {
        nextState.customTemplates = nextState.customTemplates.map((item) =>
          item.id === template.id
            ? (() => {
                const languages = { ...item.languages, [selectedLanguage]: languageBody };
                return validateTemplateDefinitionForSave({
                ...item,
                title: editTitle.trim() || item.title,
                branchScope,
                languages,
                variables: extractTemplateVariablesFromLanguages(languages),
                defaultValue: languageBody || item.defaultValue,
              });
            })()
            : item,
        );
      }

      await persistState(nextState);
      statusMessage = "수정 내용을 저장했습니다.";
    } catch (error) {
      statusMessage = getSettingsErrorMessage(error);
    }
  }

  async function resetTemplateEdit() {
    const template = catalogTemplates.find((item) => item.id === settingsTemplateId);
    if (!template) return;

    const nextState = cloneStoredState(storedState);
    if (isBuiltInTemplate(template.id)) {
      delete nextState.templateOverrides[template.id];
      await persistState(nextState);
      statusMessage = "기본값으로 되돌렸습니다.";
      refreshEditFields(template.id);
      return;
    }

    nextState.customTemplates = nextState.customTemplates.filter((item) => item.id !== template.id);
    const nextTemplateId = UNIFIED_TEMPLATE_CATALOG[0]?.id || "";
    settingsTemplateId = nextTemplateId;
    await persistState(nextState);
    statusMessage = "사용자 항목을 삭제했습니다.";
  }

  function cancelTemplateEdit() {
    refreshEditFields(settingsTemplateId);
    statusMessage = "수정 중인 내용을 취소했습니다.";
  }

  async function addCustomTemplate() {
    if (!newTitle.trim()) {
      statusMessage = "제목을 입력해주세요.";
      return;
    }

    try {
      const nextTemplate = createCustomTemplateDefinition({
        id: createCustomTemplateId(newTitle),
        category: newCategory,
        audience: newAudience,
        title: newTitle.trim(),
        branchScope: getSelectedBranches(newBranchScope),
        languages: { [selectedLanguage]: newBody },
        variables: extractTemplateVariables(newBody),
        attachments: [],
        requiresContext: newContext,
        defaultValue: newBody,
      });
      const nextState = cloneStoredState(storedState);
      nextState.customTemplates = [...nextState.customTemplates, nextTemplate];
      settingsTemplateId = nextTemplate.id;
      newTitle = "";
      newBody = "";
      newBranchScope = createBranchScopeSelection();
      await persistState(nextState);
      statusMessage = "새 항목을 추가했습니다.";
    } catch (error) {
      statusMessage = getSettingsErrorMessage(error);
    }
  }

  function clearNewTemplateDraft() {
    newCategory = "GUEST_NOTICE";
    newAudience = "guest";
    newContext = "none";
    newTitle = "";
    newBody = "";
    newBranchScope = createBranchScopeSelection();
    statusMessage = "작성 중인 새 항목을 비웠습니다.";
  }

  function defaultValues(): Record<string, string> {
    const branchLabel =
      branchOptions.find((branch) => branch.id === selectedBranchId)?.label || "";
    return {
      ...(selectedPmsRecord?.templateValues || {}),
      reportDate: formatToday(),
      branchName: branchLabel,
      hotelName: branchLabel,
      guestName: selectedPmsRecord?.guestName || "",
      roomNo: selectedPmsRecord?.displayRoom || selectedPmsRecord?.roomNo || "",
      roomType: selectedPmsRecord?.templateValues.roomType || "",
      roomTypeName: selectedPmsRecord?.templateValues.roomTypeName || "",
      rentalItemName: "",
      staffName: "",
      count: "",
      items: "",
      direction: "",
      useDateTime: "",
      dispatchNo: "",
      courseName: "",
      status: "",
    };
  }

  function templateValues(template: TemplateDefinition): Record<string, string> {
    return {
      ...defaultValues(),
      ...(templateDraftValues[template.id] || {}),
    };
  }

  function templateDraftValue(templateId: string, variableName: string): string {
    return templateDraftValues[templateId]?.[variableName] || "";
  }

  function templateInputValue(template: TemplateDefinition, variableName: string): string {
    return templateDraftValues[template.id]?.[variableName] || defaultValues()[variableName] || "";
  }

  function handleTemplateVariableInput(templateId: string, variableName: string, event: Event) {
    const value = (event.target as HTMLInputElement).value;
    templateDraftValues = {
      ...templateDraftValues,
      [templateId]: {
        ...(templateDraftValues[templateId] || {}),
        [variableName]: value,
      },
    };
  }

  function resetRoomContextState() {
    pmsRecords = [];
    pmsSearchTerm = "";
    selectedPmsRecordId = "";
    templateDraftValues = {};
    copiedTemplateId = "";
  }

  function extractTemplateVariables(body: string) {
    const tokens = [
      ...Array.from(body.matchAll(/\{([a-zA-Z0-9_]+)\}/g), (match) => match[1]),
      ...Array.from(body.matchAll(/\[([^\]]+)\]/g), (match) => match[1].trim()),
    ];
    return Array.from(new Set(tokens.map(templateVariableName))).map((name) => ({
      name,
      label: templateVariableLabel(name),
      kind: "manualOptional" as const,
    }));
  }

  function extractTemplateVariablesFromLanguages(languages: Partial<Record<Language, string>>) {
    return mergeTemplateVariables(
      [],
      Object.values(languages).flatMap((body) => extractTemplateVariables(body || "")),
    );
  }

  function mergeTemplateVariables(baseVariables: readonly TemplateDefinition["variables"][number][], nextVariables: readonly TemplateDefinition["variables"][number][]) {
    const merged = [...baseVariables];
    for (const variable of nextVariables) {
      if (!merged.some((item) => item.name === variable.name)) {
        merged.push(variable);
      }
    }
    return merged;
  }

  function templateVariableName(labelOrName: string): string {
    const names: Record<string, string> = {
      지점명: "branchName",
      호텔명: "hotelName",
      고객명: "guestName",
      객실번호: "roomNo",
      "객실 타입": "roomType",
      객실타입: "roomType",
      "대여 물품명": "rentalItemName",
      대여물품명: "rentalItemName",
    };
    return names[labelOrName] || labelOrName;
  }

  function templateVariableLabel(name: string): string {
    const labels: Record<string, string> = {
      branchName: "지점명",
      hotelName: "호텔명",
      guestName: "고객명",
      roomNo: "객실번호",
      roomType: "객실 타입",
      roomTypeName: "객실 타입",
      rentalItemName: "대여 물품명",
    };
    return labels[name] || name;
  }

  function currentWorkContext() {
    const hasSelectedRoom = Boolean(selectedPmsRecord);
    return {
      isPmsPage: tabContext.isPmsPage || hasSelectedRoom,
      isGuestRecord: tabContext.isGuestRecord || hasSelectedRoom,
    };
  }

  function handleSettingsTemplateChange(event: Event) {
    settingsTemplateId = (event.target as HTMLSelectElement).value;
    refreshEditFields(settingsTemplateId);
  }

  function applyState(nextState: StoredExtensionState) {
    storedState = cloneStoredState(nextState);
    catalogTemplates = applyStoredUnifiedTemplateState(storedState);
    if (!catalogTemplates.some((template) => template.id === settingsTemplateId)) {
      settingsTemplateId = catalogTemplates[0]?.id || "";
    }
    refreshEditFields(settingsTemplateId);
  }

  async function persistState(nextState: StoredExtensionState) {
    await writeExtensionState(nextState);
    applyState(nextState);
  }

  function refreshEditFields(templateId: string) {
    const template = catalogTemplates.find((item) => item.id === templateId);
    editTitle = template?.title || "";
    editBody = template?.languages[selectedLanguage] || template?.defaultValue || "";
    editBranchScope = createBranchScopeSelection(template?.branchScope);
  }

  function createBranchScopeSelection(
    selectedBranches: readonly BranchId[] = ALL_BRANCH_IDS,
  ): Record<BranchId, boolean> {
    return ALL_BRANCH_IDS.reduce(
      (selection, branchId) => ({
        ...selection,
        [branchId]: selectedBranches.includes(branchId),
      }),
      {} as Record<BranchId, boolean>,
    );
  }

  function getSelectedBranches(selection: Record<BranchId, boolean>): BranchId[] {
    return ALL_BRANCH_IDS.filter((branchId) => selection[branchId]);
  }

  function branchScopeChanged(
    selection: Record<BranchId, boolean>,
    branchScope: readonly BranchId[],
  ): boolean {
    const selectedBranches = getSelectedBranches(selection);
    return (
      selectedBranches.length !== branchScope.length ||
      selectedBranches.some((branchId) => !branchScope.includes(branchId))
    );
  }

  function createCustomTemplateId(title: string): string {
    const slug = title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return `custom-${slug || "template"}-${Date.now().toString(36)}`;
  }

  function getSettingsErrorMessage(error: unknown): string {
    if (error instanceof TemplateCatalogSchemaError) {
      return error.message;
    }
    return error instanceof Error ? error.message : String(error);
  }

  function cloneStoredState(state: StoredExtensionState): StoredExtensionState {
    return {
      schemaVersion: 1,
      lastBranchId: state.lastBranchId,
      templateOverrides: { ...state.templateOverrides },
      customTemplates: state.customTemplates.map((template) => ({
        ...template,
        branchScope: [...template.branchScope],
        languages: { ...template.languages },
        variables: [...template.variables],
        attachments: [...template.attachments],
      })),
      ui: { ...state.ui },
    };
  }

  function isBuiltInTemplate(templateId: string): boolean {
    return UNIFIED_TEMPLATE_CATALOG.some((template) => template.id === templateId);
  }

  function formatToday(): string {
    const now = new Date();
    return `${now.getMonth() + 1}월 ${now.getDate()}일`;
  }

  function menuCount(menuId: MenuId): number {
    if (menuId === "OTA_RESERVATION_INPUT") return 1;
    return menuId === "SETTINGS"
      ? catalogTemplates.length
      : filterTemplatesForMenu(menuId, catalogTemplates).length;
  }

  function templateSummary(template: TemplateDefinition): string {
    const raw = template.languages[selectedLanguage] || "";
    const compact = raw.replace(/\{[^}]+\}/g, "").replace(/\s+/g, " ").trim();
    if (!compact) return "선택한 언어의 번역본이 없습니다.";
    return compact.length > 44 ? `${compact.slice(0, 44)}...` : compact;
  }

  function otaPreviewSummary(preview: OtaReservationInputPreview): string {
    return [preview.fields.CORP_CUSTM_NAME, preview.fields.ROOM_FEE].filter(Boolean).join(" / ");
  }

  function templateTypeLabel(template: TemplateDefinition): string {
    if (template.audience === "pmsRemark") return "객실 메모";
    if (template.audience === "internal") return "내부";
    return template.requiresContext === "none" ? "고객" : "고객 · WINGS";
  }

  function branchScopeLabel(template: TemplateDefinition): string {
    if (template.branchScope.length >= 3) return "전 지점";
    return template.branchScope.map((branchId) => branchDisplayLabels[branchId]).join(", ");
  }

  function visibleTemplateVariables(template: TemplateDefinition) {
    return template.variables.filter((variable) => variable.kind !== "computed");
  }

  function laundryStatusLabel(status: LaundryStatus): string {
    const labels: Record<LaundryStatus, string> = {
      RECEIVED: "접수",
      IN_PROGRESS: "처리중",
      READY: "수령 가능",
      PICKED_UP: "수령 완료",
      CANCELLED: "취소",
    };
    return labels[status];
  }

  function nextLaundryStatus(status: LaundryStatus): LaundryStatus {
    if (status === "RECEIVED") return "IN_PROGRESS";
    if (status === "IN_PROGRESS") return "READY";
    if (status === "READY") return "PICKED_UP";
    return status;
  }

  function hasAnyTemplateForLanguage(
    templates: readonly TemplateDefinition[],
    language: Language,
  ): boolean {
    return templates.some((template) => hasTemplateLanguage(template, language));
  }

  function getFirstAvailableLanguage(templates: readonly TemplateDefinition[]): Language | null {
    for (const language of languages) {
      if (hasAnyTemplateForLanguage(templates, language.id)) return language.id;
    }
    return null;
  }

  function hasSettingsDraft(): boolean {
    if (activeMenu !== "SETTINGS") return false;
    const template = catalogTemplates.find((item) => item.id === settingsTemplateId);
    const currentTitle = template?.title || "";
    const currentBody = template?.languages[selectedLanguage] || template?.defaultValue || "";
    const currentBranchScope = template?.branchScope || [];
    return (
      editTitle !== currentTitle ||
      editBody !== currentBody ||
      branchScopeChanged(editBranchScope, currentBranchScope) ||
      Boolean(newTitle.trim()) ||
      Boolean(newBody.trim()) ||
      branchScopeChanged(newBranchScope, ALL_BRANCH_IDS)
    );
  }

  function scrollToTop() {
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  }
</script>

<main class:home-mode={activeMenu === null} class="app-shell">
  <header class="app-header">
    {#if activeMenu !== null}
      <button
        class="icon-button"
        type="button"
        aria-label="뒤로가기"
        title="뒤로가기"
        disabled={navigationLocked}
        onclick={goBack}
      >
        ‹
      </button>
    {/if}

    <div class="brand-lockup">
      <img class="brand-logo" src="logo.png" alt="UH Suite" />
      <strong>UH SUITE</strong>
    </div>

    <label class="branch-picker" aria-label="지점 선택">
      <select bind:value={selectedBranchId} onchange={handleBranchChange}>
        <option value="">지점 선택</option>
        {#each branchOptions as branch}
          <option value={branch.id}>{branch.label}</option>
        {/each}
      </select>
    </label>

    {#if activeMenu !== null && selectedPmsRecord}
      <div class="selected-room-header" aria-label="선택 객실">
        <strong>{selectedPmsRecord.displayRoom || selectedPmsRecord.roomNo}</strong>
        {#if selectedPmsRecord.guestName}
          <span>{selectedPmsRecord.guestName}</span>
        {/if}
      </div>
    {/if}
  </header>

  {#if activeMenu === null}
    <section class="home-title">
      <p class="eyebrow">업무보조</p>
      <h1>업무 메뉴</h1>
    </section>

    <nav class="menu-stack" aria-label="상위 업무 메뉴">
      {#each homeMenuGroups as group}
        <section class="menu-group" aria-label={group.title}>
          <h2>{group.title}</h2>
          <div class="menu-grid">
            {#each group.items as menu}
              <button class="menu-button" type="button" onclick={() => openMenu(menu.id)}>
                <span class="menu-icon" aria-hidden="true">{menu.icon}</span>
                <span class="menu-text">
                  <strong>{menu.title}</strong>
                  <small>{menu.description}</small>
                </span>
                <em>{menuCount(menu.id)}</em>
              </button>
            {/each}
          </div>
        </section>
      {/each}
    </nav>

    <section class="settings-entry" aria-label="설정">
      <button class="settings-menu-button" type="button" onclick={() => openMenu("SETTINGS")}>
        <span class="menu-icon" aria-hidden="true">{homeSettingsMenu.icon}</span>
        <span class="menu-text">
          <strong>{homeSettingsMenu.title}</strong>
          <small>{homeSettingsMenu.description}</small>
        </span>
        <em>{menuCount("SETTINGS")}</em>
      </button>
    </section>
  {:else}
    <section class="work-header">
      <div class="work-title-row">
        <span class="work-icon" aria-hidden="true">{selectedMenu?.icon}</span>
        <div class="work-title-copy">
          <p class="eyebrow">선택 메뉴</p>
          <h1>{selectedMenu?.title}</h1>
        </div>
        <button
          class="menu-return-button"
          type="button"
          disabled={navigationLocked}
          onclick={goHome}
        >
          메뉴
        </button>
      </div>

      {#if activeMenu !== "SETTINGS" && activeMenu !== "OTA_RESERVATION_INPUT"}
        <div class="work-controls">
          <label>
            <span>언어</span>
            <select bind:value={selectedLanguage} onchange={handleLanguageChange}>
              {#each languages as lang}
                <option value={lang.id} disabled={!hasAnyTemplateForLanguage(activeTemplates, lang.id)}>
                  {lang.label}
                </option>
              {/each}
            </select>
          </label>
          <div class="work-count" aria-label="템플릿 수">{activeTemplates.length}개</div>
        </div>

        <div class="tab-bar" role="tablist" aria-label="하위 메뉴">
          {#each activeTabs as tab}
            <button
              class:active={selectedTabId === tab.id}
              type="button"
              role="tab"
              aria-selected={selectedTabId === tab.id}
              onclick={() => selectTab(tab.id)}
            >
              {tab.label}
            </button>
          {/each}
        </div>
      {/if}
    </section>

    <section class="status-bar" aria-live="polite">
      {statusMessage}
    </section>

    {#if activeMenu === "SETTINGS"}
      <section class="settings-panel">
        <h2>설정</h2>
        <div class="settings-editor">
          <label>
            <span>수정 항목</span>
            <select
              bind:value={settingsTemplateId}
              onchange={handleSettingsTemplateChange}
              disabled={navigationLocked}
            >
              {#each catalogTemplates as template}
                <option value={template.id}>{template.title}</option>
              {/each}
            </select>
          </label>
          <label>
            <span>언어</span>
            <select bind:value={selectedLanguage} onchange={handleLanguageChange}>
              {#each languages as lang}
                <option value={lang.id}>{lang.label}</option>
              {/each}
            </select>
          </label>
          <label>
            <span>제목</span>
            <input bind:value={editTitle} />
          </label>
          <label>
            <span>내용</span>
            <textarea bind:value={editBody}></textarea>
          </label>
          <fieldset class="branch-scope-editor">
            <legend>사용 지점</legend>
            <div class="branch-scope-options">
              {#each branchOptions as branch}
                <label>
                  <input type="checkbox" bind:checked={editBranchScope[branch.id]} />
                  <span>{branch.label}</span>
                </label>
              {/each}
            </div>
          </fieldset>
          <div class="settings-actions">
            <button type="button" onclick={saveTemplateEdit}>저장</button>
            <button class="secondary" type="button" onclick={cancelTemplateEdit}>취소</button>
            <button class="secondary" type="button" onclick={resetTemplateEdit}>
              {isBuiltInTemplate(settingsTemplateId) ? "기본값" : "삭제"}
            </button>
          </div>
        </div>

        <div class="settings-editor">
          <h3>새 항목</h3>
          <div class="settings-row">
            <label>
              <span>메뉴</span>
              <select bind:value={newCategory}>
                {#each categoryOptions as option}
                  <option value={option.id}>{option.label}</option>
                {/each}
              </select>
            </label>
            <label>
              <span>대상</span>
              <select bind:value={newAudience}>
                {#each audienceOptions as option}
                  <option value={option.id}>{option.label}</option>
                {/each}
              </select>
            </label>
          </div>
          <label>
            <span>필요 화면</span>
            <select bind:value={newContext}>
              {#each contextOptions as option}
                <option value={option.id}>{option.label}</option>
              {/each}
            </select>
          </label>
          <fieldset class="branch-scope-editor">
            <legend>사용 지점</legend>
            <div class="branch-scope-options">
              {#each branchOptions as branch}
                <label>
                  <input type="checkbox" bind:checked={newBranchScope[branch.id]} />
                  <span>{branch.label}</span>
                </label>
              {/each}
            </div>
          </fieldset>
          <label>
            <span>제목</span>
            <input bind:value={newTitle} />
          </label>
          <label>
            <span>내용</span>
            <textarea bind:value={newBody}></textarea>
          </label>
          <div class="settings-actions">
            <button type="button" onclick={addCustomTemplate}>추가</button>
            <button class="secondary" type="button" onclick={clearNewTemplateDraft}>비우기</button>
          </div>
        </div>
      </section>
    {:else if activeMenu === "OTA_RESERVATION_INPUT"}
      <section class="pms-panel" aria-label="OTA 예약 입력">
        <div class="pms-panel-header">
          <div>
            <p class="eyebrow">OTA</p>
            <h2>네이버/스테이션 예약 입력</h2>
          </div>
          <button type="button" disabled={otaLoading || !selectedBranchId} onclick={loadOtaReservation}>
            {otaLoading ? "처리 중" : "예약정보 가져오기"}
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
              <button type="button" disabled={otaLoading} onclick={fillWingsReservation}>
                WINGS에 입력
              </button>
            </article>
          {/if}
        </div>
      </section>
    {:else}
      {#if activeMenu === "LAUNDRY_MANAGEMENT"}
        <section class="laundry-panel" aria-label="세탁물 관리">
          <div class="pms-panel-header">
            <div>
              <p class="eyebrow">세탁물</p>
              <h2>세탁물 기록</h2>
            </div>
            <button type="button" disabled={laundryLoading} onclick={loadLaundryRecords}>
              {laundryLoading ? "불러오는 중" : "새로고침"}
            </button>
          </div>

          <div class="laundry-form">
            <label>
              <span>세탁물 내용</span>
              <input
                bind:value={laundryItemSummary}
                placeholder="예: 셔츠 2 / 바지 1"
              />
            </label>
            <label>
              <span>메모</span>
              <input bind:value={laundryNote} placeholder="특이사항" />
            </label>
            <button type="button" disabled={laundryLoading || !selectedBranchId} onclick={addLaundry}>
              추가
            </button>
          </div>

          <div class="laundry-filters">
            <div class="segmented-control" aria-label="세탁물 상태">
              {#each ["ALL", "RECEIVED", "IN_PROGRESS", "READY", "PICKED_UP"] as status}
                <button
                  class:active={laundryStatusFilter === status}
                  type="button"
                  onclick={() => (laundryStatusFilter = status as LaundryStatus | "ALL")}
                >
                  {status === "ALL" ? "전체" : laundryStatusLabel(status as LaundryStatus)}
                </button>
              {/each}
            </div>
            <label>
              <span>검색</span>
              <input bind:value={laundrySearchTerm} />
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
                    <strong>{record.displayRoom || record.roomNo || "객실 미지정"}</strong>
                    <span>{record.guestName || "고객명 미입력"}</span>
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
                        onclick={() => setLaundryStatus(record, nextLaundryStatus(record.status))}
                      >
                        다음
                      </button>
                    {/if}
                    <button
                      class="secondary"
                      type="button"
                      disabled={laundryLoading || record.status === "CANCELLED"}
                      onclick={() => setLaundryStatus(record, "CANCELLED")}
                    >
                      취소
                    </button>
                  </div>
                </article>
              {/each}
            {/if}
          </div>
        </section>
      {/if}

      <section class="template-list" aria-label="템플릿 목록">
        {#each activeTemplates as template}
          {@const guard = guardRequiredContext(template.requiresContext, currentWorkContext())}
          {@const languageAvailable = hasTemplateLanguage(template, selectedLanguage)}
          <article class:blocked={!guard.ok || !languageAvailable} class="template-card">
            <div class="template-main">
              <div class="template-meta">
                <span>{templateTypeLabel(template)}</span>
                <span>{branchScopeLabel(template)}</span>
                <span>{getAvailableTemplateLanguages(template).join(", ")}</span>
              </div>
              <h2>{template.title}</h2>
              <p class="template-summary">{templateSummary(template)}</p>
              {#if !guard.ok}
                <p class="guard-message">{guard.message}</p>
              {:else if !languageAvailable}
                <p class="guard-message">선택한 언어의 번역본이 없어 비활성화되었습니다.</p>
              {/if}
              {#if visibleTemplateVariables(template).length > 0}
                <div class="template-variable-grid">
                  {#each visibleTemplateVariables(template) as variable}
                    <label>
                      <span>{variable.label}</span>
                      <input
                        value={templateInputValue(template, variable.name)}
                        placeholder={variable.kind === "pmsRequired" ? "객실 선택값" : ""}
                        oninput={(event) => handleTemplateVariableInput(template.id, variable.name, event)}
                      />
                    </label>
                  {/each}
                </div>
              {/if}
            </div>
            <button type="button" disabled={!guard.ok || !languageAvailable} onclick={() => copyTemplate(template)}>
              {copiedTemplateId === template.id ? "복사됨" : "복사"}
            </button>
          </article>
        {/each}
      </section>
    {/if}
  {/if}

  {#if activeMenu !== null && activeMenu !== "SETTINGS" && activeMenu !== "OTA_RESERVATION_INPUT"}
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
          <button type="button" disabled={pmsLoading || !selectedBranchId} onclick={syncPmsGuestRecords}>
            {pmsLoading ? "불러오는 중" : "객실 불러오기"}
          </button>
        </div>

        <div class="pms-controls">
          <div class="segmented-control" aria-label="객실 조회 모드">
            <button
              class:active={pmsMode === "ARRIVAL"}
              type="button"
              disabled={pmsLoading}
              onclick={() => selectPmsMode("ARRIVAL")}
            >
              입실
            </button>
            <button
              class:active={pmsMode === "DEPARTURE"}
              type="button"
              disabled={pmsLoading}
              onclick={() => selectPmsMode("DEPARTURE")}
            >
              퇴실
            </button>
          </div>
          <label>
            <span>검색</span>
            <input value={pmsSearchTerm} oninput={handlePmsSearchChange} />
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
                onclick={() => selectPmsRecord(record)}
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
  {/if}
</main>

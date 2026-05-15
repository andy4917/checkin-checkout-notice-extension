import {
  filterLaundryRecords,
  isSettingsDraftDirty,
  resolveActiveTemplates,
  resolveMenuTemplates,
  requiresSelectedRoomContext,
  resolveScopedTemplates,
  selectPmsRecord as resolveSelectedPmsRecord,
  usesWingsContext,
} from "./app-view-model.js";
import {
  audienceOptions,
  branchOptions,
  categoryOptions,
  contextOptions,
  homeBottomNavigation,
  homeMenuSections,
  homeNavigation,
  languageOptions as languages,
} from "./ui-options.js";
import {
  cloneStoredState,
  createBranchScopeSelection,
  getSettingsErrorMessage,
} from "./app-state-helpers.js";
import {
  formatBranchScopeLabel,
  getFirstAvailableLanguage,
  hasAnyTemplateForLanguage,
  laundryStatusLabel,
  nextLaundryStatus,
  summarizeOtaPreview,
  summarizeTemplate,
  templateTypeLabel,
  visibleTemplateVariables,
} from "./display-helpers.js";
import {
  createTemplateValues,
  getTemplateDraftValue,
  getTemplateInputValue,
  updateTemplateDraftValue,
  type TemplateDraftValues,
} from "./template-runtime-values.js";
import {
  createEditedTemplateState,
  createNewCustomTemplate,
} from "./template-settings-workflow.js";
import {
  describeSelectedPmsRecord,
  loadPmsGuestRecords,
  type PmsWorkflowDependencies,
} from "./pms-workflow.js";
import {
  changeLaundryStatus,
  createLaundryRecord,
  loadLaundryRecordList,
  type LaundryWorkflowDependencies,
} from "./laundry-workflow.js";
import {
  fillWingsFromOtaPreview,
  loadOtaPreview,
  type OtaWorkflowDependencies,
} from "./ota-workflow.js";
import {
  UNSUPPORTED_ROOMS_SETTINGS_COMMAND_MESSAGE,
  resolveRoomsSettingsActions,
  type ResolvedRoomsSettingsAction,
} from "./rooms-settings-actions.js";
import { isBranchId } from "../config/branches.js";
import { guardRequiredContext } from "../application/context-guard.js";
import {
  upsertWingsRemarkLine,
  type WingsRemarkDependencies,
} from "../application/wings-remark.js";
import { hasTemplateLanguage, renderTemplate } from "../catalog/template-renderer.js";
import {
  UNIFIED_TEMPLATE_CATALOG,
  applyStoredUnifiedTemplateState,
} from "../catalog/template-catalog.js";
import {
  getMenu,
  getRoomsSettingsCommand,
  isRoomsSettingsCommandId,
  type MenuId,
  type RoomsSettingsCommandId,
} from "../catalog/menu-routing.js";
import { getBusinessDateParts } from "../domain/dates.js";
import { filterPmsGuestRecords } from "../domain/guests.js";
import { resolveDefaultLanguageFromNationalityFields } from "../domain/language.js";
import { createRemarkLine, getBuiltInRemarkType } from "../domain/remarks.js";
import type { OtaReservationInputPreview } from "../application/ota-reservation-input.js";
import {
  STORAGE_CORRUPTION_RECOVERY_MESSAGE,
  type ExtensionStateReadResult,
} from "../platform/chrome-storage.js";
import { EMPTY_TAB_CONTEXT, type TabContext } from "../platform/tab-context.js";
import type { BranchId, Language, PmsGuestRecord, TabMode } from "../types.js";
import type { LaundryMachineType, LaundryRecord, LaundryStatus } from "../laundry/types.js";
import { DEFAULT_EXTENSION_STATE } from "../platform/storage-schema.js";
import type {
  StoredExtensionState,
  TemplateAudience,
  TemplateCategory,
  TemplateContextRequirement,
  TemplateDefinition,
  UnifiedTemplateDefinition,
} from "../catalog/template-types.js";

export type SidePanelControllerDependencies = {
  clipboard: {
    writeText(text: string): Promise<void>;
  };
  extensionState: {
    readWithRecovery(): Promise<ExtensionStateReadResult>;
    setLastBranchId(branchId: BranchId): Promise<void>;
    write(state: StoredExtensionState): Promise<void>;
  };
  laundry: LaundryWorkflowDependencies;
  ota: OtaWorkflowDependencies;
  pms: PmsWorkflowDependencies;
  wingsRemark: WingsRemarkDependencies;
  tabContext: {
    getActiveTabContext(): Promise<TabContext>;
  };
  viewport: {
    scrollToTop(): void;
  };
};

export function createSidePanelController(dependencies: SidePanelControllerDependencies) {
  let activeMenu = $state<MenuId | null>(null);
  let selectedBranchId = $state<BranchId | "">("");
  let selectedLanguage = $state<Language>("KO");
  let tabContext = $state({ ...EMPTY_TAB_CONTEXT });
  let storedState = $state<StoredExtensionState>({ ...DEFAULT_EXTENSION_STATE });
  let catalogTemplates = $state<UnifiedTemplateDefinition[]>([...UNIFIED_TEMPLATE_CATALOG]);
  let statusMessage = $state("");
  let copiedTemplateId = $state("");
  let settingsTemplateId = $state(UNIFIED_TEMPLATE_CATALOG[0]?.id || "");
  let editTitle = $state("");
  let editBody = $state("");
  let editBranchScope = $state<Record<BranchId, boolean>>(createBranchScopeSelection());
  let newCategory = $state<TemplateCategory>("GUEST_NOTICE");
  let newAudience = $state<TemplateAudience>("guest");
  let newContext = $state<TemplateContextRequirement>("none");
  let newTitle = $state("");
  let newBody = $state("");
  let newBranchScope = $state<Record<BranchId, boolean>>(createBranchScopeSelection());
  let pmsMode = $state<TabMode>("ARRIVAL");
  const pmsQueryDate = getBusinessDateParts().apiDate;
  let pmsRecords = $state<PmsGuestRecord[]>([]);
  let pmsSearchTerm = $state("");
  let pmsLoading = $state(false);
  let selectedPmsRecordId = $state("");
  let templateDraftValues = $state<TemplateDraftValues>({});
  let laundryRecords = $state<LaundryRecord[]>([]);
  let laundryItemSummary = $state("");
  let laundryNote = $state("");
  let laundrySearchTerm = $state("");
  let laundryStatusFilter = $state<LaundryStatus | "ALL">("ALL");
  let laundryLoading = $state(false);
  let otaLoading = $state(false);
  let otaPreview = $state<OtaReservationInputPreview | null>(null);
  let selectedRoomRemarkTemplateId = $state("");
  let selectedGuidanceTemplateId = $state("");

  const selectedMenu = $derived(activeMenu ? getMenu(activeMenu) : null);
  const activeScreenKind = $derived(selectedMenu?.screenKind || null);
  const navigationLocked = $derived(
    isSettingsDraftDirty({
      activeScreenKind,
      catalogTemplates,
      editBody,
      editBranchScope,
      editTitle,
      newBody,
      newBranchScope,
      newTitle,
      selectedLanguage,
      settingsTemplateId,
    }),
  );
  const menuTemplates = $derived(resolveMenuTemplates(activeMenu, catalogTemplates));
  const scopedTemplates = $derived(resolveScopedTemplates(menuTemplates, selectedBranchId));
  const activeTemplates = $derived(resolveActiveTemplates(scopedTemplates));
  const activeMenuRequiresSelectedRoom = $derived(requiresSelectedRoomContext(activeTemplates));
  const activeMenuUsesWingsContext = $derived(usesWingsContext(activeTemplates));
  const selectedCommandTemplate = $derived(
    catalogTemplates.find((item) => item.id === selectedRoomRemarkTemplateId) || null,
  );
  const showsSettingsPanel = $derived(activeScreenKind === "settings");
  const showsOtaReservationPanel = $derived(activeScreenKind === "otaReservationInput");
  const showsCustomerGuidancePanel = $derived(activeScreenKind === "customerGuidance");
  const showsLaundryPanel = $derived(activeScreenKind === "laundry");
  const showsTemplateListPanel = $derived(
    activeScreenKind === "templateList" || activeScreenKind === "laundry",
  );
  const showsWorkLanguageSelector = $derived(
    activeMenu === "CUSTOMER_NOTICE" || activeMenu === "QUICK_REPLY",
  );
  const visiblePmsRecords = $derived(filterPmsGuestRecords(pmsRecords, pmsSearchTerm));
  const selectedPmsRecord = $derived(
    resolveSelectedPmsRecord(pmsRecords, selectedPmsRecordId),
  );
  const filteredLaundryRecords = $derived(
    showsLaundryPanel
      ? laundryRecords
      : filterLaundryRecords(
          laundryRecords,
          laundryStatusFilter,
          laundrySearchTerm,
          laundryStatusLabel,
        ),
  );
  const roomsSettingsActions = $derived(
    resolveRoomsSettingsActions({
      navigationLocked,
      selectedBranchId,
      selectedPmsRecord,
      selectedCommandTemplate,
      tabContext,
    }),
  );

  $effect(() => {
    if (
      activeTemplates.length > 0 &&
      !hasAnyTemplateForLanguage(activeTemplates, selectedLanguage)
    ) {
      selectedLanguage = getFirstAvailableLanguage(activeTemplates, languages) || selectedLanguage;
    }
  });

  async function mount() {
    activeMenu = null;
    tabContext = await dependencies.tabContext.getActiveTabContext();
    try {
      const { state: loadedState, recovered } = await dependencies.extensionState.readWithRecovery();
      if (loadedState.lastBranchId) {
        selectedBranchId = loadedState.lastBranchId;
      }
      applyState(loadedState);
      if (recovered) {
        statusMessage = STORAGE_CORRUPTION_RECOVERY_MESSAGE;
      }
    } catch (error) {
      statusMessage = error instanceof Error ? error.message : String(error);
    }
  }

  async function handleBranchChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    selectedBranchId = isBranchId(target.value) ? target.value : "";
    resetRoomContextState();
    if (selectedBranchId) {
      await dependencies.extensionState.setLastBranchId(selectedBranchId);
      statusMessage = "선택 지점을 저장했습니다.";
      if (showsLaundryPanel) {
        await loadLaundryRecords();
      }
    } else {
      laundryRecords = [];
      statusMessage = "지점을 선택해주세요.";
    }
  }

  function handleLanguageSelect(language: Language) {
    selectedLanguage = language;
    refreshEditFields(settingsTemplateId);
  }

  function openMenu(menuId: MenuId) {
    if (navigationLocked) {
      statusMessage = "작성 또는 설정 중에는 이동할 수 없습니다.";
      return;
    }
    const nextMenu = getMenu(menuId);
    activeMenu = menuId;
    copiedTemplateId = "";
    selectedGuidanceTemplateId = "";
    selectedRoomRemarkTemplateId = "";
    void refreshTabContext();
    if (nextMenu.screenKind === "settings") {
      refreshEditFields(settingsTemplateId);
    }
    if (nextMenu.screenKind === "otaReservationInput") {
      otaPreview = null;
    }
    if (nextMenu.screenKind === "laundry") {
      laundrySearchTerm = "";
      laundryStatusFilter = "ALL";
      void loadLaundryRecords();
    }
    statusMessage = "";
    scrollToTop();
  }

  function goBack() {
    if (navigationLocked) {
      statusMessage = "저장하거나 취소한 뒤 이동할 수 있습니다.";
      return;
    }
    activeMenu = null;
    copiedTemplateId = "";
    selectedRoomRemarkTemplateId = "";
    selectedGuidanceTemplateId = "";
    statusMessage = "";
    scrollToTop();
  }

  function goHome() {
    goBack();
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
      const records = await loadPmsGuestRecords(
        {
          date: pmsQueryDate,
          mode: pmsMode,
          branchId: selectedBranchId,
          searchTerm: pmsSearchTerm,
        },
        dependencies.pms,
      );
      pmsRecords = records;
      if (!pmsRecords.some((record) => record.id === selectedPmsRecordId)) {
        selectedPmsRecordId = "";
        templateDraftValues = {};
      }
      statusMessage = `객실 ${records.length}건을 불러왔습니다.`;
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

  function choosePmsRecord(record: PmsGuestRecord) {
    if (selectedPmsRecordId !== record.id) {
      templateDraftValues = {};
      copiedTemplateId = "";
    }
    selectedPmsRecordId = record.id;
    selectLanguageForPmsRecord(record);
    if (!laundryItemSummary && showsLaundryPanel) {
      laundryNote = laundryNote || record.guestName;
    }
    statusMessage = describeSelectedPmsRecord(record);
  }

  async function loadLaundryRecords() {
    laundryLoading = true;
    try {
      laundryRecords = await loadLaundryRecordList(selectedBranchId, dependencies.laundry);
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
      statusMessage = "객실번호를 입력해주세요.";
      return;
    }

    laundryLoading = true;
    try {
      const createdRecord = await createLaundryRecord(
        {
          selectedBranchId,
          selectedPmsRecord,
          itemSummary: laundryItemSummary,
          note: laundryNote,
          templateDraftValue,
        },
        dependencies.laundry,
      );
      laundrySearchTerm = "";
      laundryStatusFilter = "ALL";
      laundryRecords = [
        createdRecord,
        ...laundryRecords.filter((record) => record.id !== createdRecord.id),
      ];
      laundryItemSummary = "";
      laundryNote = "";
      statusMessage = "세탁물 기록을 추가했습니다.";
    } catch (error) {
      statusMessage = error instanceof Error ? error.message : String(error);
    } finally {
      laundryLoading = false;
    }
  }

  async function setLaundryStatus(
    record: LaundryRecord,
    status: LaundryStatus,
    machineType?: LaundryMachineType,
  ) {
    laundryLoading = true;
    try {
      await changeLaundryStatus(record, status, dependencies.laundry, machineType);
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
      otaPreview = await loadOtaPreview(selectedBranchId, dependencies.ota);
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
      statusMessage = await fillWingsFromOtaPreview(otaPreview, dependencies.ota);
    } catch (error) {
      statusMessage = error instanceof Error ? error.message : String(error);
    } finally {
      otaLoading = false;
    }
  }

  async function runRoomsSettingsCommand(commandId: RoomsSettingsCommandId | string) {
    if (!isRoomsSettingsCommandId(commandId)) {
      statusMessage = UNSUPPORTED_ROOMS_SETTINGS_COMMAND_MESSAGE;
      return;
    }
    const command = getRoomsSettingsCommand(commandId);
    const handlers: Record<RoomsSettingsCommandId, () => Promise<void>> = {
      UPSERT_WINGS_REMARK: runUpsertWingsRemarkCommand,
    };
    await handlers[command.commandId]();
  }

  async function runUpsertWingsRemarkCommand() {
    if (navigationLocked) {
      statusMessage = "작성 또는 설정 중에는 이동할 수 없습니다.";
      return;
    }

    const refreshedContext = await refreshTabContext();
    if (!refreshedContext.isGuestRecord) {
      statusMessage = "WINGS 예약정보창을 연 뒤 다시 실행해주세요.";
      return;
    }

    const template = selectedCommandTemplate;
    if (!template) {
      statusMessage = "객실 메모 항목을 선택해주세요.";
      return;
    }

    const remarkType = getBuiltInRemarkType(template.id);
    if (!remarkType) {
      statusMessage = "WINGS에 입력할 수 있는 객실 메모가 아닙니다.";
      return;
    }

    try {
      await upsertWingsRemarkLine(
        {
          type: remarkType,
          values: templateValues(template),
        },
        dependencies.wingsRemark,
      );
      statusMessage = "WINGS 리마크에 입력했습니다.";
    } catch (error) {
      statusMessage = error instanceof Error ? error.message : String(error);
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
      await dependencies.clipboard.writeText(text);
      copiedTemplateId = template.id;
      if (remarkType) {
        selectedRoomRemarkTemplateId = template.id;
      }
      statusMessage = "복사되었습니다.";
    } catch (error) {
      statusMessage = error instanceof Error ? error.message : String(error);
    }
  }

  async function saveTemplateEdit() {
    const template = catalogTemplates.find((item) => item.id === settingsTemplateId);
    if (!template) return;

    try {
      const nextState = createEditedTemplateState({
        editBody,
        editBranchScope,
        editTitle,
        isBuiltInTemplate,
        selectedLanguage,
        storedState,
        template,
      });
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
      const nextTemplate = createNewCustomTemplate({
        newAudience,
        newBody,
        newBranchScope,
        newCategory,
        newContext,
        newTitle,
        selectedLanguage,
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

  function templateValues(template: TemplateDefinition): Record<string, string> {
    return createTemplateValues(template, templateValueContext());
  }

  function templateDraftValue(templateId: string, variableName: string): string {
    return getTemplateDraftValue(templateDraftValues, templateId, variableName);
  }

  function templateInputValue(template: TemplateDefinition, variableName: string): string {
    return getTemplateInputValue(template, variableName, templateValueContext());
  }

  function handleTemplateVariableInput(templateId: string, variableName: string, event: Event) {
    const value = (event.target as HTMLInputElement).value;
    templateDraftValues = updateTemplateDraftValue(
      templateDraftValues,
      templateId,
      variableName,
      value,
    );
  }

  function selectGuidanceTemplate(templateId: string) {
    selectedGuidanceTemplateId = selectedGuidanceTemplateId === templateId ? "" : templateId;
  }

  function templateValueContext() {
    return {
      branchOptions,
      selectedBranchId,
      selectedPmsRecord,
      templateDraftValues,
    };
  }

  function resetRoomContextState() {
    pmsRecords = [];
    pmsSearchTerm = "";
    selectedPmsRecordId = "";
    templateDraftValues = {};
    copiedTemplateId = "";
    selectedRoomRemarkTemplateId = "";
    selectedGuidanceTemplateId = "";
  }

  function currentWorkContext() {
    const hasSelectedRoom = Boolean(selectedPmsRecord);
    return {
      isPmsPage: tabContext.isPmsPage || hasSelectedRoom,
      isGuestRecord: tabContext.isGuestRecord || hasSelectedRoom,
    };
  }

  async function refreshTabContext(): Promise<TabContext> {
    tabContext = await dependencies.tabContext.getActiveTabContext();
    return tabContext;
  }

  function selectLanguageForPmsRecord(record: PmsGuestRecord) {
    const nextLanguage = resolveDefaultLanguageFromNationalityFields(record.raw);
    selectedLanguage =
      activeTemplates.length > 0 && !hasAnyTemplateForLanguage(activeTemplates, nextLanguage)
        ? getFirstAvailableLanguage(activeTemplates, languages) || nextLanguage
        : nextLanguage;
  }

  function pmsRecordBadgeLabel(_record: PmsGuestRecord): string {
    if (!activeTemplates.some((template) => template.typeId === "airport_van")) return "";
    return pmsMode === "ARRIVAL" ? "체크인 공항 픽업" : "내일 체크아웃 공항 샌딩";
  }

  function handleSettingsTemplateChange(event: Event) {
    settingsTemplateId = (event.target as HTMLSelectElement).value;
    refreshEditFields(settingsTemplateId);
  }

  function setEditTitle(value: string) {
    editTitle = value;
  }

  function setEditBody(value: string) {
    editBody = value;
  }

  function setEditBranchScope(branchId: BranchId, checked: boolean) {
    editBranchScope = { ...editBranchScope, [branchId]: checked };
  }

  function setNewCategory(value: TemplateCategory) {
    newCategory = value;
  }

  function setNewAudience(value: TemplateAudience) {
    newAudience = value;
  }

  function setNewContext(value: TemplateContextRequirement) {
    newContext = value;
  }

  function setNewTitle(value: string) {
    newTitle = value;
  }

  function setNewBody(value: string) {
    newBody = value;
  }

  function setNewBranchScope(branchId: BranchId, checked: boolean) {
    newBranchScope = { ...newBranchScope, [branchId]: checked };
  }

  function setLaundryItemSummary(value: string) {
    laundryItemSummary = value;
  }

  function setLaundryNote(value: string) {
    laundryNote = value;
  }

  function setLaundrySearchTerm(value: string) {
    laundrySearchTerm = value;
  }

  function setLaundryStatusFilter(status: LaundryStatus | "ALL") {
    laundryStatusFilter = status;
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
    await dependencies.extensionState.write(nextState);
    applyState(nextState);
  }

  function refreshEditFields(templateId: string) {
    const template = catalogTemplates.find((item) => item.id === templateId);
    editTitle = template?.title || "";
    editBody = template?.languages[selectedLanguage] || template?.defaultValue || "";
    editBranchScope = createBranchScopeSelection(template?.branchScope);
  }

  function isBuiltInTemplate(templateId: string): boolean {
    return UNIFIED_TEMPLATE_CATALOG.some((template) => template.id === templateId);
  }

  function templateSummary(template: TemplateDefinition): string {
    return summarizeTemplate(template, selectedLanguage);
  }

  function otaPreviewSummary(preview: OtaReservationInputPreview): string {
    return summarizeOtaPreview(preview);
  }

  function branchScopeLabel(template: TemplateDefinition): string {
    return formatBranchScopeLabel(template, branchOptions);
  }

  function scrollToTop() {
    dependencies.viewport.scrollToTop();
  }

  return {
    audienceOptions,
    branchOptions,
    categoryOptions,
    contextOptions,
    homeMenuSections,
    homeNavigation,
    homeBottomNavigation,
    languages,
    hasAnyTemplateForLanguage,
    laundryStatusLabel,
    nextLaundryStatus,
    templateTypeLabel,
    visibleTemplateVariables,
    mount,
    handleBranchChange,
    handleLanguageSelect,
    openMenu,
    goBack,
    goHome,
    selectPmsMode,
    syncPmsGuestRecords,
    handlePmsSearchChange,
    choosePmsRecord,
    loadLaundryRecords,
    addLaundry,
    setLaundryStatus,
    loadOtaReservation,
    fillWingsReservation,
    runRoomsSettingsCommand,
    copyTemplate,
    saveTemplateEdit,
    resetTemplateEdit,
    cancelTemplateEdit,
    addCustomTemplate,
    clearNewTemplateDraft,
    currentWorkContext,
    handleSettingsTemplateChange,
    setEditTitle,
    setEditBody,
    setEditBranchScope,
    setNewCategory,
    setNewAudience,
    setNewContext,
    setNewTitle,
    setNewBody,
    setNewBranchScope,
    setLaundryItemSummary,
    setLaundryNote,
    setLaundrySearchTerm,
    setLaundryStatusFilter,
    handleTemplateVariableInput,
    selectGuidanceTemplate,
    templateInputValue,
    templateSummary,
    otaPreviewSummary,
    branchScopeLabel,
    isBuiltInTemplate,
    pmsRecordBadgeLabel,
    get activeMenu() {
      return activeMenu;
    },
    get isHomeScreen() {
      return activeMenu === null;
    },
    get activeScreenKind() {
      return activeScreenKind;
    },
    get selectedBranchId() {
      return selectedBranchId;
    },
    get selectedLanguage() {
      return selectedLanguage;
    },
    get catalogTemplates() {
      return catalogTemplates;
    },
    get statusMessage() {
      return statusMessage;
    },
    get copiedTemplateId() {
      return copiedTemplateId;
    },
    get selectedGuidanceTemplateId() {
      return selectedGuidanceTemplateId;
    },
    get settingsTemplateId() {
      return settingsTemplateId;
    },
    get editTitle() {
      return editTitle;
    },
    get editBody() {
      return editBody;
    },
    get editBranchScope() {
      return editBranchScope;
    },
    get newCategory() {
      return newCategory;
    },
    get newAudience() {
      return newAudience;
    },
    get newContext() {
      return newContext;
    },
    get newTitle() {
      return newTitle;
    },
    get newBody() {
      return newBody;
    },
    get newBranchScope() {
      return newBranchScope;
    },
    get pmsMode() {
      return pmsMode;
    },
    get pmsRecords() {
      return pmsRecords;
    },
    get pmsSearchTerm() {
      return pmsSearchTerm;
    },
    get pmsLoading() {
      return pmsLoading;
    },
    get selectedPmsRecordId() {
      return selectedPmsRecordId;
    },
    get laundryItemSummary() {
      return laundryItemSummary;
    },
    get laundryNote() {
      return laundryNote;
    },
    get laundrySearchTerm() {
      return laundrySearchTerm;
    },
    get laundryStatusFilter() {
      return laundryStatusFilter;
    },
    get laundryLoading() {
      return laundryLoading;
    },
    get otaLoading() {
      return otaLoading;
    },
    get otaPreview() {
      return otaPreview;
    },
    get selectedMenu() {
      return selectedMenu;
    },
    get showsSettingsPanel() {
      return showsSettingsPanel;
    },
    get showsOtaReservationPanel() {
      return showsOtaReservationPanel;
    },
    get showsCustomerGuidancePanel() {
      return showsCustomerGuidancePanel;
    },
    get showsLaundryPanel() {
      return showsLaundryPanel;
    },
    get showsTemplateListPanel() {
      return showsTemplateListPanel;
    },
    get showsWorkLanguageSelector() {
      return showsWorkLanguageSelector;
    },
    get navigationLocked() {
      return navigationLocked;
    },
    get activeTemplates() {
      return activeTemplates;
    },
    get activeMenuRequiresSelectedRoom() {
      return activeMenuRequiresSelectedRoom;
    },
    get activeMenuUsesWingsContext() {
      return activeMenuUsesWingsContext;
    },
    get visiblePmsRecords() {
      return visiblePmsRecords;
    },
    get selectedPmsRecord() {
      return selectedPmsRecord;
    },
    get filteredLaundryRecords() {
      return filteredLaundryRecords;
    },
    get roomsSettingsActions(): ResolvedRoomsSettingsAction[] {
      return roomsSettingsActions;
    },
    get hasWingsPmsContext() {
      return tabContext.isPmsPage || tabContext.isGuestRecord;
    },
  };
}

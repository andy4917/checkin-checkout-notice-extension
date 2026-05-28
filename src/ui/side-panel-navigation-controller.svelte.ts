import { loadOtaReservationPreview, fillWingsReservationFromPreview } from "../application/ota-reservation-input.js";
import { renderAirportVanCopy } from "../application/airport-van-form.js";
import {
  addLaundryRecord,
  createLaundryColumnViews,
  hideLaundryProgressEntry,
  moveLaundryRecord,
  queryLaundryRecords,
  removeLaundryProgressEntry,
  removeLaundryRecord,
  visibleLaundryProgressLog,
} from "../application/laundry-records.js";
import {
  createOperatorErrorMessageTracker,
  STORAGE_CORRUPTION_MESSAGE,
} from "../application/operator-error-messages.js";
import { syncGuests } from "../application/sync-guests.js";
import { resetAllTemplateSettings } from "../application/template-settings.js";
import { resolveDefaultLanguageFromNationalityFields } from "../domain/language.js";
import { resolveWorkRoomContext } from "../domain/room-context.js";
import { getBranchOptions, isBranchId } from "../config/branches.js";
import {
  filterTemplatesForMenu,
  getMenu,
  homeBottomNavigationItems,
  homeNavigationGroups,
  homeNavigationLabels,
} from "../catalog/menu-routing.js";
import { applyStoredUnifiedTemplateState, scopeUnifiedTemplateForBranch } from "../catalog/template-catalog.js";
import { renderTemplate } from "../catalog/template-renderer.js";
import type { ExtensionStateReadResult } from "../platform/chrome-storage.js";
import type { AirportVanCopyTarget, AirportVanFormValues } from "../application/airport-van-form.js";
import type { LaundryColumnView } from "../application/laundry-records.js";
import type { OtaReservationInputDependencies, OtaReservationInputPreview } from "../application/ota-reservation-input.js";
import type { LaundryStorageArea } from "../laundry/storage.js";
import type { LaundryMoveTarget, LaundryProgressEntry, LaundryRecord } from "../laundry/types.js";
import type { HomeBottomNavigationItem, HomeNavigationItem, MenuId, MenuItem, MenuTemplateFilter } from "../catalog/menu-routing.js";
import type { StoredExtensionState, TemplateVariable, UnifiedTemplateDefinition } from "../catalog/template-types.js";
import type { BranchId, Language, PmsFetch, PmsGuestRecord, TabMode } from "../types.js";

export type SidePanelNavigationControllerDependencies = {
  extensionState: {
    readWithRecovery(): Promise<ExtensionStateReadResult>;
    setLastBranchId(branchId: BranchId): Promise<void>;
    writeState(state: StoredExtensionState): Promise<void>;
  };
  clipboard: {
    writeText(text: string): Promise<void>;
  };
  laundryStorage: LaundryStorageArea;
  otaReservation: OtaReservationInputDependencies;
  pmsGuests: {
    fetchImpl: PmsFetch;
  };
  dateSource: {
    today(): Date;
  };
};

export type WorkStatusTone = "neutral" | "success" | "error";
export type BottomPanelState = {
  id: string;
  title: string;
  icon: string;
  mode: TabMode;
};
const DEFAULT_LANGUAGE: Language = "KO";

export function createSidePanelNavigationController(
  dependencies: SidePanelNavigationControllerDependencies,
) {
  const branchOptions = getBranchOptions();
  let selectedBranchId = $state<BranchId | "">("");
  let extensionState = $state<StoredExtensionState | null>(null);
  let activeMenuId = $state<MenuId | null>(null);
  let activeTemplateFilter = $state<MenuTemplateFilter | null>(null);
  let selectedLanguage = $state<Language>(DEFAULT_LANGUAGE);
  let languageChanging = $state(false);
  let languageChangeTimer: ReturnType<typeof setTimeout> | null = null;
  let statusMessage = $state("");
  let statusTone = $state<WorkStatusTone>("neutral");
  const operatorErrorMessages = createOperatorErrorMessageTracker();
  let copiedTemplateId = $state<string | null>(null);
  let otaPreview = $state<OtaReservationInputPreview | null>(null);
  let laundryRecords = $state<LaundryRecord[]>([]);
  let laundryVersion = $state(0);
  let activeBottomPanel = $state<BottomPanelState | null>(null);
  let pmsRecords = $state<PmsGuestRecord[]>([]);
  let pmsSearchTerm = $state("");
  let selectedPmsRecord = $state<PmsGuestRecord | null>(null);
  let loading = $state(false);

  async function mount() {
    try {
      const { state, recovered } = await dependencies.extensionState.readWithRecovery();
      extensionState = state;
      if (state.lastBranchId) {
        selectedBranchId = state.lastBranchId;
      }
      if (recovered) {
        setStatus(STORAGE_CORRUPTION_MESSAGE, "error");
      }
    } catch (error) {
      extensionState = null;
      setErrorStatus(error);
    }
  }

  async function handleBranchChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    selectedBranchId = isBranchId(target.value) ? target.value : "";
    if (selectedBranchId) {
      await dependencies.extensionState.setLastBranchId(selectedBranchId);
      if (extensionState) {
        extensionState = { ...extensionState, lastBranchId: selectedBranchId };
      }
    }
    clearSelectedPmsRecord();
    pmsRecords = [];
    if (activeMenuId && getMenu(activeMenuId).screenKind === "laundry") {
      await refreshLaundryRecords();
    }
    if (activeBottomPanel) {
      await refreshPmsGuests();
    }
  }

  function goHome() {
    activeMenuId = null;
    activeTemplateFilter = null;
    activeBottomPanel = null;
    copiedTemplateId = null;
    statusMessage = "";
    statusTone = "neutral";
    otaPreview = null;
  }

  async function openMenu(target: MenuId | HomeNavigationItem) {
    const menuId = typeof target === "string" ? target : target.menuId;
    activeMenuId = menuId;
    activeBottomPanel = null;
    activeTemplateFilter = typeof target === "string" ? null : target.templateFilter || null;
    selectedLanguage = DEFAULT_LANGUAGE;
    copiedTemplateId = null;
    statusMessage = "";
    statusTone = "neutral";
    otaPreview = null;

    if (getMenu(menuId).screenKind === "laundry") {
      await refreshLaundryRecords();
    }
  }

  function selectLanguage(language: Language) {
    if (selectedLanguage === language) return;
    if (languageChangeTimer) {
      clearTimeout(languageChangeTimer);
      languageChangeTimer = null;
    }
    selectedLanguage = language;
    languageChanging = true;
    copiedTemplateId = null;
    statusMessage = "";
    statusTone = "neutral";
    languageChangeTimer = setTimeout(() => {
      languageChanging = false;
      languageChangeTimer = null;
    }, 180);
  }

  async function copyTemplate(templateId: string) {
    const template = activeTemplates().find((item) => item.id === templateId);
    if (!template) {
      setStatus("템플릿을 찾지 못했습니다.", "error");
      return;
    }

    loading = true;
    copiedTemplateId = null;
    try {
      const output = renderTemplate(template, selectedLanguage, templateValues());
      await dependencies.clipboard.writeText(output);
      copiedTemplateId = template.id;
      setStatus("복사되었습니다.", "success");
    } catch (error) {
      setErrorStatus(error);
    } finally {
      loading = false;
    }
  }

  async function copyHomeTemplate(target: HomeNavigationItem, templateId: string) {
    const template = templatesForHomeNavigationItem(target).find((item) => item.id === templateId);
    if (!template) {
      setStatus("템플릿을 찾지 못했습니다.", "error");
      return;
    }

    loading = true;
    copiedTemplateId = null;
    try {
      const output = renderTemplate(template, selectedLanguage, templateValues());
      await dependencies.clipboard.writeText(output);
      copiedTemplateId = template.id;
      setStatus("복사되었습니다.", "success");
    } catch (error) {
      setErrorStatus(error);
    } finally {
      loading = false;
    }
  }

  async function refreshLaundryRecords() {
    loading = true;
    try {
      laundryRecords = await queryLaundryRecords(
        selectedBranchId ? { branchId: selectedBranchId } : {},
        dependencies.laundryStorage,
      );
      laundryVersion += 1;
      setStatus("", "neutral");
    } catch (error) {
      laundryRecords = [];
      laundryVersion += 1;
      setErrorStatus(error);
    } finally {
      loading = false;
    }
  }

  async function createManualLaundryRecord(itemSummary: string) {
    if (!selectedBranchId) {
      setStatus("지점을 선택하여주십시오.", "error");
      return;
    }

    loading = true;
    try {
      const record = await addLaundryRecord(
        {
          branchId: selectedBranchId,
          guestName: "",
          roomNo: "",
          displayRoom: "",
          itemSummary,
        },
        dependencies.laundryStorage,
        dependencies.dateSource.today(),
      );
      laundryRecords = [record, ...laundryRecords.filter((item) => item.id !== record.id)];
      laundryVersion += 1;
      setStatus("세탁 블록을 추가했습니다.", "success");
    } catch (error) {
      setErrorStatus(error);
    } finally {
      loading = false;
    }
  }

  async function moveLaundryRecordTo(recordId: string, target: LaundryMoveTarget) {
    loading = true;
    try {
      const record = await moveLaundryRecord(recordId, target, dependencies.laundryStorage, dependencies.dateSource.today());
      laundryRecords = laundryRecords.map((item) => (item.id === record.id ? record : item));
      laundryVersion += 1;
      setStatus("진행상태를 기록했습니다.", "success");
    } catch (error) {
      setErrorStatus(error);
    } finally {
      loading = false;
    }
  }

  async function removeLaundryRecordById(recordId: string) {
    loading = true;
    try {
      await removeLaundryRecord(recordId, dependencies.laundryStorage);
      laundryRecords = laundryRecords.filter((item) => item.id !== recordId);
      laundryVersion += 1;
      setStatus("세탁 블록을 제거했습니다.", "success");
    } catch (error) {
      setErrorStatus(error);
    } finally {
      loading = false;
    }
  }

  async function hideLaundryProgressEntryById(entryId: string) {
    loading = true;
    try {
      await hideLaundryProgressEntry(entryId, dependencies.laundryStorage);
      laundryRecords = await queryLaundryRecords(
        selectedBranchId ? { branchId: selectedBranchId } : {},
        dependencies.laundryStorage,
      );
      laundryVersion += 1;
      setStatus("진행 기록을 숨겼습니다.", "success");
    } catch (error) {
      setErrorStatus(error);
    } finally {
      loading = false;
    }
  }

  async function removeLaundryProgressEntryById(entryId: string) {
    loading = true;
    try {
      await removeLaundryProgressEntry(entryId, dependencies.laundryStorage);
      laundryRecords = await queryLaundryRecords(
        selectedBranchId ? { branchId: selectedBranchId } : {},
        dependencies.laundryStorage,
      );
      laundryVersion += 1;
      setStatus("진행 기록을 제거했습니다.", "success");
    } catch (error) {
      setErrorStatus(error);
    } finally {
      loading = false;
    }
  }

  async function openBottomNavigation(item: HomeBottomNavigationItem) {
    if (item.menuId) {
      await openMenu(item.menuId);
      return;
    }
    if (!item.action) return;

    if (!selectedBranchId) {
      setStatus("지점을 선택하여주십시오.", "error");
      return;
    }

    activeMenuId = null;
    activeTemplateFilter = null;
    activeBottomPanel = {
      id: item.id,
      title: item.title,
      icon: item.icon,
      mode: item.action.mode,
    };
    pmsSearchTerm = "";
    clearSelectedPmsRecord();
    copiedTemplateId = null;
    otaPreview = null;
    await refreshPmsGuests();
  }

  async function refreshPmsGuests() {
    if (!activeBottomPanel) return;
    loading = true;
    clearSelectedPmsRecord();
    try {
      const result = await syncGuests({
        date: formatPmsDate(dependencies.dateSource.today()),
        mode: activeBottomPanel.mode,
        branchId: selectedBranchId,
        searchTerm: pmsSearchTerm,
        fetchImpl: dependencies.pmsGuests.fetchImpl,
      });
      pmsRecords = result.records;
      setStatus("", "neutral");
    } catch (error) {
      pmsRecords = [];
      clearSelectedPmsRecord();
      setErrorStatus(error);
    } finally {
      loading = false;
    }
  }

  function setPmsSearchTerm(value: string) {
    pmsSearchTerm = value;
    if (
      selectedPmsRecord &&
      !pmsVisibleRecords().some((record) => record.id === selectedPmsRecord?.id)
    ) {
      clearSelectedPmsRecord();
    }
  }

  function selectPmsGuestRecord(recordId: string) {
    const record = pmsVisibleRecords().find((item) => item.id === recordId) || null;
    selectedPmsRecord = record;
    if (record) {
      selectedLanguage = resolveDefaultLanguageFromNationalityFields(record.raw);
      setStatus("객실을 선택했습니다.", "success");
    }
  }

  function clearSelectedPmsRecord() {
    selectedPmsRecord = null;
  }

  async function loadOtaPreview() {
    loading = true;
    try {
      otaPreview = await loadOtaReservationPreview(
        selectedBranchId,
        dependencies.otaReservation,
      );
      setStatus("예약정보를 가져왔습니다.", "success");
    } catch (error) {
      otaPreview = null;
      setErrorStatus(error);
    } finally {
      loading = false;
    }
  }

  async function fillOtaPreview() {
    if (!otaPreview) {
      setStatus("먼저 예약정보를 가져와주세요.", "error");
      return;
    }

    loading = true;
    try {
      const result = await fillWingsReservationFromPreview(
        otaPreview,
        dependencies.otaReservation,
      );
      setStatus(
        result.missing.length > 0
          ? `입력 완료, 누락 ${result.missing.length}개`
          : "WINGS 입력이 완료되었습니다.",
        result.missing.length > 0 ? "neutral" : "success",
      );
    } catch (error) {
      setErrorStatus(error);
    } finally {
      loading = false;
    }
  }

  async function resetTemplateSettings() {
    if (!extensionState) return;
    loading = true;
    try {
      const nextState = resetAllTemplateSettings(extensionState);
      await dependencies.extensionState.writeState(nextState);
      extensionState = nextState;
      setStatus("템플릿 설정을 초기화했습니다.", "success");
    } catch (error) {
      setErrorStatus(error);
    } finally {
      loading = false;
    }
  }

  async function setTemplateVariableValue(variableName: string, value: string) {
    if (!extensionState) {
      setStatus("저장소를 불러오지 못했습니다.", "error");
      return;
    }

    const nextValues = { ...templateVariableValues() };
    if (value.trim().length === 0) {
      delete nextValues[variableName];
    } else {
      nextValues[variableName] = value;
    }

    const nextState: StoredExtensionState = {
      ...extensionState,
      ui: {
        ...extensionState.ui,
        templateVariableValues: nextValues,
      },
    };

    await dependencies.extensionState.writeState(nextState);
    extensionState = nextState;
    copiedTemplateId = null;
    setStatus("입력값을 저장했습니다.", "success");
  }

  async function setAirportVanFormValue(fieldName: keyof AirportVanFormValues, value: string) {
    if (!extensionState) {
      setStatus("저장소를 불러오지 못했습니다.", "error");
      return;
    }

    const nextValues: AirportVanFormValues = { ...airportVanFormValues() };
    if (value.trim().length === 0) {
      delete nextValues[fieldName];
    } else {
      nextValues[fieldName] = value.trim() as never;
    }

    const nextState: StoredExtensionState = {
      ...extensionState,
      ui: {
        ...extensionState.ui,
        airportVanFormValues: nextValues,
      },
    };

    await dependencies.extensionState.writeState(nextState);
    extensionState = nextState;
    copiedTemplateId = null;
    setStatus("입력값을 저장했습니다.", "success");
  }

  async function copyAirportVanText(target: AirportVanCopyTarget) {
    try {
      const output = renderAirportVanCopy(target, airportVanFormValues(), dependencies.dateSource.today());
      await dependencies.clipboard.writeText(output);
      copiedTemplateId = `airport-van-${target}`;
      setStatus(target === "workLog" ? "업무 기록용 문구를 복사했습니다." : "고객 전달용 문구를 복사했습니다.", "success");
    } catch (error) {
      setErrorStatus(error);
    }
  }

  function setStatus(message: string, tone: WorkStatusTone) {
    if (tone !== "error") {
      operatorErrorMessages.reset();
    }
    statusMessage = message;
    statusTone = tone;
  }

  function setErrorStatus(error: unknown) {
    statusMessage = operatorErrorMessages.format(error);
    statusTone = "error";
  }

  function activeMenu(): MenuItem | null {
    return activeMenuId ? getMenu(activeMenuId) : null;
  }

  function scopedTemplates(): UnifiedTemplateDefinition[] {
    if (!selectedBranchId || !extensionState) return [];
    const branchId = selectedBranchId;
    return applyStoredUnifiedTemplateState(extensionState)
      .filter((template) => template.branchScope.includes(branchId))
      .map((template) => scopeUnifiedTemplateForBranch(template, branchId));
  }

  function activeTemplates(): UnifiedTemplateDefinition[] {
    if (!activeMenuId) return [];
    const menuTemplates = filterTemplatesForMenu(activeMenuId, scopedTemplates());
    return activeTemplateFilter ? filterTemplatesByFilter(activeTemplateFilter, menuTemplates) : menuTemplates;
  }

  function templatesForHomeNavigationItem(target: HomeNavigationItem): UnifiedTemplateDefinition[] {
    const menuTemplates = filterTemplatesForMenu(target.menuId, scopedTemplates());
    return target.templateFilter ? filterTemplatesByFilter(target.templateFilter, menuTemplates) : menuTemplates;
  }

  function homeInlineTemplatesByItemId(): Record<string, UnifiedTemplateDefinition[]> {
    const entries = homeNavigationGroups
      .filter((group) => group.selectionMode === "accordion")
      .flatMap((group) => group.items.map((item) => [item.id, templatesForHomeNavigationItem(item)] as const));
    return Object.fromEntries(entries);
  }

  function templateVariableValues(): Record<string, string> {
    return extensionState?.ui.templateVariableValues || {};
  }

  function airportVanFormValues(): AirportVanFormValues {
    return extensionState?.ui.airportVanFormValues || {};
  }

  function templateValues(): Record<string, string> {
    return {
      ...(selectedPmsRecord?.templateValues || {}),
      ...templateVariableValues(),
    };
  }

  function pmsVisibleRecords(): PmsGuestRecord[] {
    const normalizedTerm = pmsSearchTerm.trim().toLowerCase();
    if (!normalizedTerm) return pmsRecords;
    return pmsRecords.filter((record) =>
      [
        record.displayRoom,
        record.roomNo,
        record.guestName,
        record.statusLabel,
      ].some((value) => value.toLowerCase().includes(normalizedTerm)),
    );
  }

  function requiredManualVariables(): TemplateVariable[] {
    return uniqueTemplateVariables(
      scopedTemplates().flatMap((template) =>
        template.variables.filter((variable) => variable.kind === "manualRequired"),
      ),
    );
  }

  function laundryColumnViews(): LaundryColumnView[] {
    return createLaundryColumnViews(laundryRecords);
  }

  function uniqueTemplateVariables(variables: readonly TemplateVariable[]): TemplateVariable[] {
    const seen = new Set<string>();
    const result: TemplateVariable[] = [];
    for (const variable of variables) {
      if (seen.has(variable.name)) continue;
      seen.add(variable.name);
      result.push(variable);
    }
    return result;
  }

  function filterTemplatesByFilter(
    filter: MenuTemplateFilter,
    templates: readonly UnifiedTemplateDefinition[],
  ): UnifiedTemplateDefinition[] {
    if (filter.kind === "none") return [];
    if (filter.kind === "menu") return templates.filter((template) => template.menuId === activeMenuId);
    if (filter.kind === "type") {
      return templates.filter((template) => template.typeId === filter.typeId);
    }
    const typeIds = new Set(filter.typeIds);
    return templates.filter((template) => typeIds.has(template.typeId));
  }

  function formatPmsDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}${month}${day}`;
  }

  return {
    branchOptions,
    homeNavigation: homeNavigationGroups,
    homeBottomNavigation: homeBottomNavigationItems,
    homeLabels: homeNavigationLabels,
    mount,
    handleBranchChange,
    goHome,
    openMenu,
    selectLanguage,
    copyTemplate,
    copyHomeTemplate,
    refreshLaundryRecords,
    createManualLaundryRecord,
    moveLaundryRecordTo,
    removeLaundryRecordById,
    hideLaundryProgressEntryById,
    removeLaundryProgressEntryById,
    loadOtaPreview,
    fillOtaPreview,
    resetTemplateSettings,
    setTemplateVariableValue,
    setAirportVanFormValue,
    copyAirportVanText,
    openBottomNavigation,
    refreshPmsGuests,
    setPmsSearchTerm,
    selectPmsGuestRecord,
    get navigationLocked() {
      return loading;
    },
    get selectedBranchId() {
      return selectedBranchId;
    },
    get activeMenuId() {
      return activeMenuId;
    },
    get activeMenu() {
      return activeMenu();
    },
    get activeBottomPanel() {
      return activeBottomPanel;
    },
    get activeTemplates() {
      return activeTemplates();
    },
    get homeInlineTemplatesByItemId() {
      return homeInlineTemplatesByItemId();
    },
    get templateVariableValues() {
      return templateVariableValues();
    },
    get airportVanFormValues() {
      return airportVanFormValues();
    },
    get templateValues() {
      return templateValues();
    },
    get requiredManualVariables() {
      return requiredManualVariables();
    },
    get selectedLanguage() {
      return selectedLanguage;
    },
    get languageChanging() {
      return languageChanging;
    },
    get statusMessage() {
      return statusMessage;
    },
    get statusTone() {
      return statusTone;
    },
    get copiedTemplateId() {
      return copiedTemplateId;
    },
    get otaPreview() {
      return otaPreview;
    },
    get laundryRecords() {
      return laundryRecords;
    },
    get laundryVersion() {
      return laundryVersion;
    },
    get laundryColumnViews(): LaundryColumnView[] {
      return laundryColumnViews();
    },
    get laundryProgressLog(): LaundryProgressEntry[] {
      return visibleLaundryProgressLog(laundryRecords, dependencies.dateSource.today());
    },
    get pmsRecords() {
      return pmsRecords;
    },
    get pmsVisibleRecords() {
      return pmsVisibleRecords();
    },
    get pmsSearchTerm() {
      return pmsSearchTerm;
    },
    get selectedPmsRecord() {
      return selectedPmsRecord;
    },
    get workRoomContext() {
      return resolveWorkRoomContext(selectedPmsRecord);
    },
    get loading() {
      return loading;
    },
  };
}

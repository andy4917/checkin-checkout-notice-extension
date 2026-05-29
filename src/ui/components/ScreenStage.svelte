<script lang="ts">
  import * as HomeViewModule from "./HomeView.svelte";
  import * as PmsGuestPanelModule from "./PmsGuestPanel.svelte";
  import * as WorkSurfaceModule from "./WorkSurface.svelte";
  import type {
    HomeBottomNavigationItem,
    HomeNavigationGroup,
    HomeNavigationItem,
    HomeNavigationLabels,
    MenuId,
    MenuItem,
  } from "../../catalog/menu-routing.js";
  import type { TemplateVariable, UnifiedTemplateDefinition } from "../../catalog/template-types.js";
  import type { AirportVanCopyTarget, AirportVanFormValues } from "../../application/airport-van-form.js";
  import type { LaundryColumnView } from "../../application/laundry-records.js";
  import type { OtaReservationInputPreview } from "../../application/ota-reservation-input.js";
  import type { LaundryMoveTarget } from "../../laundry/types.js";
  import type { Language, PmsGuestRecord } from "../../types.js";
  import type { BottomPanelState } from "../side-panel-navigation-controller.svelte.js";

  const HomeView = HomeViewModule.default;
  const PmsGuestPanel = PmsGuestPanelModule.default;
  const WorkSurface = WorkSurfaceModule.default;

  export let activeMenu: MenuItem | null;
  export let activeMenuTitle: string | null;
  export let activeBottomPanel: BottomPanelState | null;
  export let activeTemplates: readonly UnifiedTemplateDefinition[];
  export let homeInlineTemplatesByItemId: Readonly<Record<string, readonly UnifiedTemplateDefinition[]>>;
  export let copiedTemplateId: string | null;
  export let hasSelectedPmsRecord: boolean;
  export let homeBottomNavigation: readonly HomeBottomNavigationItem[];
  export let homeLabels: HomeNavigationLabels;
  export let homeNavigation: readonly HomeNavigationGroup[];
  export let homeReturnGroupId: string;
  export let laundryColumnViews: readonly LaundryColumnView[];
  export let laundryVersion: number;
  export let loading: boolean;
  export let languageChanging: boolean;
  export let otaPreview: OtaReservationInputPreview | null;
  export let pmsSearchTerm: string;
  export let pmsVisibleRecords: readonly PmsGuestRecord[];
  export let requiredManualVariables: readonly TemplateVariable[];
  export let selectedBranchReady: boolean;
  export let selectedLanguage: Language;
  export let selectedPmsRecordId: string | null;
  export let statusMessage: string;
  export let statusTone: "neutral" | "success" | "error";
  export let templateValues: Record<string, string>;
  export let templateVariableValues: Record<string, string>;
  export let airportVanFormValues: AirportVanFormValues;
  export let onBack: () => void;
  export let onCopyAirportVanText: (target: AirportVanCopyTarget) => void;
  export let onCopyHomeTemplate: (target: HomeNavigationItem, templateId: string) => void;
  export let onCopyTemplate: (templateId: string) => void;
  export let onCreateLaundryRecord: (itemSummary: string) => void;
  export let onFillOtaPreview: () => void;
  export let onLoadOtaPreview: () => void;
  export let onMoveLaundryRecord: (recordId: string, target: LaundryMoveTarget) => void;
  export let onRemoveLaundryRecord: (recordId: string) => void;
  export let onOpenBottomItem: (item: HomeBottomNavigationItem) => void;
  export let onOpenMenu: (target: MenuId | HomeNavigationItem) => void;
  export let onRefreshPms: () => void;
  export let onResetTemplateSettings: () => void;
  export let onSearchPms: (searchTerm: string) => void;
  export let onSelectLanguage: (language: Language) => void;
  export let onSelectPmsRecord: (recordId: string) => void;
  export let onSetAirportVanFormValue: (fieldName: keyof AirportVanFormValues, value: string) => void;
  export let onSetTemplateVariableValue: (variableName: string, value: string) => void;
  export let onUpsertRoomRemark: (templateId: string) => void;

</script>

<div class="screen-stage" data-view-key={activeMenuTitle || activeBottomPanel?.title || "navigation"}>
  {#if activeMenuTitle && activeMenu}
    {#key `${activeMenu.id}:${activeMenu.screenKind === "laundry" ? laundryVersion : 0}`}
      <WorkSurface
        menu={activeMenu}
        templates={activeTemplates}
        selectedLanguage={selectedLanguage}
        selectedBranchReady={selectedBranchReady}
        statusMessage={statusMessage}
        statusTone={statusTone}
        copiedTemplateId={copiedTemplateId}
        loading={loading}
        laundryColumnViews={laundryColumnViews}
        otaPreview={otaPreview}
        airportVanFormValues={airportVanFormValues}
        templateVariableValues={templateVariableValues}
        templateValues={templateValues}
        hasSelectedPmsRecord={hasSelectedPmsRecord}
        requiredManualVariables={requiredManualVariables}
        onSelectLanguage={onSelectLanguage}
        onCopyTemplate={onCopyTemplate}
        onCreateLaundryRecord={onCreateLaundryRecord}
        onMoveLaundryRecord={onMoveLaundryRecord}
        onRemoveLaundryRecord={onRemoveLaundryRecord}
        onLoadOtaPreview={onLoadOtaPreview}
        onFillOtaPreview={onFillOtaPreview}
        onResetTemplateSettings={onResetTemplateSettings}
        onSetTemplateVariableValue={onSetTemplateVariableValue}
        onSetAirportVanFormValue={onSetAirportVanFormValue}
        onCopyAirportVanText={onCopyAirportVanText}
        onUpsertRoomRemark={onUpsertRoomRemark}
      />
    {/key}
  {:else if activeBottomPanel}
    <PmsGuestPanel
      panel={activeBottomPanel}
      records={pmsVisibleRecords}
      selectedRecordId={selectedPmsRecordId}
      searchTerm={pmsSearchTerm}
      statusMessage={statusMessage}
      statusTone={statusTone}
      loading={loading}
      onBack={onBack}
      onRefresh={onRefreshPms}
      onSearch={onSearchPms}
      onSelectRecord={onSelectPmsRecord}
    />
  {:else}
    <HomeView
      bottomItems={homeBottomNavigation}
      copiedTemplateId={copiedTemplateId}
      groups={homeNavigation}
      inlineTemplatesByItemId={homeInlineTemplatesByItemId}
      labels={homeLabels}
      initialGroupId={homeReturnGroupId}
      loading={loading}
      languageChanging={languageChanging}
      selectedBranchReady={selectedBranchReady}
      selectedLanguage={selectedLanguage}
      onCopyTemplate={onCopyHomeTemplate}
      onSelectLanguage={onSelectLanguage}
      onOpenMenu={onOpenMenu}
      onOpenBottomItem={onOpenBottomItem}
    />
  {/if}
</div>

<script lang="ts">
  import { onMount } from "svelte";
  import * as ScreenStageModule from "./ScreenStage.svelte";
  import * as ShellHeaderModule from "./ShellHeader.svelte";
  import { getMenu } from "../../catalog/menu-routing.js";
  import type { HomeBottomNavigationItem, HomeNavigationItem, MenuId, MenuItem } from "../../catalog/menu-routing.js";
  import type {
    BottomPanelState,
    createSidePanelNavigationController,
  } from "../side-panel-navigation-controller.svelte.js";

  const ScreenStage = ScreenStageModule.default;
  const ShellHeader = ShellHeaderModule.default;

  let { controller }: { controller: ReturnType<typeof createSidePanelNavigationController> } = $props();

  let renderedMenu = $state<MenuItem | null>(null);
  let renderedBottomPanel = $state<BottomPanelState | null>(null);
  let renderedViewKey = $state("");
  let lastHomeGroupId = $state("");
  let homeReturnGroupId = $state("");

  onMount(() => {
    void mount();
  });

  async function mount() {
    await controller.mount();
    syncViewFromController();
  }

  async function openMenu(target: MenuId | HomeNavigationItem) {
    lastHomeGroupId = typeof target === "string" ? "" : findHomeGroupId(target);
    homeReturnGroupId = "";
    const baseMenu = getMenu(typeof target === "string" ? target : target.menuId);
    renderedMenu = typeof target === "string"
      ? baseMenu
      : { ...baseMenu, title: target.title, icon: target.icon };
    renderedViewKey = typeof target === "string" ? target : `${target.menuId}:${target.id}`;
    renderedBottomPanel = null;
    await controller.openMenu(target);
    syncViewFromController();
  }

  async function openBottomItem(item: HomeBottomNavigationItem) {
    homeReturnGroupId = "";
    lastHomeGroupId = "";
    renderedViewKey = "";
    if (item.menuId) {
      await openMenu(item.menuId);
      return;
    }
    await controller.openBottomNavigation(item);
    syncViewFromController();
  }

  function goBack() {
    homeReturnGroupId = lastHomeGroupId;
    renderedViewKey = "";
    controller.goHome();
    syncViewFromController();
  }

  function findHomeGroupId(target: HomeNavigationItem): string {
    return controller.homeNavigation.find((group) => group.items.some((item) => item.id === target.id))?.id || "";
  }

  function syncViewFromController() {
    if (controller.activeMenuId) {
      if (!renderedMenu || renderedMenu.id !== controller.activeMenuId) {
        renderedMenu = getMenu(controller.activeMenuId);
        renderedViewKey = controller.activeMenuId;
      }
    } else {
      renderedMenu = null;
      renderedViewKey = "";
    }
    renderedBottomPanel = controller.activeBottomPanel;
  }
</script>

<main class:home-mode={!controller.activeMenu && !controller.activeBottomPanel} class="app-shell">
  <ShellHeader
    activeMenuTitle={renderedMenu?.title || controller.activeMenu?.title || controller.activeBottomPanel?.title || renderedBottomPanel?.title || null}
    branchOptions={controller.branchOptions}
    navigationLocked={controller.navigationLocked}
    selectedBranchId={controller.selectedBranchId}
    onBranchChange={controller.handleBranchChange}
    onBack={goBack}
  />

  {#if controller.statusMessage && controller.statusTone === "error" && !controller.activeMenu && !controller.activeBottomPanel}
    <p
      aria-live="polite"
      class:error={controller.statusTone === "error"}
      class:success={controller.statusTone === "success"}
      class="work-status shell-status"
      role={controller.statusTone === "error" ? "alert" : "status"}
    >
      {controller.statusMessage}
    </p>
  {/if}

  {#key renderedViewKey || controller.activeBottomPanel?.id || renderedBottomPanel?.id || "navigation"}
    <ScreenStage
      activeMenu={renderedMenu || controller.activeMenu}
      activeMenuTitle={renderedMenu?.title || controller.activeMenu?.title || null}
      activeBottomPanel={controller.activeBottomPanel || renderedBottomPanel}
      activeTemplates={controller.activeTemplates}
      homeInlineTemplatesByItemId={controller.homeInlineTemplatesByItemId}
      copiedTemplateId={controller.copiedTemplateId}
      hasSelectedPmsRecord={Boolean(controller.selectedPmsRecord)}
      homeBottomNavigation={controller.homeBottomNavigation}
      homeLabels={controller.homeLabels}
      homeNavigation={controller.homeNavigation}
      laundryColumnViews={controller.laundryColumnViews}
      homeReturnGroupId={homeReturnGroupId}
      laundryVersion={controller.laundryVersion}
      loading={controller.loading}
      languageChanging={controller.languageChanging}
      otaPreview={controller.otaPreview}
      pmsSearchTerm={controller.pmsSearchTerm}
      pmsVisibleRecords={controller.pmsVisibleRecords}
      requiredManualVariables={controller.requiredManualVariables}
      selectedBranchReady={Boolean(controller.selectedBranchId)}
      selectedLanguage={controller.selectedLanguage}
      selectedPmsRecordId={controller.selectedPmsRecord?.id || null}
      statusMessage={controller.statusMessage}
      statusTone={controller.statusTone}
      templateValues={controller.templateValues}
      templateVariableValues={controller.templateVariableValues}
      airportVanFormValues={controller.airportVanFormValues}
      onBack={goBack}
      onCopyAirportVanText={controller.copyAirportVanText}
      onCopyHomeTemplate={controller.copyHomeTemplate}
      onCopyTemplate={controller.copyTemplate}
      onCreateLaundryRecord={controller.createManualLaundryRecord}
      onFillOtaPreview={controller.fillOtaPreview}
      onLoadOtaPreview={controller.loadOtaPreview}
      onMoveLaundryRecord={controller.moveLaundryRecordTo}
      onRemoveLaundryRecord={controller.removeLaundryRecordById}
      onOpenBottomItem={openBottomItem}
      onOpenMenu={openMenu}
      onRefreshPms={controller.refreshPmsGuests}
      onResetTemplateSettings={controller.resetTemplateSettings}
      onSearchPms={controller.setPmsSearchTerm}
      onSelectLanguage={controller.selectLanguage}
      onSelectPmsRecord={controller.selectPmsGuestRecord}
      onSetAirportVanFormValue={controller.setAirportVanFormValue}
      onSetTemplateVariableValue={controller.setTemplateVariableValue}
      onUpsertRoomRemark={controller.upsertRoomRemark}
    />
  {/key}
</main>

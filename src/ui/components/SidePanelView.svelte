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
  let homeDrillActive = $state(false);
  let viewDirection = $state<"forward" | "backward" | "replace">("replace");
  let activeShellTitle = $derived(
    renderedMenu?.title || controller.activeMenu?.title || controller.activeBottomPanel?.title || renderedBottomPanel?.title || null,
  );
  let showingHome = $derived(
    !renderedMenu && !controller.activeMenu && !controller.activeBottomPanel && !renderedBottomPanel,
  );
  let shellStatusVisible = $derived(
    !controller.activeMenu && !controller.activeBottomPanel && controller.statusMessage,
  );

  onMount(() => {
    void mount();
  });

  async function mount() {
    await controller.mount();
    syncViewFromController();
  }

  async function openMenu(target: MenuId | HomeNavigationItem) {
    homeDrillActive = false;
    lastHomeGroupId = typeof target === "string" ? "" : findHomeGroupId(target);
    homeReturnGroupId = "";
    viewDirection = "forward";
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
    homeDrillActive = false;
    homeReturnGroupId = "";
    lastHomeGroupId = "";
    renderedViewKey = "";
    viewDirection = "forward";
    if (item.menuId) {
      await openMenu(item.menuId);
      return;
    }
    await controller.openBottomNavigation(item);
    syncViewFromController();
  }

  function goBack() {
    homeReturnGroupId = lastHomeGroupId;
    homeDrillActive = Boolean(lastHomeGroupId);
    renderedViewKey = "";
    viewDirection = "backward";
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

  function handleHomeDrillStateChange(active: boolean) {
    homeDrillActive = active;
    if (!active) {
      homeReturnGroupId = "";
    }
  }

</script>

<main
  class:has-status={shellStatusVisible}
  class:home-mode={showingHome}
  class="app-shell"
  data-hidden-failure-kind={controller.hiddenFailureEvidence?.kind || undefined}
  data-hidden-failure-source={controller.hiddenFailureEvidence?.source || undefined}
  data-hidden-failure-visible={controller.hiddenFailureEvidence?.visibleStatus === false ? "false" : undefined}
>
  <ShellHeader
    activeMenuTitle={activeShellTitle}
    branchPickerEnabled={!homeDrillActive}
    branchOptions={controller.branchOptions}
    navigationLocked={controller.navigationLocked}
    selectedBranchId={controller.selectedBranchId}
    onBranchChange={controller.handleBranchChange}
  />

  {#if shellStatusVisible}
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
      workRoomContext={controller.workRoomContext}
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
      viewDirection={viewDirection}
      airportVanFormValues={controller.airportVanFormValues}
      onCopyAirportVanText={controller.copyAirportVanText}
      onCopyHomeTemplate={controller.copyHomeTemplate}
      onCopyTemplate={controller.copyTemplate}
      onCreateLaundryRecord={controller.createManualLaundryRecord}
      onHomeDrillStateChange={handleHomeDrillStateChange}
      onBack={goBack}
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
      onUpdateTemplateOverride={controller.updateTemplateOverride}
      onUpsertRoomRemark={controller.upsertRoomRemark}
    />
  {/key}
</main>

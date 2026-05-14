<script lang="ts">
  import * as HomeViewModule from "./HomeView.svelte";
  import * as AirportVanPanelModule from "./AirportVanPanel.svelte";
  import * as CustomerGuidancePanelModule from "./CustomerGuidancePanel.svelte";
  import * as LaundryPanelModule from "./LaundryPanel.svelte";
  import * as OtaReservationPanelModule from "./OtaReservationPanel.svelte";
  import * as RoomsSettingsBarModule from "./RoomsSettingsBar.svelte";
  import * as SettingsPanelModule from "./SettingsPanel.svelte";
  import * as ShellHeaderModule from "./ShellHeader.svelte";
  import * as TemplateListModule from "./TemplateList.svelte";
  import * as WorkHeaderModule from "./WorkHeader.svelte";
  import type { createSidePanelController } from "../side-panel-controller.svelte.js";

  const AirportVanPanel = AirportVanPanelModule.default;
  const HomeView = HomeViewModule.default;
  const CustomerGuidancePanel = CustomerGuidancePanelModule.default;
  const LaundryPanel = LaundryPanelModule.default;
  const OtaReservationPanel = OtaReservationPanelModule.default;
  const RoomsSettingsBar = RoomsSettingsBarModule.default;
  const SettingsPanel = SettingsPanelModule.default;
  const ShellHeader = ShellHeaderModule.default;
  const TemplateList = TemplateListModule.default;
  const WorkHeader = WorkHeaderModule.default;

  export let controller: ReturnType<typeof createSidePanelController>;
</script>

<main
  class:home-mode={controller.isHomeScreen}
  class="app-shell"
>
  <ShellHeader
    activeMenuIcon={controller.selectedMenu?.home?.icon || null}
    activeMenuTitle={controller.selectedMenu?.title || null}
    branchOptions={controller.branchOptions}
    navigationLocked={controller.navigationLocked}
    selectedBranchId={controller.selectedBranchId}
    onBranchChange={controller.handleBranchChange}
    onGoHome={controller.goHome}
  />

  {#key controller.activeMenu}
    <section class="screen-stage" aria-label={controller.isHomeScreen ? "홈" : "업무 화면"}>
      {#if controller.isHomeScreen}
        <HomeView
          sections={controller.homeMenuSections}
          onOpenMenu={controller.openMenu}
        />
      {:else}
        <WorkHeader
      activeTemplates={controller.activeTemplates}
      languages={controller.languages}
      selectedLanguage={controller.selectedLanguage}
      selectedPmsRecord={controller.selectedPmsRecord}
      showLanguageSelector={controller.showsWorkLanguageSelector}
      showRoomContext={controller.activeMenuRequiresSelectedRoom}
      showWingsStatus={controller.activeMenuUsesWingsContext}
      wingsConnected={controller.hasWingsPmsContext}
      hasAnyTemplateForLanguage={controller.hasAnyTemplateForLanguage}
      onSelectLanguage={controller.handleLanguageSelect}
    />

        {#if controller.showsSettingsPanel}
          <SettingsPanel
        audienceOptions={controller.audienceOptions}
        branchOptions={controller.branchOptions}
        catalogTemplates={controller.catalogTemplates}
        categoryOptions={controller.categoryOptions}
        contextOptions={controller.contextOptions}
        editBody={controller.editBody}
        editBranchScope={controller.editBranchScope}
        editTitle={controller.editTitle}
        isBuiltInTemplate={controller.isBuiltInTemplate}
        languages={controller.languages}
        navigationLocked={controller.navigationLocked}
        newAudience={controller.newAudience}
        newBody={controller.newBody}
        newBranchScope={controller.newBranchScope}
        newCategory={controller.newCategory}
        newContext={controller.newContext}
        newTitle={controller.newTitle}
        selectedLanguage={controller.selectedLanguage}
        settingsTemplateId={controller.settingsTemplateId}
        onAddCustomTemplate={controller.addCustomTemplate}
        onCancelTemplateEdit={controller.cancelTemplateEdit}
        onClearNewTemplateDraft={controller.clearNewTemplateDraft}
        onEditBodyChange={controller.setEditBody}
        onEditBranchScopeChange={controller.setEditBranchScope}
        onEditTitleChange={controller.setEditTitle}
        onSelectLanguage={controller.handleLanguageSelect}
        onNewAudienceChange={controller.setNewAudience}
        onNewBodyChange={controller.setNewBody}
        onNewBranchScopeChange={controller.setNewBranchScope}
        onNewCategoryChange={controller.setNewCategory}
        onNewContextChange={controller.setNewContext}
        onNewTitleChange={controller.setNewTitle}
        onResetTemplateEdit={controller.resetTemplateEdit}
        onSaveTemplateEdit={controller.saveTemplateEdit}
        onSettingsTemplateChange={controller.handleSettingsTemplateChange}
      />
        {:else if controller.showsOtaReservationPanel}
          <OtaReservationPanel
        otaLoading={controller.otaLoading}
        otaPreview={controller.otaPreview}
        selectedBranchId={controller.selectedBranchId}
        onFillWingsReservation={controller.fillWingsReservation}
        onLoadOtaReservation={controller.loadOtaReservation}
      />
        {:else}
          {#if controller.activeMenu === "AIRPORT_VAN_MANAGEMENT"}
            <AirportVanPanel
          activeTemplates={controller.activeTemplates}
          copiedTemplateId={controller.copiedTemplateId}
          selectedLanguage={controller.selectedLanguage}
          currentWorkContext={controller.currentWorkContext}
          onCopyTemplate={controller.copyTemplate}
          onTemplateVariableInput={controller.handleTemplateVariableInput}
          templateInputValue={controller.templateInputValue}
        />
          {:else if controller.showsCustomerGuidancePanel}
            <CustomerGuidancePanel
          activeTemplates={controller.activeTemplates}
          copiedTemplateId={controller.copiedTemplateId}
          selectedGuidanceTemplateId={controller.selectedGuidanceTemplateId}
          selectedLanguage={controller.selectedLanguage}
          currentWorkContext={controller.currentWorkContext}
          onCopyTemplate={controller.copyTemplate}
          onSelectGuidanceTemplate={controller.selectGuidanceTemplate}
        />
          {:else if controller.showsLaundryPanel}
            <LaundryPanel
          filteredLaundryRecords={controller.filteredLaundryRecords}
          laundryItemSummary={controller.laundryItemSummary}
          laundryLoading={controller.laundryLoading}
          selectedBranchId={controller.selectedBranchId}
          selectedPmsRecord={controller.selectedPmsRecord}
          onAddLaundry={controller.addLaundry}
          onLaundryItemSummaryChange={controller.setLaundryItemSummary}
          onLoadLaundryRecords={controller.loadLaundryRecords}
          onSetLaundryStatus={controller.setLaundryStatus}
        />
          {/if}

          {#if controller.showsTemplateListPanel && controller.activeMenu !== "AIRPORT_VAN_MANAGEMENT"}
            <TemplateList
          activeTemplates={controller.activeTemplates}
          copiedTemplateId={controller.copiedTemplateId}
          selectedLanguage={controller.selectedLanguage}
          currentWorkContext={controller.currentWorkContext}
          onCopyTemplate={controller.copyTemplate}
          onTemplateVariableInput={controller.handleTemplateVariableInput}
          templateInputValue={controller.templateInputValue}
          visibleTemplateVariables={controller.visibleTemplateVariables}
        />
          {/if}
        {/if}
      {/if}
    </section>
  {/key}

  <RoomsSettingsBar
    footerActions={controller.roomsSettingsActions}
    onOpenMenu={controller.openMenu}
    onRunCommand={controller.runRoomsSettingsCommand}
  />
</main>

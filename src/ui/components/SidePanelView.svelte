<script lang="ts">
  import * as HomeViewModule from "./HomeView.svelte";
  import * as LaundryPanelModule from "./LaundryPanel.svelte";
  import * as OtaReservationPanelModule from "./OtaReservationPanel.svelte";
  import * as RoomBottomBarModule from "./RoomBottomBar.svelte";
  import * as SettingsPanelModule from "./SettingsPanel.svelte";
  import * as ShellHeaderModule from "./ShellHeader.svelte";
  import * as TemplateListModule from "./TemplateList.svelte";
  import * as WorkHeaderModule from "./WorkHeader.svelte";
  import type { createSidePanelController } from "../side-panel-controller.svelte.js";

  const HomeView = HomeViewModule.default;
  const LaundryPanel = LaundryPanelModule.default;
  const OtaReservationPanel = OtaReservationPanelModule.default;
  const RoomBottomBar = RoomBottomBarModule.default;
  const SettingsPanel = SettingsPanelModule.default;
  const ShellHeader = ShellHeaderModule.default;
  const TemplateList = TemplateListModule.default;
  const WorkHeader = WorkHeaderModule.default;

  export let controller: ReturnType<typeof createSidePanelController>;
</script>

<main class:home-mode={controller.activeMenu === null} class="app-shell">
  <ShellHeader
    activeMenu={controller.activeMenu}
    branchOptions={controller.branchOptions}
    navigationLocked={controller.navigationLocked}
    selectedBranchId={controller.selectedBranchId}
    selectedPmsRecord={controller.selectedPmsRecord}
    onBack={controller.goBack}
    onBranchChange={controller.handleBranchChange}
  />

  {#if controller.activeMenu === null}
    <HomeView
      groups={controller.homeMenuGroups}
      settingsMenu={controller.homeSettingsMenu}
      onOpenMenu={controller.openMenu}
    />
  {:else}
    <WorkHeader
      activeMenu={controller.activeMenu}
      activeTabs={controller.activeTabs}
      activeTemplates={controller.activeTemplates}
      languages={controller.languages}
      navigationLocked={controller.navigationLocked}
      selectedLanguage={controller.selectedLanguage}
      selectedMenu={controller.selectedMenu}
      selectedTabId={controller.selectedTabId}
      hasAnyTemplateForLanguage={controller.hasAnyTemplateForLanguage}
      onGoHome={controller.goHome}
      onLanguageChange={controller.handleLanguageChange}
      onSelectTab={controller.selectTab}
    />

    <section class="status-bar" aria-live="polite">
      {controller.statusMessage}
    </section>

    {#if controller.activeMenu === "SETTINGS"}
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
        onLanguageChange={controller.handleLanguageChange}
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
    {:else if controller.activeMenu === "OTA_RESERVATION_INPUT"}
      <OtaReservationPanel
        otaLoading={controller.otaLoading}
        otaPreview={controller.otaPreview}
        selectedBranchId={controller.selectedBranchId}
        otaPreviewSummary={controller.otaPreviewSummary}
        onFillWingsReservation={controller.fillWingsReservation}
        onLoadOtaReservation={controller.loadOtaReservation}
      />
    {:else}
      {#if controller.activeMenu === "LAUNDRY_MANAGEMENT"}
        <LaundryPanel
          filteredLaundryRecords={controller.filteredLaundryRecords}
          laundryItemSummary={controller.laundryItemSummary}
          laundryLoading={controller.laundryLoading}
          laundryNote={controller.laundryNote}
          laundrySearchTerm={controller.laundrySearchTerm}
          laundryStatusFilter={controller.laundryStatusFilter}
          selectedBranchId={controller.selectedBranchId}
          selectedPmsRecord={controller.selectedPmsRecord}
          laundryStatusLabel={controller.laundryStatusLabel}
          nextLaundryStatus={controller.nextLaundryStatus}
          onAddLaundry={controller.addLaundry}
          onLaundryItemSummaryChange={controller.setLaundryItemSummary}
          onLaundryNoteChange={controller.setLaundryNote}
          onLaundrySearchTermChange={controller.setLaundrySearchTerm}
          onLaundryStatusFilterChange={controller.setLaundryStatusFilter}
          onLoadLaundryRecords={controller.loadLaundryRecords}
          onSetLaundryStatus={controller.setLaundryStatus}
        />
      {/if}

      <TemplateList
        activeTemplates={controller.activeTemplates}
        copiedTemplateId={controller.copiedTemplateId}
        selectedLanguage={controller.selectedLanguage}
        branchScopeLabel={controller.branchScopeLabel}
        currentWorkContext={controller.currentWorkContext}
        onCopyTemplate={controller.copyTemplate}
        onTemplateVariableInput={controller.handleTemplateVariableInput}
        templateInputValue={controller.templateInputValue}
        templateSummary={controller.templateSummary}
        templateTypeLabel={controller.templateTypeLabel}
        visibleTemplateVariables={controller.visibleTemplateVariables}
      />
    {/if}
  {/if}

  {#if controller.activeMenu !== null && controller.activeMenu !== "SETTINGS" && controller.activeMenu !== "OTA_RESERVATION_INPUT"}
    <RoomBottomBar
      pmsLoading={controller.pmsLoading}
      pmsMode={controller.pmsMode}
      pmsRecords={controller.pmsRecords}
      pmsSearchTerm={controller.pmsSearchTerm}
      selectedBranchId={controller.selectedBranchId}
      selectedPmsRecord={controller.selectedPmsRecord}
      selectedPmsRecordId={controller.selectedPmsRecordId}
      visiblePmsRecords={controller.visiblePmsRecords}
      onPmsSearchChange={controller.handlePmsSearchChange}
      onSelectPmsMode={controller.selectPmsMode}
      onSelectPmsRecord={controller.choosePmsRecord}
      onSyncPmsGuestRecords={controller.syncPmsGuestRecords}
    />
  {/if}
</main>

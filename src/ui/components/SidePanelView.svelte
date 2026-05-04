<script lang="ts">
  import * as HomeViewModule from "./HomeView.svelte";
  import * as CustomerGuidancePanelModule from "./CustomerGuidancePanel.svelte";
  import * as LaundryPanelModule from "./LaundryPanel.svelte";
  import * as OtaReservationPanelModule from "./OtaReservationPanel.svelte";
  import * as RoomsSettingsBarModule from "./RoomsSettingsBar.svelte";
  import * as SettingsPanelModule from "./SettingsPanel.svelte";
  import * as ShellHeaderModule from "./ShellHeader.svelte";
  import * as TemplateListModule from "./TemplateList.svelte";
  import * as WorkHeaderModule from "./WorkHeader.svelte";
  import type { createSidePanelController } from "../side-panel-controller.svelte.js";

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
  class:home-mode={controller.activeMenu === null}
  class="app-shell"
>
  <ShellHeader
    branchOptions={controller.branchOptions}
    navigationLocked={controller.navigationLocked}
    selectedBranchId={controller.selectedBranchId}
    onBranchChange={controller.handleBranchChange}
  />

  {#key controller.activeMenu}
    <section class="screen-stage" aria-label={controller.activeMenu === null ? "홈" : "업무 화면"}>
      {#if controller.activeMenu === null}
        <HomeView
          sections={controller.homeMenuSections}
          onOpenMenu={controller.openMenu}
        />
      {:else}
        <WorkHeader
      activeMenu={controller.activeMenu}
      activeTemplates={controller.activeTemplates}
      languages={controller.languages}
      navigationLocked={controller.navigationLocked}
      selectedLanguage={controller.selectedLanguage}
      selectedMenu={controller.selectedMenu}
      selectedPmsRecord={controller.selectedPmsRecord}
      showWingsStatus={controller.activeMenu !== "SETTINGS" &&
        controller.activeMenu !== "OTA_RESERVATION_INPUT"}
      wingsConnected={controller.hasWingsPmsContext}
      hasAnyTemplateForLanguage={controller.hasAnyTemplateForLanguage}
      onGoHome={controller.goHome}
      onSelectLanguage={controller.handleLanguageSelect}
    />

        {#if controller.statusMessage}
          <section class="status-bar" aria-live="polite">
            {controller.statusMessage}
          </section>
        {/if}

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
          {#if controller.activeMenu === "CUSTOMER_NOTICE"}
            <CustomerGuidancePanel
          activeTemplates={controller.activeTemplates}
          copiedTemplateId={controller.copiedTemplateId}
          selectedGuidanceTemplateId={controller.selectedGuidanceTemplateId}
          selectedLanguage={controller.selectedLanguage}
          currentWorkContext={controller.currentWorkContext}
          onCopyTemplate={controller.copyTemplate}
          onSelectGuidanceTemplate={controller.selectGuidanceTemplate}
          templateSummary={controller.templateSummary}
        />
          {:else if controller.activeMenu === "LAUNDRY_MANAGEMENT"}
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

          {#if controller.activeMenu !== "CUSTOMER_NOTICE"}
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
      {/if}
    </section>
  {/key}

  <RoomsSettingsBar
    footerActions={controller.roomsSettingsActions}
    onOpenMenu={controller.openMenu}
    onRunCommand={controller.runRoomsSettingsCommand}
  />
</main>

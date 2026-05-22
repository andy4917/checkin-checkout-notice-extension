<script lang="ts">
  import * as HomeViewModule from "./HomeView.svelte";
  import * as ShellHeaderModule from "./ShellHeader.svelte";
  import type { MenuId } from "../../catalog/menu-routing.js";
  import type { createSidePanelNavigationController } from "../side-panel-navigation-controller.svelte.js";

  const HomeView = HomeViewModule.default;
  const ShellHeader = ShellHeaderModule.default;

  export let controller: ReturnType<typeof createSidePanelNavigationController>;

  function holdNavigation(_menuId: MenuId) {
    return;
  }
</script>

<main
  class:home-mode={true}
  class="app-shell"
>
  <ShellHeader
    activeMenuIcon={null}
    activeMenuTitle={null}
    branchOptions={controller.branchOptions}
    navigationLocked={controller.navigationLocked}
    selectedBranchId={controller.selectedBranchId}
    onBranchChange={controller.handleBranchChange}
    onGoHome={controller.goHome}
  />

  <div class="screen-stage" data-view-key="navigation">
    <HomeView
      bottomItems={controller.homeBottomNavigation}
      groups={controller.homeNavigation}
      labels={controller.homeLabels}
      onOpenMenu={holdNavigation}
    />
  </div>
</main>

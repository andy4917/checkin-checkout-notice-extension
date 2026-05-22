<script lang="ts">
  import { onMount } from "svelte";
  import * as SidePanelModule from "./components/SidePanelView.svelte";
  import { browserSidePanelNavigationDependencies } from "./side-panel-navigation-dependencies.js";
  import { createSidePanelNavigationController } from "./side-panel-navigation-controller.svelte.js";

  const SidePanel = SidePanelModule.default;
  const controller = createSidePanelNavigationController(browserSidePanelNavigationDependencies);

  onMount(controller.mount);
</script>

<SidePanel {controller} />

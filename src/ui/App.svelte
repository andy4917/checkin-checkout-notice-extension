<script lang="ts">
  import { onMount } from "svelte";
  import * as SidePanelModule from "./components/SidePanelView.svelte";
  import { browserSidePanelDependencies } from "./side-panel-dependencies.js";
  import { createSidePanelController } from "./side-panel-controller.svelte.js";

  const SidePanel = SidePanelModule.default;
  const controller = createSidePanelController(browserSidePanelDependencies);

  onMount(controller.mount);
</script>

<SidePanel {controller} />

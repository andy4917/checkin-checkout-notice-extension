<script lang="ts">
  import { onMount } from "svelte";
  import SidePanelView from "./components/SidePanelView.svelte";
  import { browserSidePanelDependencies } from "./side-panel-dependencies.js";
  import { createSidePanelController } from "./side-panel-controller.svelte.js";

  const controller = createSidePanelController(browserSidePanelDependencies);

  onMount(controller.mount);
</script>

<SidePanelView {controller} />

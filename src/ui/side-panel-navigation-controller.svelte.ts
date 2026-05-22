import { getBranchOptions, isBranchId } from "../config/branches.js";
import {
  homeBottomNavigationItems,
  homeNavigationGroups,
  homeNavigationLabels,
} from "../catalog/menu-routing.js";
import type { ExtensionStateReadResult } from "../platform/chrome-storage.js";
import type { BranchId } from "../types.js";

export type SidePanelNavigationControllerDependencies = {
  extensionState: {
    readWithRecovery(): Promise<ExtensionStateReadResult>;
    setLastBranchId(branchId: BranchId): Promise<void>;
  };
};

export function createSidePanelNavigationController(
  dependencies: SidePanelNavigationControllerDependencies,
) {
  const branchOptions = getBranchOptions();
  let selectedBranchId = $state<BranchId | "">("");

  async function mount() {
    const { state } = await dependencies.extensionState.readWithRecovery();
    if (state.lastBranchId) {
      selectedBranchId = state.lastBranchId;
    }
  }

  async function handleBranchChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    selectedBranchId = isBranchId(target.value) ? target.value : "";
    if (selectedBranchId) {
      await dependencies.extensionState.setLastBranchId(selectedBranchId);
    }
  }

  function goHome() {
    return;
  }

  return {
    branchOptions,
    homeNavigation: homeNavigationGroups,
    homeBottomNavigation: homeBottomNavigationItems,
    homeLabels: homeNavigationLabels,
    mount,
    handleBranchChange,
    goHome,
    get navigationLocked() {
      return false;
    },
    get selectedBranchId() {
      return selectedBranchId;
    },
  };
}

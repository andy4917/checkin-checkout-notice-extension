import { ALL_BRANCH_IDS, TemplateCatalogSchemaError } from "../catalog/template-schema.js";
import type { BranchId } from "../types.js";
import type { StoredExtensionState } from "../catalog/template-types.js";

export function createBranchScopeSelection(
  selectedBranches: readonly BranchId[] = ALL_BRANCH_IDS,
): Record<BranchId, boolean> {
  return ALL_BRANCH_IDS.reduce(
    (selection, branchId) => ({
      ...selection,
      [branchId]: selectedBranches.includes(branchId),
    }),
    {} as Record<BranchId, boolean>,
  );
}

export function getSelectedBranches(selection: Record<BranchId, boolean>): BranchId[] {
  return ALL_BRANCH_IDS.filter((branchId) => selection[branchId]);
}

export function branchScopeChanged(
  selection: Record<BranchId, boolean>,
  branchScope: readonly BranchId[],
): boolean {
  const selectedBranches = getSelectedBranches(selection);
  return (
    selectedBranches.length !== branchScope.length ||
    selectedBranches.some((branchId) => !branchScope.includes(branchId))
  );
}

export function createCustomTemplateId(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `custom-${slug || "template"}-${Date.now().toString(36)}`;
}

export function getSettingsErrorMessage(error: unknown): string {
  if (error instanceof TemplateCatalogSchemaError) {
    return error.message;
  }
  return error instanceof Error ? error.message : String(error);
}

export function cloneStoredState(state: StoredExtensionState): StoredExtensionState {
  return {
    schemaVersion: 1,
    lastBranchId: state.lastBranchId,
    templateOverrides: { ...state.templateOverrides },
    customTemplates: state.customTemplates.map((template) => ({
      ...template,
      branchScope: [...template.branchScope],
      languages: { ...template.languages },
      variables: [...template.variables],
      attachments: [...template.attachments],
    })),
    ui: { ...state.ui },
  };
}

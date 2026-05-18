import {
  filterTemplatesForMenu,
  type MenuId,
  type MenuScreenKind,
} from "../catalog/menu-routing.js";
import { scopeUnifiedTemplateForBranch } from "../catalog/template-catalog.js";
import { ALL_BRANCH_IDS } from "../catalog/template-schema.js";
import type { TemplateDefinition, UnifiedTemplateDefinition } from "../catalog/template-types.js";
import type { LaundryRecord, LaundryStatus } from "../laundry/types.js";
import type { BranchId, Language, PmsGuestRecord } from "../types.js";
import { branchScopeChanged } from "./app-state-helpers.js";

type SettingsDraftState = {
  activeScreenKind: MenuScreenKind | null;
  catalogTemplates: readonly TemplateDefinition[];
  editBody: string;
  editBranchScope: Record<BranchId, boolean>;
  editTitle: string;
  newBody: string;
  newBranchScope: Record<BranchId, boolean>;
  newTitle: string;
  selectedLanguage: Language;
  settingsTemplateId: string;
};

export function resolveMenuTemplates(
  activeMenu: MenuId | null,
  catalogTemplates: readonly UnifiedTemplateDefinition[],
): UnifiedTemplateDefinition[] {
  return activeMenu ? filterTemplatesForMenu(activeMenu, catalogTemplates) : [];
}

export function resolveScopedTemplates(
  templates: readonly UnifiedTemplateDefinition[],
  selectedBranchId: BranchId | "",
): UnifiedTemplateDefinition[] {
  if (!selectedBranchId) return [...templates];
  return templates
    .filter((template) => template.branchScope.includes(selectedBranchId))
    .map((template) => scopeUnifiedTemplateForBranch(template, selectedBranchId));
}

export function resolveActiveTemplates(
  scopedTemplates: readonly UnifiedTemplateDefinition[],
): UnifiedTemplateDefinition[] {
  return [...scopedTemplates];
}

export function requiresSelectedRoomContext(
  templates: readonly TemplateDefinition[],
): boolean {
  return templates.some((template) => template.requiresContext === "guestRecord");
}

export function usesWingsContext(templates: readonly TemplateDefinition[]): boolean {
  return templates.some((template) => template.requiresContext !== "none");
}

export function selectPmsRecord(
  records: readonly PmsGuestRecord[],
  selectedPmsRecordId: string,
): PmsGuestRecord | null {
  return records.find((record) => record.id === selectedPmsRecordId) || null;
}

export function filterLaundryRecords(
  records: readonly LaundryRecord[],
  statusFilter: LaundryStatus | "ALL",
  searchTerm: string,
  statusLabel: (status: LaundryStatus) => string,
): LaundryRecord[] {
  const term = searchTerm.trim().toLowerCase();
  return records.filter((record) => {
    if (statusFilter !== "ALL" && record.status !== statusFilter) return false;
    if (!term) return true;
    return [
      record.guestName,
      record.roomNo,
      record.displayRoom,
      record.itemSummary,
      record.note,
      statusLabel(record.status),
    ]
      .join(" ")
      .toLowerCase()
      .includes(term);
  });
}

export function isSettingsDraftDirty(state: SettingsDraftState): boolean {
  if (state.activeScreenKind !== "settings") return false;
  const template = state.catalogTemplates.find((item) => item.id === state.settingsTemplateId);
  const currentTitle = template?.title || "";
  const currentBody = template?.languages[state.selectedLanguage] || template?.defaultValue || "";
  const currentBranchScope = template?.branchScope || [];
  return (
    state.editTitle !== currentTitle ||
    state.editBody !== currentBody ||
    branchScopeChanged(state.editBranchScope, currentBranchScope) ||
    Boolean(state.newTitle.trim()) ||
    Boolean(state.newBody.trim()) ||
    branchScopeChanged(state.newBranchScope, ALL_BRANCH_IDS)
  );
}

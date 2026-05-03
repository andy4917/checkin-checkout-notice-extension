import {
  addLaundryRecord,
  queryLaundryRecords,
  updateLaundryStatus,
} from "../application/laundry-records.js";
import type { LaundryStorageArea } from "../laundry/storage.js";
import type { LaundryRecord, LaundryStatus } from "../laundry/types.js";
import type { BranchId, PmsGuestRecord } from "../types.js";

export type LaundryWorkflowDependencies = {
  storageArea: LaundryStorageArea;
};

export async function loadLaundryRecordList(
  selectedBranchId: BranchId | "",
  dependencies: LaundryWorkflowDependencies,
): Promise<LaundryRecord[]> {
  return queryLaundryRecords({
    branchId: selectedBranchId || undefined,
  }, dependencies.storageArea);
}

export type LaundryDraftInput = {
  itemSummary: string;
  note: string;
  selectedBranchId: BranchId;
  selectedPmsRecord: PmsGuestRecord | null;
  templateDraftValue: (templateId: string, variableName: string) => string;
};

export async function createLaundryRecord({
  itemSummary,
  note,
  selectedBranchId,
  selectedPmsRecord,
  templateDraftValue,
}: LaundryDraftInput, dependencies: LaundryWorkflowDependencies): Promise<void> {
  await addLaundryRecord({
    branchId: selectedBranchId,
    guestName: selectedPmsRecord?.guestName || templateDraftValue("laundry-complete-message", "guestName"),
    roomNo: selectedPmsRecord?.roomNo || templateDraftValue("laundry-complete-message", "roomNo"),
    displayRoom:
      selectedPmsRecord?.displayRoom ||
      templateDraftValue("laundry-complete-message", "roomNo"),
    itemSummary,
    note,
    sourcePmsGuestId: selectedPmsRecord?.id,
  }, dependencies.storageArea);
}

export async function changeLaundryStatus(
  record: LaundryRecord,
  status: LaundryStatus,
  dependencies: LaundryWorkflowDependencies,
): Promise<void> {
  await updateLaundryStatus(record.id, status, dependencies.storageArea);
}

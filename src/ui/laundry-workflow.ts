import {
  addLaundryRecord,
  queryLaundryRecords,
  updateLaundryStatus,
} from "../application/laundry-records.js";
import type { LaundryStorageArea } from "../laundry/storage.js";
import type { LaundryMachineType, LaundryRecord, LaundryStatus } from "../laundry/types.js";
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
}: LaundryDraftInput, dependencies: LaundryWorkflowDependencies): Promise<LaundryRecord> {
  return addLaundryRecord({
    branchId: selectedBranchId,
    guestName: selectedPmsRecord?.guestName || templateDraftValue("laundry-complete-message", "guestName"),
    roomNo: selectedPmsRecord?.roomNo || itemSummary.trim() || templateDraftValue("laundry-complete-message", "roomNo"),
    displayRoom:
      selectedPmsRecord?.displayRoom ||
      itemSummary.trim() ||
      templateDraftValue("laundry-complete-message", "roomNo"),
    itemSummary: "객실 세탁물",
    note,
    sourcePmsGuestId: selectedPmsRecord?.id,
  }, dependencies.storageArea);
}

export async function changeLaundryStatus(
  record: LaundryRecord,
  status: LaundryStatus,
  dependencies: LaundryWorkflowDependencies,
  machineType?: LaundryMachineType,
): Promise<void> {
  await updateLaundryStatus(record.id, status, dependencies.storageArea, machineType);
}

import { syncGuests } from "../application/sync-guests.js";
import type { BranchId, PmsFetch, PmsGuestRecord, TabMode } from "../types.js";

export type PmsWorkflowDependencies = {
  fetchImpl: PmsFetch;
};

export type PmsSyncInput = {
  branchId: BranchId;
  date: string;
  mode: TabMode;
  searchTerm: string;
};

export async function loadPmsGuestRecords({
  branchId,
  date,
  mode,
  searchTerm,
}: PmsSyncInput, dependencies: PmsWorkflowDependencies): Promise<PmsGuestRecord[]> {
  const result = await syncGuests({
    date,
    mode,
    branchId,
    searchTerm,
    fetchImpl: dependencies.fetchImpl,
  });
  return result.records;
}

export function describeSelectedPmsRecord(record: PmsGuestRecord): string {
  const label = `${record.displayRoom || record.roomNo} ${record.guestName || ""}`.trim();
  return label ? `${label} 선택` : "객실을 선택했습니다.";
}

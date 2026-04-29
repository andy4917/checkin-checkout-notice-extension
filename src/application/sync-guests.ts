import { requireBranch } from "../config/branches.js";
import { filterPmsGuestRecords, sortPmsGuestRecords } from "../domain/guests.js";
import { fetchPmsGuests } from "../pms/client.js";
import { normalizePmsGuestRows } from "../pms/normalizer.js";
import type { BranchId, PmsFetch, PmsGuestRecord, TabMode } from "../types.js";

export type SyncGuestsInput = {
  date: string;
  mode: TabMode;
  branchId: BranchId | "" | null;
  searchTerm?: string;
  fetchImpl?: PmsFetch;
};

export type SyncGuestsResult = {
  branchId: BranchId;
  mode: TabMode;
  queryDate: string;
  records: PmsGuestRecord[];
  visibleRecords: PmsGuestRecord[];
};

export async function syncGuests(input: SyncGuestsInput): Promise<SyncGuestsResult> {
  const branch = requireBranch(input.branchId);
  const rows = await fetchPmsGuests(input.date, input.mode, branch.id, input.fetchImpl);
  const records = sortPmsGuestRecords(
    normalizePmsGuestRows(rows, {
      branchId: branch.id,
      mode: input.mode,
      queryDate: input.date,
    }),
  );

  return {
    branchId: branch.id,
    mode: input.mode,
    queryDate: input.date,
    records,
    visibleRecords: filterPmsGuestRecords(records, input.searchTerm || ""),
  };
}

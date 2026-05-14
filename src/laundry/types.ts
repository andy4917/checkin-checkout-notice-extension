import type { BranchId } from "../types.js";

export type LaundryMachineType = "WASHER" | "DRYER";

export type LaundryStatus =
  | "RECEIVED"
  | "IN_PROGRESS"
  | "READY"
  | "PICKED_UP"
  | "CANCELLED";

export type LaundryRecord = {
  id: string;
  branchId: BranchId;
  guestName: string;
  roomNo: string;
  displayRoom: string;
  status: LaundryStatus;
  itemSummary: string;
  note: string;
  machineType?: LaundryMachineType;
  receivedAt: string;
  updatedAt: string;
  completedAt?: string;
  pickedUpAt?: string;
  sourcePmsGuestId?: string;
};

export type LaundryRecordDraft = {
  branchId: BranchId;
  guestName: string;
  roomNo: string;
  displayRoom: string;
  itemSummary: string;
  note?: string;
  machineType?: LaundryMachineType;
  sourcePmsGuestId?: string;
};

export type LaundryRecordQuery = {
  branchId?: BranchId;
  status?: LaundryStatus;
  searchTerm?: string;
};

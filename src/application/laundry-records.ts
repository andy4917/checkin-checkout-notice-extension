import type { PmsGuestRecord } from "../types.js";
import {
  type LaundryStorageArea,
  readLaundryRecords,
  writeLaundryRecords,
} from "../laundry/storage.js";
import type {
  LaundryRecord,
  LaundryRecordDraft,
  LaundryRecordQuery,
  LaundryStatus,
} from "../laundry/types.js";

export function createLaundryRecord(
  draft: LaundryRecordDraft,
  now = new Date(),
): LaundryRecord {
  const timestamp = now.toISOString();
  const itemSummary = draft.itemSummary.trim();
  if (!itemSummary) {
    throw new Error("세탁물 내용을 입력해주세요.");
  }

  return {
    id: `laundry-${timestamp.replace(/[^0-9]/g, "")}-${Math.random().toString(36).slice(2, 8)}`,
    branchId: draft.branchId,
    guestName: draft.guestName.trim(),
    roomNo: draft.roomNo.trim(),
    displayRoom: draft.displayRoom.trim(),
    status: "RECEIVED",
    itemSummary,
    note: draft.note?.trim() || "",
    receivedAt: timestamp,
    updatedAt: timestamp,
    sourcePmsGuestId: draft.sourcePmsGuestId,
  };
}

export function createLaundryRecordFromGuest(
  guest: PmsGuestRecord,
  input: { itemSummary: string; note?: string },
  now = new Date(),
): LaundryRecord {
  return createLaundryRecord(
    {
      branchId: guest.templateValues.branchId as LaundryRecordDraft["branchId"],
      guestName: guest.guestName,
      roomNo: guest.roomNo,
      displayRoom: guest.displayRoom,
      itemSummary: input.itemSummary,
      note: input.note,
      sourcePmsGuestId: guest.id,
    },
    now,
  );
}

export async function addLaundryRecord(
  draft: LaundryRecordDraft,
  storageArea?: LaundryStorageArea,
  now = new Date(),
): Promise<LaundryRecord> {
  const record = createLaundryRecord(draft, now);
  const records = await readLaundryRecords(storageArea);
  await writeLaundryRecords([record, ...records], storageArea);
  return record;
}

export async function updateLaundryStatus(
  recordId: string,
  status: LaundryStatus,
  storageArea?: LaundryStorageArea,
  now = new Date(),
): Promise<LaundryRecord> {
  const records = await readLaundryRecords(storageArea);
  const timestamp = now.toISOString();
  let updatedRecord: LaundryRecord | null = null;

  const nextRecords = records.map((record) => {
    if (record.id !== recordId) return record;
    updatedRecord = {
      ...record,
      status,
      updatedAt: timestamp,
      completedAt: status === "READY" ? timestamp : record.completedAt,
      pickedUpAt: status === "PICKED_UP" ? timestamp : record.pickedUpAt,
    };
    return updatedRecord;
  });

  if (!updatedRecord) {
    throw new Error(`세탁 기록을 찾을 수 없습니다: ${recordId}`);
  }

  await writeLaundryRecords(nextRecords, storageArea);
  return updatedRecord;
}

export async function queryLaundryRecords(
  query: LaundryRecordQuery = {},
  storageArea?: LaundryStorageArea,
): Promise<LaundryRecord[]> {
  const records = await readLaundryRecords(storageArea);
  return filterLaundryRecords(records, query);
}

export function filterLaundryRecords(
  records: LaundryRecord[],
  query: LaundryRecordQuery = {},
): LaundryRecord[] {
  const term = (query.searchTerm || "").trim().toLowerCase();
  return records.filter((record) => {
    if (query.branchId && record.branchId !== query.branchId) return false;
    if (query.status && record.status !== query.status) return false;
    if (!term) return true;
    const haystack = [
      record.guestName,
      record.roomNo,
      record.displayRoom,
      record.itemSummary,
      record.note,
      record.status,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(term);
  });
}

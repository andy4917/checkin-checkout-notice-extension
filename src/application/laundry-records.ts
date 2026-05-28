import type { PmsGuestRecord } from "../types.js";
import {
  type LaundryStorageArea,
  readLaundryRecords,
  writeLaundryRecords,
} from "../laundry/storage.js";
import type {
  LaundryRecord,
  LaundryRecordDraft,
  LaundryMoveTarget,
  LaundryProgressEntry,
  LaundryRecordQuery,
  LaundryMachineType,
  LaundryStatus,
} from "../laundry/types.js";
import { INVALID_WORKFLOW_STEP_MESSAGE } from "./operator-error-messages.js";

export const LAUNDRY_INVALID_MOVE_MESSAGE = INVALID_WORKFLOW_STEP_MESSAGE;
const PROGRESS_LOG_TTL_MS = 24 * 60 * 60 * 1000;

export type LaundryColumnDefinition = Readonly<{
  target: LaundryMoveTarget;
  title: string;
  icon: string;
}>;

export type LaundryColumnView = LaundryColumnDefinition & Readonly<{
  records: LaundryRecord[];
}>;

export const LAUNDRY_COLUMN_DEFINITIONS = Object.freeze([
  { target: "RECEIVED", title: "대기", icon: "schedule" },
  { target: "WASHER", title: "세탁기", icon: "local_laundry_service" },
  { target: "DRYER", title: "건조기", icon: "mode_fan" },
  { target: "READY", title: "완료", icon: "task_alt" },
] satisfies readonly LaundryColumnDefinition[]);
export const LAUNDRY_SCHEDULED_TARGET: LaundryMoveTarget = "RECEIVED";
export const LAUNDRY_COMPLETED_TARGET: LaundryMoveTarget = "READY";
export const LAUNDRY_ACTIVE_TARGETS = Object.freeze(["WASHER", "DRYER"] satisfies readonly LaundryMoveTarget[]);
export const LAUNDRY_DROP_TARGETS = Object.freeze(["RECEIVED", "WASHER", "DRYER", "READY"] satisfies readonly LaundryMoveTarget[]);

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
    machineType: draft.machineType,
    receivedAt: timestamp,
    updatedAt: timestamp,
    sourcePmsGuestId: draft.sourcePmsGuestId,
    progressLog: [
      {
        id: createProgressEntryId(timestamp),
        at: timestamp,
        message: `${displayLabel(draft.displayRoom, draft.roomNo, itemSummary)} 예정`,
      },
    ],
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
  storageArea: LaundryStorageArea,
  now = new Date(),
): Promise<LaundryRecord> {
  const record = createLaundryRecord(draft, now);
  const records = await readLaundryRecords(storageArea);
  await writeLaundryRecords([record, ...records], storageArea);
  return record;
}

export async function moveLaundryRecord(
  recordId: string,
  target: LaundryMoveTarget,
  storageArea: LaundryStorageArea,
  now = new Date(),
): Promise<LaundryRecord> {
  const records = await readLaundryRecords(storageArea);
  const timestamp = now.toISOString();
  let updatedRecord: LaundryRecord | null = null;

  const nextRecords = records.map((record) => {
    if (record.id !== recordId) return record;
    if (!getAllowedLaundryMoveTargets(record).includes(target)) {
      throw new Error(LAUNDRY_INVALID_MOVE_MESSAGE);
    }

    updatedRecord = applyLaundryMove(record, target, timestamp);
    return updatedRecord;
  });

  if (!updatedRecord) {
    throw new Error(`세탁 기록을 찾을 수 없습니다: ${recordId}`);
  }

  await writeLaundryRecords(nextRecords, storageArea);
  return updatedRecord;
}

export async function removeLaundryRecord(
  recordId: string,
  storageArea: LaundryStorageArea,
): Promise<void> {
  const records = await readLaundryRecords(storageArea);
  const nextRecords = records.filter((record) => record.id !== recordId);
  if (nextRecords.length === records.length) {
    throw new Error(`세탁 기록을 찾을 수 없습니다: ${recordId}`);
  }
  await writeLaundryRecords(nextRecords, storageArea);
}

export async function hideLaundryProgressEntry(
  entryId: string,
  storageArea: LaundryStorageArea,
): Promise<void> {
  await updateLaundryProgressEntry(entryId, storageArea, (entry) => ({ ...entry, hidden: true }));
}

export async function removeLaundryProgressEntry(
  entryId: string,
  storageArea: LaundryStorageArea,
): Promise<void> {
  await updateLaundryProgressEntry(entryId, storageArea, () => null);
}

export function getAllowedLaundryMoveTargets(record: LaundryRecord): LaundryMoveTarget[] {
  if (record.status === "RECEIVED") return ["WASHER", "DRYER"];
  if (record.status === "IN_PROGRESS" && record.machineType === "WASHER") return ["WASHER", "DRYER"];
  if (record.status === "IN_PROGRESS" && record.machineType === "DRYER") return ["DRYER", "READY"];
  if (record.status === "READY") return [];
  return [];
}

export function getLaundryMoveTargetLabel(target: LaundryMoveTarget): string {
  return {
    RECEIVED: "대기",
    WASHER: "세탁기",
    DRYER: "건조기",
    READY: "완료",
  }[target];
}

export function matchesLaundryColumn(record: LaundryRecord, target: LaundryMoveTarget): boolean {
  if (target === "RECEIVED") return record.status === "RECEIVED";
  if (target === "WASHER") return record.status === "IN_PROGRESS" && record.machineType === "WASHER";
  if (target === "DRYER") return record.status === "IN_PROGRESS" && record.machineType === "DRYER";
  return record.status === "READY";
}

export function createLaundryColumnViews(records: readonly LaundryRecord[]): LaundryColumnView[] {
  return LAUNDRY_COLUMN_DEFINITIONS.map((column) => ({
    ...column,
    records: records.filter((record) => matchesLaundryColumn(record, column.target)),
  }));
}

export function visibleLaundryProgressLog(
  records: readonly LaundryRecord[],
  now = new Date(),
): LaundryProgressEntry[] {
  const cutoff = now.getTime() - PROGRESS_LOG_TTL_MS;
  return records
    .flatMap((record) => record.progressLog)
    .filter((entry) => !entry.hidden && Date.parse(entry.at) >= cutoff)
    .sort((left, right) => Date.parse(left.at) - Date.parse(right.at));
}

export async function updateLaundryStatus(
  recordId: string,
  status: LaundryStatus,
  storageArea: LaundryStorageArea,
  machineType?: LaundryMachineType,
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
      machineType: status === "IN_PROGRESS" ? machineType || record.machineType : undefined,
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

async function updateLaundryProgressEntry(
  entryId: string,
  storageArea: LaundryStorageArea,
  update: (entry: LaundryProgressEntry) => LaundryProgressEntry | null,
): Promise<void> {
  const records = await readLaundryRecords(storageArea);
  let matched = false;
  const nextRecords = records.map((record) => ({
    ...record,
    progressLog: record.progressLog.flatMap((entry) => {
      if (entry.id !== entryId) return [entry];
      matched = true;
      const nextEntry = update(entry);
      return nextEntry ? [nextEntry] : [];
    }),
  }));

  if (!matched) {
    throw new Error(`진행 기록을 찾을 수 없습니다: ${entryId}`);
  }

  await writeLaundryRecords(nextRecords, storageArea);
}

function applyLaundryMove(
  record: LaundryRecord,
  target: LaundryMoveTarget,
  timestamp: string,
): LaundryRecord {
  const nextStatus: LaundryStatus = target === "READY" ? "READY" : target === "RECEIVED" ? "RECEIVED" : "IN_PROGRESS";
  const nextMachineType: LaundryMachineType | undefined =
    target === "WASHER" ? "WASHER" : target === "DRYER" ? "DRYER" : undefined;

  return {
    ...record,
    status: nextStatus,
    machineType: nextMachineType,
    updatedAt: timestamp,
    completedAt: target === "READY" ? timestamp : record.completedAt,
    progressLog: [
      ...record.progressLog,
      {
        id: createProgressEntryId(timestamp),
        at: timestamp,
        message: progressMessage(record, target, timestamp),
      },
    ],
  };
}

function progressMessage(record: LaundryRecord, target: LaundryMoveTarget, timestamp: string): string {
  const label = displayLabel(record.displayRoom, record.roomNo, record.itemSummary);
  const time = formatProgressTime(timestamp);
  if (target === "WASHER") return `${label} ${time} 세탁중`;
  if (target === "DRYER" && record.machineType === "WASHER") return `${label} ${time} 세탁 완료. 건조중`;
  if (target === "DRYER") return `${label} ${time} 건조중`;
  if (target === "READY") return `${label} 완료`;
  return `${label} 예정`;
}

function formatProgressTime(timestamp: string): string {
  const date = new Date(timestamp);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function createProgressEntryId(timestamp: string): string {
  return `progress-${timestamp.replace(/[^0-9]/g, "")}-${Math.random().toString(36).slice(2, 8)}`;
}

function displayLabel(displayRoom: string, roomNo: string, itemSummary: string): string {
  return displayRoom.trim() || roomNo.trim() || itemSummary.trim();
}

export async function queryLaundryRecords(
  query: LaundryRecordQuery,
  storageArea: LaundryStorageArea,
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

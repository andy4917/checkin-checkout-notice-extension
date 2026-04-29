import { isBranchId } from "../config/branches.js";
import type { LaundryRecord, LaundryStatus } from "./types.js";

export const LAUNDRY_STORAGE_KEY = "laundryRecords:v1";

export type LaundryStorageArea = {
  get(keys: string[]): Promise<Record<string, unknown>>;
  set(values: Record<string, unknown>): Promise<void>;
};

export class LaundryStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LaundryStorageError";
  }
}

export async function readLaundryRecords(
  storageArea: LaundryStorageArea = chrome.storage.local,
): Promise<LaundryRecord[]> {
  const result = await storageArea.get([LAUNDRY_STORAGE_KEY]);
  return normalizeLaundryRecords(result[LAUNDRY_STORAGE_KEY]);
}

export async function writeLaundryRecords(
  records: LaundryRecord[],
  storageArea: LaundryStorageArea = chrome.storage.local,
): Promise<void> {
  await storageArea.set({ [LAUNDRY_STORAGE_KEY]: normalizeLaundryRecords(records) });
}

export function normalizeLaundryRecords(input: unknown): LaundryRecord[] {
  if (input === undefined || input === null) return [];
  if (!Array.isArray(input)) {
    throw new LaundryStorageError("laundry records must be an array.");
  }
  return input.map((record, index) => normalizeLaundryRecord(record, `records[${index}]`));
}

function normalizeLaundryRecord(input: unknown, fieldName: string): LaundryRecord {
  if (!isRecord(input)) {
    throw new LaundryStorageError(`${fieldName} must be an object.`);
  }

  const branchId = text(input.branchId, `${fieldName}.branchId`);
  if (!isBranchId(branchId)) {
    throw new LaundryStorageError(`${fieldName}.branchId is unknown: ${branchId}`);
  }

  const status = text(input.status, `${fieldName}.status`);
  if (!isLaundryStatus(status)) {
    throw new LaundryStorageError(`${fieldName}.status is unknown: ${status}`);
  }

  return {
    id: requiredText(input.id, `${fieldName}.id`),
    branchId,
    guestName: text(input.guestName, `${fieldName}.guestName`),
    roomNo: text(input.roomNo, `${fieldName}.roomNo`),
    displayRoom: text(input.displayRoom, `${fieldName}.displayRoom`),
    status,
    itemSummary: requiredText(input.itemSummary, `${fieldName}.itemSummary`),
    note: text(input.note, `${fieldName}.note`),
    receivedAt: requiredText(input.receivedAt, `${fieldName}.receivedAt`),
    updatedAt: requiredText(input.updatedAt, `${fieldName}.updatedAt`),
    completedAt: optionalText(input.completedAt),
    pickedUpAt: optionalText(input.pickedUpAt),
    sourcePmsGuestId: optionalText(input.sourcePmsGuestId),
  };
}

function isLaundryStatus(input: string): input is LaundryStatus {
  return (
    input === "RECEIVED" ||
    input === "IN_PROGRESS" ||
    input === "READY" ||
    input === "PICKED_UP" ||
    input === "CANCELLED"
  );
}

function requiredText(input: unknown, fieldName: string): string {
  const value = text(input, fieldName).trim();
  if (!value) {
    throw new LaundryStorageError(`${fieldName} is required.`);
  }
  return value;
}

function text(input: unknown, fieldName: string): string {
  if (input === undefined || input === null) return "";
  if (typeof input !== "string") {
    throw new LaundryStorageError(`${fieldName} must be text.`);
  }
  return input;
}

function optionalText(input: unknown): string | undefined {
  if (input === undefined || input === null || input === "") return undefined;
  if (typeof input !== "string") {
    throw new LaundryStorageError("optional text field must be text.");
  }
  return input;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

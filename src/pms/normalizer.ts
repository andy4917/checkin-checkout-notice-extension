import { getBranch } from "../config/branches.js";
import { getGuestStatus } from "../domain/guests.js";
import { convertRoomNo } from "../domain/rooms.js";
import type { BranchId, Guest, PmsGuestRecord, TemplateValueBag } from "../types.js";

export function normalizePmsGuestRow(
  row: Guest,
  context: { branchId: BranchId; mode: "ARRIVAL" | "DEPARTURE"; queryDate: string },
): PmsGuestRecord {
  const guestName = text(row.GUEST_NAME);
  const roomNo = text(row.ROOM_NO);
  const roomTypeName = text(row.ROOM_TYPE_NAME ?? row.ROOM_TYPE ?? row.ROOM_TYPE_CODE);
  const departureDate = text(row.DEPT_DATE);
  const statusCode = text(row.RSVN_STATUS_CODE);
  const displayRoom = convertRoomNo(roomNo);
  const status = getGuestStatus(statusCode);
  const branchLabel = getBranch(context.branchId)?.label || "";

  return {
    id: createGuestRecordId(row, context),
    raw: { ...row },
    guestName,
    roomNo,
    displayRoom,
    departureDate,
    statusCode,
    statusLabel: status.text,
    statusTagClass: status.tagClass,
    templateValues: createTemplateValueBag({
      branchId: context.branchId,
      branchLabel,
      guestName,
      roomNo,
      displayRoom,
      roomTypeName,
      departureDate,
      statusCode,
      statusLabel: status.text,
      queryDate: context.queryDate,
      mode: context.mode,
    }),
  };
}

export function normalizePmsGuestRows(
  rows: Guest[],
  context: { branchId: BranchId; mode: "ARRIVAL" | "DEPARTURE"; queryDate: string },
): PmsGuestRecord[] {
  return rows.map((row) => normalizePmsGuestRow(row, context));
}

function createTemplateValueBag(input: {
  branchId: BranchId;
  branchLabel: string;
  guestName: string;
  roomNo: string;
  displayRoom: string;
  roomTypeName: string;
  departureDate: string;
  statusCode: string;
  statusLabel: string;
  queryDate: string;
  mode: "ARRIVAL" | "DEPARTURE";
}): TemplateValueBag {
  return {
    branchId: input.branchId,
    branchName: input.branchLabel,
    guestName: input.guestName,
    roomNo: input.roomNo,
    displayRoom: input.displayRoom,
    roomType: input.roomTypeName,
    roomTypeName: input.roomTypeName,
    departureDate: input.departureDate,
    statusCode: input.statusCode,
    statusLabel: input.statusLabel,
    queryDate: input.queryDate,
    pmsMode: input.mode,
  };
}

function createGuestRecordId(
  row: Guest,
  context: { branchId: BranchId; mode: "ARRIVAL" | "DEPARTURE"; queryDate: string },
): string {
  const rsvnNo = text(row.RSVN_NO ?? row.RSVN_FOLIO_NO ?? row.GLOBAL_RSVN_NO);
  const guestName = text(row.GUEST_NAME);
  const roomNo = text(row.ROOM_NO);
  const source = rsvnNo || `${guestName}-${roomNo}` || "guest";
  return `${context.branchId}-${context.mode.toLowerCase()}-${context.queryDate}-${source}`;
}

function text(value: unknown): string {
  return value == null ? "" : String(value);
}

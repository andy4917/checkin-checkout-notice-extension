import { normalizeWingsBranchFromOtaValue } from "../config/ota-wings-contract.js";
import type { BranchId } from "../types.js";
import type { OtaReservationDraft, OtaReservationLocator } from "./types.js";

type RecordValue = Record<string, unknown>;

export class OtaReservationNormalizeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OtaReservationNormalizeError";
  }
}

export function normalizeOtaReservation(
  locator: OtaReservationLocator,
  payload: unknown,
): OtaReservationDraft {
  const sourceReservationId =
    locator.source === "naver" ? locator.bookingId : locator.reservationId;
  const branchId =
    normalizeBranchId(
      pickFirstString(payload, ["branchId", "branch_id", "hotelBranchId", "propertyId", "businessId"]),
    ) ||
    (locator.source === "station" ? normalizeBranchId(locator.branchCode) : undefined);
  const checkInDate = normalizeDate(
    pickFirstString(payload, [
      "checkInDate",
      "checkinDate",
      "check_in_date",
      "arrivalDate",
      "arrvDate",
      "startDate",
      "useStartDate",
      "checkInDateTime",
      "예약시작일",
      "입실일",
    ]),
  );
  const checkOutDate = normalizeDate(
    pickFirstString(payload, [
      "checkOutDate",
      "checkoutDate",
      "check_out_date",
      "departureDate",
      "deptDate",
      "endDate",
      "useEndDate",
      "checkOutDateTime",
      "예약종료일",
      "퇴실일",
    ]),
  );
  const nights = pickFirstString(payload, ["nights", "nightCount", "박수"]) || countNights(checkInDate, checkOutDate);

  return {
    source: locator.source,
    sourceReservationId,
    branchId,
    guestName: pickFirstString(payload, [
      "guestName",
      "reserverName",
      "bookerName",
      "customerName",
      "name",
      "userName",
      "bookerName",
      "예약자명",
      "투숙객명",
    ]),
    phone: normalizePhone(
      pickFirstString(payload, [
        "phone",
        "mobile",
        "mobileNo",
        "tel",
        "phoneNumber",
        "guestMobile",
        "bookerMobile",
        "예약자연락처",
        "연락처",
      ]),
    ),
    email: pickFirstString(payload, ["email", "mail", "emailAddress", "guestEmail", "bookerEmail"]),
    nationality: pickFirstString(payload, ["nationality", "natCode", "country", "국적"]),
    checkInDate,
    checkOutDate,
    nights,
    adultCount: pickFirstString(payload, ["adultCount", "adults", "adult", "성인"]),
    childCount: pickFirstString(payload, ["childCount", "children", "child", "아동"]),
    roomTypeName: pickFirstString(payload, ["roomTypeName", "roomName", "roomType", "productName", "객실명"]),
    roomTypeCode: pickFirstString(payload, ["roomTypeCode", "room_code", "객실코드"]),
    roomCount: pickFirstString(payload, ["roomCount", "rooms", "quantity", "객실수"]),
    roomFee: normalizeAmount(pickFirstString(payload, ["roomFee", "roomPrice", "price", "unitPrice", "객실요금"])),
    totalAmount: normalizeAmount(
      pickFirstString(payload, [
        "totalAmount",
        "totalPrice",
        "totalPaymentPrice",
        "paymentAmount",
        "paidAmount",
        "결제금액",
        "총금액",
      ]),
    ),
    memo: pickFirstString(payload, ["memo", "requestMemo", "specialRequest", "request", "remarks", "staffMemo", "요청사항"]),
    raw: payload,
  };
}

export function requireOtaDraftMinimum(draft: OtaReservationDraft): void {
  const missing = [
    ["guestName", draft.guestName],
    ["checkInDate", draft.checkInDate],
    ["checkOutDate", draft.checkOutDate],
  ].filter(([, value]) => !value);

  if (missing.length > 0) {
    throw new OtaReservationNormalizeError(
      `예약 필수값을 찾지 못했습니다: ${missing.map(([name]) => name).join(", ")}`,
    );
  }
}

function pickFirstString(payload: unknown, keys: readonly string[]): string {
  for (const key of keys) {
    const value = findValueByKey(payload, key);
    if (value != null && value !== "") return String(value).trim();
  }
  return "";
}

function findValueByKey(payload: unknown, targetKey: string): unknown {
  if (!isRecord(payload)) return null;
  const normalizedTarget = normalizeKey(targetKey);
  const queue: unknown[] = [payload];
  const seen = new Set<unknown>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!isRecord(current) || seen.has(current)) continue;
    seen.add(current);

    for (const [key, value] of Object.entries(current)) {
      if (normalizeKey(key) === normalizedTarget && isScalar(value)) return value;
      if (isRecord(value) || Array.isArray(value)) queue.push(value);
    }
  }

  return null;
}

function normalizeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9가-힣]/g, "").toLowerCase();
}

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isScalar(value: unknown): value is string | number | boolean {
  return ["string", "number", "boolean"].includes(typeof value);
}

function normalizeBranchId(value: string): BranchId | undefined {
  return normalizeWingsBranchFromOtaValue(value);
}

function normalizeDate(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length >= 8) return digits.slice(0, 8);
  return "";
}

function normalizePhone(value: string): string {
  return value.replace(/[^\d+]/g, "");
}

function normalizeAmount(value: string): string {
  return value.replace(/[^\d.-]/g, "");
}

function countNights(checkInDate: string, checkOutDate: string): string {
  if (!checkInDate || !checkOutDate) return "";
  const start = parseDate(checkInDate);
  const end = parseDate(checkOutDate);
  if (!start || !end) return "";
  const nights = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  return nights > 0 ? String(nights) : "";
}

function parseDate(value: string): Date | null {
  if (!/^\d{8}$/.test(value)) return null;
  return new Date(
    Number(value.slice(0, 4)),
    Number(value.slice(4, 6)) - 1,
    Number(value.slice(6, 8)),
  );
}

import { BRANCHES, isBranchId, requireBranch } from "./branches.js";
import type { BranchId } from "../types.js";
import type { OtaReservationDraft, OtaSource } from "../ota/types.js";

export const WINGS_RESERVATION_DEFAULTS = Object.freeze({
  operationMode: "NEW",
  adultCount: "4",
  childCount: "0",
  roomCount: "1",
  marketName: "Domestic Online",
  marketCode: "DOO",
  sourceName: "Telephone",
  sourceCode: "PHN",
  rateName: "Rack Rate",
  rateCode: "RAC",
  lodgRoomCount: "0",
  reservationStatusCode: "RR",
  reservationMethodCode: "TP",
  noRatePrintYn: "N",
  emailSendYn: "N",
  smsSendYn: "N",
  individualPayYn: "N",
  natName: "South Korea",
  natCode: "KOR",
  langCode: "KOR",
});

const NAVER_CUSTOMER_NUMBERS: Readonly<Record<BranchId, string>> = Object.freeze({
  coex: "00064633",
  gangnam: "00048147",
  seolleung: "",
});

const NAVER_BUSINESS_BRANCH_IDS: Readonly<Record<string, BranchId>> = Object.freeze({
  "1356779": "coex",
  "1217752": "gangnam",
  "1655089": "seolleung",
});

const STATION_BRANCH_IDS: Readonly<Record<string, BranchId>> = Object.freeze({
  "16": "gangnam",
  "18": "coex",
  "37": "seolleung",
});

export function normalizeWingsBranchFromOtaValue(value: string): BranchId | undefined {
  if (isBranchId(value)) return value;
  if (NAVER_BUSINESS_BRANCH_IDS[value]) return NAVER_BUSINESS_BRANCH_IDS[value];
  if (STATION_BRANCH_IDS[value]) return STATION_BRANCH_IDS[value];
  const branch = Object.values(BRANCHES).find(
    (candidate) =>
      candidate.pms.bsnsCode === value ||
      candidate.pms.propertyNo === value ||
      candidate.pms.ppBsnsCode === value,
  );
  return branch?.id;
}

export function resolveSelectedWingsBranch(
  selectedBranchId: BranchId | "" | null,
  draftBranchId?: BranchId,
) {
  const selectedBranch = requireBranch(selectedBranchId);
  if (draftBranchId && draftBranchId !== selectedBranch.id) {
    throw new Error("올바른 지점이 아닙니다.");
  }
  return selectedBranch;
}

export function getOtaCompany(source: OtaSource, branchId: BranchId) {
  const branch = requireBranch(branchId);
  if (source === "naver") {
    const customerNo = NAVER_CUSTOMER_NUMBERS[branchId];
    return {
      name: `네이버[${branch.pms.bsnsCode}]`,
      customerNo,
    };
  }

  return {
    name: `스테이션[${branch.pms.bsnsCode}]`,
    customerNo: "",
  };
}

export function getRoomFee(draft: OtaReservationDraft): string {
  const totalAmount = parseAmount(draft.totalAmount);
  const nights = Number.parseInt(draft.nights, 10);
  if (totalAmount !== null && Number.isFinite(nights) && nights > 0) {
    return String(Math.round(totalAmount / nights));
  }
  return draft.roomFee;
}

function parseAmount(value: string): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

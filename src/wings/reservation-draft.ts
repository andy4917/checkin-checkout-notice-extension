import {
  WINGS_RESERVATION_DEFAULTS,
  getOtaCompany,
  getRoomFee,
  resolveSelectedWingsBranch,
} from "../config/ota-wings-contract.js";
import type { BranchId } from "../types.js";
import type { OtaReservationDraft, WingsReservationFieldMap } from "../ota/types.js";

export function buildWingsReservationFieldMap(
  draft: OtaReservationDraft,
  selectedBranchId: BranchId | "" | null,
): WingsReservationFieldMap {
  const branch = resolveSelectedWingsBranch(selectedBranchId, draft.branchId);
  const company = getOtaCompany(draft.source, branch.id);
  const roomFee = getRoomFee(draft);

  return removeBlankValues({
    OPERATION_MODE: WINGS_RESERVATION_DEFAULTS.operationMode,
    PROPERTY_NO: branch.pms.propertyNo,
    BSNS_CODE: branch.pms.bsnsCode,
    PP_BSNS_CODE: branch.pms.ppBsnsCode,
    ARRV_DATE: formatWingsDate(draft.checkInDate),
    DEPT_DATE: formatWingsDate(draft.checkOutDate),
    NIGHTS: draft.nights,
    ADULT_CNT: draft.adultCount || WINGS_RESERVATION_DEFAULTS.adultCount,
    CHILD_CNT: draft.childCount || WINGS_RESERVATION_DEFAULTS.childCount,
    CORP_CUSTM_NAME: company.name,
    CORP_CUSTM_NO: company.customerNo,
    MARKET_NAME: WINGS_RESERVATION_DEFAULTS.marketName,
    MARKET_CODE: WINGS_RESERVATION_DEFAULTS.marketCode,
    SOURCE_NAME: WINGS_RESERVATION_DEFAULTS.sourceName,
    SOURCE_CODE: WINGS_RESERVATION_DEFAULTS.sourceCode,
    RATE_NAME: WINGS_RESERVATION_DEFAULTS.rateName,
    RATE_CODE: WINGS_RESERVATION_DEFAULTS.rateCode,
    ROOM_TYPE_NAME: draft.roomTypeName,
    ROOM_TYPE_CODE: draft.roomTypeCode,
    RSVN_ROOM_CNT: draft.roomCount || WINGS_RESERVATION_DEFAULTS.roomCount,
    LODG_ROOM_CNT: WINGS_RESERVATION_DEFAULTS.lodgRoomCount,
    RSVN_STATUS_CODE: WINGS_RESERVATION_DEFAULTS.reservationStatusCode,
    RSVN_STATUS_CODE_2: WINGS_RESERVATION_DEFAULTS.reservationStatusCode,
    RSVN_METHOD_CODE: WINGS_RESERVATION_DEFAULTS.reservationMethodCode,
    RSVN_GEST_NAME: draft.guestName,
    INHS_GEST_NAME: draft.guestName,
    RSVN_GEST_TEL_NO: draft.phone,
    MOBILE_NO: draft.phone,
    EMAIL: draft.email,
    GLOBAL_RSVN_NO: draft.sourceReservationId,
    ROOM_FEE: roomFee,
    STD_ROOM_FEE: roomFee,
    TOTAL_AMT: draft.totalAmount,
    COMT: buildReservationMemo(draft),
    NO_RATE_PRINT_YN: WINGS_RESERVATION_DEFAULTS.noRatePrintYn,
    EMAIL_SEND_YN: WINGS_RESERVATION_DEFAULTS.emailSendYn,
    SMS_SEND_YN: WINGS_RESERVATION_DEFAULTS.smsSendYn,
    INDIVIDUAL_PAY_YN: WINGS_RESERVATION_DEFAULTS.individualPayYn,
    NAT_NAME: WINGS_RESERVATION_DEFAULTS.natName,
    NAT_CODE: WINGS_RESERVATION_DEFAULTS.natCode,
    LANG_CODE: WINGS_RESERVATION_DEFAULTS.langCode,
  });
}

export function buildReservationMemo(draft: OtaReservationDraft): string {
  const adultCount = draft.adultCount || WINGS_RESERVATION_DEFAULTS.adultCount;
  const nationality = draft.nationality || WINGS_RESERVATION_DEFAULTS.natCode;
  return `(유아X) / [성인 ${adultCount}명] / [${nationality}, ${draft.nights}박] / [${draft.phone}] / 메신저 :`;
}

function formatWingsDate(value: string): string {
  if (/^\d{8}$/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  }
  return value;
}

function removeBlankValues(values: WingsReservationFieldMap): WingsReservationFieldMap {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== ""),
  );
}

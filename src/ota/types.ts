import type { BranchId } from "../types.js";

export type OtaSource = "naver" | "station";

export type OtaReservationLocator =
  | {
      source: "naver";
      pageUrl: string;
      businessId: string;
      bookingId: string;
      apiUrl: string;
    }
  | {
      source: "station";
      pageUrl: string;
      branchCode: string;
      reservationId: string;
      apiUrl: string;
    };

export type OtaReservationDraft = {
  source: OtaSource;
  sourceReservationId: string;
  branchId?: BranchId;
  guestName: string;
  phone: string;
  email: string;
  nationality: string;
  checkInDate: string;
  checkOutDate: string;
  nights: string;
  adultCount: string;
  childCount: string;
  roomTypeName: string;
  roomTypeCode: string;
  roomCount: string;
  roomFee: string;
  totalAmount: string;
  memo: string;
  raw: unknown;
};

export type WingsReservationFieldMap = Record<string, string>;

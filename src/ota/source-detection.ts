import type { OtaReservationLocator } from "./types.js";

const NAVER_BOOKING_RE =
  /\/bizes\/(?<businessId>\d+)\/booking-list-view\/bookings\/(?<bookingId>\d+)/;
const NAVER_API_RE =
  /\/api\/businesses\/(?<businessId>\d+)\/bookings\/(?<bookingId>\d+)/;
const STATION_PAGE_RE = /\/(?:admin\/)?branch\/(?<branchCode>\d+)\/reservation\/(?<reservationId>\d+)/;
const STATION_API_RE = /\/admin\/branch\/(?<branchCode>\d+)\/reservation\/(?<reservationId>\d+)/;

export class OtaLocatorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OtaLocatorError";
  }
}

export function detectOtaReservationLocator(tabUrl: string): OtaReservationLocator {
  const url = new URL(tabUrl);

  if (url.hostname === "partner.booking.naver.com") {
    const match = NAVER_BOOKING_RE.exec(url.pathname) || NAVER_API_RE.exec(url.pathname);
    if (!match?.groups) {
      throw new OtaLocatorError("네이버 예약 상세 페이지에서 실행해주세요.");
    }
    const { businessId, bookingId } = match.groups;
    return {
      source: "naver",
      pageUrl: tabUrl,
      businessId,
      bookingId,
      apiUrl: `https://partner.booking.naver.com/api/businesses/${businessId}/bookings/${bookingId}`,
    };
  }

  if (
    url.hostname === "admin.admin-stationbyuhc.com" ||
    url.hostname === "api.admin-stationbyuhc.com"
  ) {
    const match = STATION_PAGE_RE.exec(url.pathname) || STATION_API_RE.exec(url.pathname);
    if (!match?.groups) {
      throw new OtaLocatorError("스테이션 예약 상세 페이지에서 실행해주세요.");
    }
    const { branchCode, reservationId } = match.groups;
    return {
      source: "station",
      pageUrl: tabUrl,
      branchCode,
      reservationId,
      apiUrl: `https://api.admin-stationbyuhc.com/admin/branch/${branchCode}/reservation/${reservationId}`,
    };
  }

  throw new OtaLocatorError("네이버 또는 스테이션 예약 상세 페이지에서 실행해주세요.");
}

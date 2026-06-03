export type AirportVanRideDirection = "PICKUP" | "SENDING";
export type AirportVanPaymentMethod = "CASH" | "CARD" | "ROOM_CHARGE";
export type AirportVanChoiceOption<T extends string> = Readonly<{
  value: T;
  label: string;
  icon?: string;
}>;
export type AirportVanRoutePointLabels = Readonly<{
  first: string;
  second: string;
}>;
export type AirportVanFieldPresentation = Readonly<{
  label: string;
}>;

export type AirportVanFormValues = {
  rideDirection?: AirportVanRideDirection;
  rideDate?: string;
  rideTime?: string;
  guestName?: string;
  guestContact?: string;
  roomNo?: string;
  airportName?: string;
  terminal?: string;
  flightNo?: string;
  flightTime?: string;
  passengerCount?: string;
  largeLuggageCount?: string;
  smallLuggageCount?: string;
  paymentMethod?: AirportVanPaymentMethod;
  requestNote?: string;
};
export type AirportVanTextFieldName = Exclude<keyof AirportVanFormValues, "rideDirection" | "paymentMethod">;

export type AirportVanCopyTarget = "workLog" | "guestMessage";

export const AIRPORT_VAN_PAYMENT_LABELS: Readonly<Record<AirportVanPaymentMethod, string>> =
  Object.freeze({
    CASH: "현금",
    CARD: "카드",
    ROOM_CHARGE: "룸차지",
  });

export const AIRPORT_VAN_DIRECTION_LABELS: Readonly<Record<AirportVanRideDirection, string>> =
  Object.freeze({
    PICKUP: "픽업",
    SENDING: "샌딩",
  });

export const AIRPORT_VAN_RIDE_DIRECTION_OPTIONS = Object.freeze([
  { value: "PICKUP", label: AIRPORT_VAN_DIRECTION_LABELS.PICKUP },
  { value: "SENDING", label: AIRPORT_VAN_DIRECTION_LABELS.SENDING },
] satisfies readonly AirportVanChoiceOption<AirportVanRideDirection>[]);

export const AIRPORT_VAN_PAYMENT_OPTIONS = Object.freeze([
  { value: "CASH", label: AIRPORT_VAN_PAYMENT_LABELS.CASH, icon: "payments" },
  { value: "CARD", label: AIRPORT_VAN_PAYMENT_LABELS.CARD, icon: "credit_card" },
  { value: "ROOM_CHARGE", label: AIRPORT_VAN_PAYMENT_LABELS.ROOM_CHARGE, icon: "payments" },
] satisfies readonly AirportVanChoiceOption<AirportVanPaymentMethod>[]);

export function getAirportVanRoutePointLabels(
  direction: AirportVanRideDirection | undefined,
): AirportVanRoutePointLabels {
  return direction === "SENDING"
    ? { first: "출발지", second: "도착지" }
    : { first: "도착지", second: "출발지" };
}

export const AIRPORT_VAN_FIELD_PRESENTATIONS = Object.freeze({
  rideDate: { label: "탑승일자" },
  rideTime: { label: "탑승시각" },
  guestName: { label: "고객명" },
  guestContact: { label: "연락처" },
  roomNo: { label: "객실번호" },
  airportName: { label: "공항" },
  terminal: { label: "터미널" },
  flightNo: { label: "항공편명" },
  flightTime: { label: "항공 시간" },
  passengerCount: { label: "인원" },
  largeLuggageCount: { label: "대형 수하물" },
  smallLuggageCount: { label: "소형 수하물" },
  requestNote: { label: "요청사항" },
} satisfies Record<AirportVanTextFieldName, AirportVanFieldPresentation>);

export const AIRPORT_VAN_FORM_FIELD_NAMES = Object.freeze([
  "rideDirection",
  "rideDate",
  "rideTime",
  "guestName",
  "guestContact",
  "roomNo",
  "airportName",
  "terminal",
  "flightNo",
  "flightTime",
  "passengerCount",
  "largeLuggageCount",
  "smallLuggageCount",
  "paymentMethod",
  "requestNote",
] satisfies readonly (keyof AirportVanFormValues)[]);

export const AIRPORT_VAN_REQUIRED_FIELD_NAMES = Object.freeze([
  "rideDirection",
  "rideDate",
  "rideTime",
  "guestName",
  "guestContact",
  "roomNo",
  "airportName",
  "terminal",
  "flightNo",
  "flightTime",
  "passengerCount",
  "largeLuggageCount",
  "smallLuggageCount",
  "paymentMethod",
] satisfies readonly (keyof AirportVanFormValues)[]);

export function normalizeAirportVanFormValues(input: unknown): AirportVanFormValues {
  if (typeof input !== "object" || input === null) return {};
  const source = input as Partial<Record<keyof AirportVanFormValues, unknown>>;
  const result: AirportVanFormValues = {};

  for (const fieldName of AIRPORT_VAN_FORM_FIELD_NAMES) {
    const value = source[fieldName];
    if (typeof value !== "string" || value.trim().length === 0) continue;
    if (fieldName === "rideDirection") {
      if (value === "PICKUP" || value === "SENDING") result.rideDirection = value;
      continue;
    }
    if (fieldName === "paymentMethod") {
      if (value === "CASH" || value === "CARD" || value === "ROOM_CHARGE") {
        result.paymentMethod = value;
      }
      continue;
    }
    result[fieldName] = value.trim() as never;
  }

  return result;
}

export function renderAirportVanCopy(
  target: AirportVanCopyTarget,
  values: AirportVanFormValues,
  receivedAt: Date,
): string {
  assertRequiredAirportVanFields(values);
  return target === "workLog" ? renderAirportVanWorkLog(values, receivedAt) : renderAirportVanGuestMessage(values);
}

function renderAirportVanWorkLog(values: AirportVanFormValues, receivedAt: Date): string {
  return [
    "* 공항밴 예약보고",
    `* 구분 : ${directionLabel(values.rideDirection)}`,
    `* 예약 받은 날짜 : ${dateLabel(receivedAt)}`,
    `* 탑승일자 : ${field(values.rideDate)}`,
    `* 탑승시각 : ${field(values.rideTime)}`,
    `* 객실번호 : ${field(values.roomNo)}`,
    `* 고객명 : ${field(values.guestName)}`,
    `* 연락처 : ${field(values.guestContact)}`,
    `* 항공편 : ${field(values.airportName)} ${field(values.terminal)} ${field(values.flightNo)}`,
    `* 항공 시간 : ${field(values.flightTime)}`,
    `* 인원/수하물 : ${field(values.passengerCount)}명 / 대형 ${field(values.largeLuggageCount)} / 소형 ${field(values.smallLuggageCount)}`,
    `* 결제수단 : ${paymentLabel(values.paymentMethod)}`,
    `* 요청사항 : ${field(values.requestNote)}`,
  ].join("\n");
}

function renderAirportVanGuestMessage(values: AirportVanFormValues): string {
  return [
    "안녕하세요, 고객님.",
    "",
    "공항밴 예약 요청 정보 확인 부탁드립니다.",
    "",
    `- 이용 구분: ${directionLabel(values.rideDirection)}`,
    `- 탑승 일시: ${field(values.rideDate)} ${field(values.rideTime)}`,
    `- 항공편: ${field(values.airportName)} ${field(values.terminal)} ${field(values.flightNo)}`,
    `- 항공 시간: ${field(values.flightTime)}`,
    `- 인원: ${field(values.passengerCount)}명`,
    `- 수하물: 대형 ${field(values.largeLuggageCount)} / 소형 ${field(values.smallLuggageCount)}`,
    `- 결제수단: ${paymentLabel(values.paymentMethod)}`,
    "",
    "정보 확인 후 예약 가능 여부와 최종 요금을 안내드리겠습니다.",
    "감사합니다.",
  ].join("\n");
}

function directionLabel(value: AirportVanRideDirection | undefined): string {
  return value ? AIRPORT_VAN_DIRECTION_LABELS[value] : "";
}

function paymentLabel(value: AirportVanPaymentMethod | undefined): string {
  return value ? AIRPORT_VAN_PAYMENT_LABELS[value] : "";
}

function field(value: string | undefined): string {
  return value?.trim() || "";
}

function dateLabel(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}. ${month}. ${day}`;
}

function assertRequiredAirportVanFields(values: AirportVanFormValues): void {
  const missing = AIRPORT_VAN_REQUIRED_FIELD_NAMES.filter((fieldName) => {
    const value = values[fieldName];
    return typeof value !== "string" || value.trim().length === 0;
  });
  if (missing.length > 0) {
    throw new Error("필수 입력값 누락: 공항밴 예약 정보를 확인해주세요.");
  }
}

export type BranchId = "coex" | "gangnam" | "seolleung";
export type Language = "KO" | "EN" | "JP" | "CN";
export type TabMode = "ARRIVAL" | "DEPARTURE";
export type DepartureMessageType = "BEFORE_30" | "AFTER_15" | "LATE_12";
export type MessageAction = "arrival" | "departure";

export type Guest = {
  GUEST_NAME?: string;
  ROOM_NO?: string;
  DEPT_DATE?: string;
  RSVN_STATUS_CODE?: string;
  [key: string]: unknown;
};

export type TemplateValueBag = Record<string, string>;

export type PmsGuestRecord = {
  id: string;
  raw: Guest;
  guestName: string;
  roomNo: string;
  displayRoom: string;
  departureDate: string;
  statusCode: string;
  statusLabel: string;
  statusTagClass: string;
  templateValues: TemplateValueBag;
};

export type GuestMessageInput =
  | {
      action: "arrival";
      lang: string;
      name: string;
      room: string;
      departureDate: string;
      branchId: BranchId;
    }
  | {
      action: "departure";
      lang: string;
      type: DepartureMessageType;
      name: string;
      room: string;
    };

export type PmsRowsResponse = {
  rows?: unknown;
};

export type PmsFetch = (
  input: string,
  init: {
    method: "POST";
    headers: { "Content-Type": "application/x-www-form-urlencoded" };
    body: URLSearchParams;
  },
) => Promise<{
  ok?: boolean;
  status?: number;
  statusText?: string;
  json(): Promise<PmsRowsResponse>;
}>;

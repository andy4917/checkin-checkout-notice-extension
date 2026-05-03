export type BranchId = "coex" | "gangnam" | "seolleung";
export type Language = "KO" | "EN" | "JP" | "CN";
export type TabMode = "ARRIVAL" | "DEPARTURE";

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

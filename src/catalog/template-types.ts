import type { BranchId, Language, TabMode } from "../types.js";
import type { AirportVanFormValues } from "../application/airport-van-form.js";

export type TemplateCategory =
  | "CUSTOMER_RECORDS"
  | "GUEST_NOTICE"
  | "QUICK_REPLY"
  | "WORK_TEMPLATE";

export type TemplateAudience = "guest" | "internal" | "pmsRemark";
export type TemplateContextRequirement = "none" | "pmsPage" | "guestRecord";
export type TemplateVariableKind =
  | "manualOptional"
  | "manualRequired"
  | "pmsRequired"
  | "computed";

export type TemplateVariable = {
  name: string;
  label: string;
  kind: TemplateVariableKind;
};

export type TemplateDefinition = {
  id: string;
  category: TemplateCategory;
  audience: TemplateAudience;
  title: string;
  branchScope: BranchId[];
  languages: Partial<Record<Language, string>>;
  variables: TemplateVariable[];
  attachments: string[];
  requiresContext: TemplateContextRequirement;
  editable: boolean;
  defaultValue: string;
};

export type TemplateMenuId =
  | "CUSTOMER_NOTICE"
  | "QUICK_REPLY"
  | "LAUNDRY_MANAGEMENT"
  | "SALES_MANAGEMENT"
  | "ROOM_REMARK_MEMO"
  | "WORK_REPORT";

export type TemplateTypeId =
  | "arrival_notice"
  | "prearrival_csm"
  | "prestay_notice"
  | "self_checkin"
  | "early_checkin"
  | "parking"
  | "cleaning_notice"
  | "room_upgrade"
  | "room_upgrade_closed"
  | "laundry_complete"
  | "card_key"
  | "rental_item"
  | "lost_item"
  | "room_visit"
  | "breakfast_inquiry"
  | "invoice_inquiry"
  | "cancellation_inquiry"
  | "laundry_service_inquiry"
  | "kakao_channel_connect"
  | "kakao_channel_closing"
  | "nearby_restaurant"
  | "airport_van"
  | "partner_service"
  | "day_night_report"
  | "branch_daily_report"
  | "room_sales"
  | "dodine_sales"
  | "reservation_report";

export type CatalogSourceMetadata = {
  menuId: TemplateMenuId;
  typeId: TemplateTypeId;
  icon: string;
  summary: string;
  sourceRefs: string[];
  duplicateGroupId: string | null;
};

export type UnifiedTemplateDefinition = TemplateDefinition & CatalogSourceMetadata;

export type TemplateOverride = {
  title?: string;
  branchScope?: BranchId[];
  languages?: Partial<Record<Language, string>>;
  variables?: TemplateVariable[];
  attachments?: string[];
  defaultValue?: string;
};

export type CustomTemplate = TemplateDefinition & {
  builtIn?: false;
};

export type StoredExtensionState = {
  schemaVersion: 1;
  lastBranchId?: BranchId;
  templateOverrides: Record<string, TemplateOverride>;
  customTemplates: CustomTemplate[];
  ui: {
    lastTab?: TabMode;
    compactMode?: boolean;
    templateVariableValues?: Record<string, string>;
    airportVanFormValues?: AirportVanFormValues;
  };
};

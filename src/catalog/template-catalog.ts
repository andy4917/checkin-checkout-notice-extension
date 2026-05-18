import {
  WORKFLOW_TEMPLATE_CATALOG,
  applyStoredTemplateState,
} from "./workflow-catalog.js";
import { filterAttachmentIdsForBranch } from "../assets/asset-catalog.js";
import { isBranchId } from "../config/branches.js";
import type { BranchId } from "../types.js";
import type {
  CatalogSourceMetadata,
  CustomTemplate,
  StoredExtensionState,
  TemplateDefinition,
  TemplateTypeId,
  UnifiedTemplateDefinition,
} from "./template-types.js";

export const TEMPLATE_DUPLICATE_GROUPS = Object.freeze({
  "csm-foreign-prearrival-exact": Object.freeze([
    "CSM.zip::CSM/2주전CSM.txt",
    "CSM.zip::CSM/외국고객리뷰요청.txt",
    "CSM.zip::CSM/외국인 재실CSM.txt",
    "CSM.zip::CSM/한 달 전CSM.txt",
  ]),
  "room-upgrade-ko-exact": Object.freeze([
    "@ 고객님께 보내는 모든 안내문들.zip::룸업글 안내문(한글).txt",
    "CSM.zip::CSM/룸업글 안내문(한글).txt",
  ]),
  "room-upgrade-en-exact": Object.freeze([
    "@ 고객님께 보내는 모든 안내문들.zip::룸업글 안내문(영어).txt",
    "CSM.zip::CSM/룸업글 안내문(영어).txt",
  ]),
  "full-cleaning-exact": Object.freeze([
    "@ 고객님께 보내는 모든 안내문들.zip::전체청소 안내문.txt",
    "CSM.zip::CSM/전체청소 안내문.txt",
  ]),
  "laundry-complete-strong-similar": Object.freeze([
    "@ 고객님께 보내는 모든 안내문들.zip::@ 세탁 완료 메시지.txt",
    "@ 고객님께 보내는 모든 안내문들.zip::세탁 완료 메시지.txt",
  ]),
  "csm-two-week-strong-similar": Object.freeze([
    "@ 고객님께 보내는 모든 안내문들.zip::@ 2주내 CSM.txt",
    "@ 고객님께 보내는 모든 안내문들.zip::@ 주간 CSM 안내문.txt",
  ]),
});

const TEMPLATE_METADATA: Record<string, Omit<CatalogSourceMetadata, "icon">> = {
  "guest-arrival-notice": {
    menuId: "CUSTOMER_NOTICE",
    typeId: "arrival_notice",
    summary: "입실 직후 객실과 지점 안내",
    sourceRefs: [
      "repo://workflow-catalog::guest-arrival-notice",
      "체크인시 보낼 것.zip::입실 직후 안내",
    ],
    duplicateGroupId: null,
  },
  "quick-room-upgrade": {
    menuId: "QUICK_REPLY",
    typeId: "room_upgrade",
    summary: "객실 업그레이드 가능 여부 안내",
    sourceRefs: [
      "@ 고객님께 보내는 모든 안내문들.zip::룸업글 안내문(한글).txt",
      "@ 고객님께 보내는 모든 안내문들.zip::룸업글 안내문(영어).txt",
    ],
    duplicateGroupId: "room-upgrade-ko-exact",
  },
  "quick-rental-item-inquiry": {
    menuId: "QUICK_REPLY",
    typeId: "rental_item",
    summary: "물품 대여 가능 여부 안내",
    sourceRefs: ["빠른 답변형_탬플릿.zip::01_물품_대여_문의.md"],
    duplicateGroupId: null,
  },
  "quick-lost-item-inquiry": {
    menuId: "QUICK_REPLY",
    typeId: "lost_item",
    summary: "분실물 보관 여부와 재확인 안내",
    sourceRefs: ["빠른 답변형_탬플릿.zip::02_분실물_문의.md"],
    duplicateGroupId: null,
  },
  "quick-room-visit-notice": {
    menuId: "QUICK_REPLY",
    typeId: "room_visit",
    summary: "직원 객실 방문 예정 시간 안내",
    sourceRefs: ["빠른 답변형_탬플릿.zip::03_객실_방문_예정.md"],
    duplicateGroupId: null,
  },
  "early-checkin-inquiry": {
    menuId: "CUSTOMER_NOTICE",
    typeId: "early_checkin",
    summary: "얼리 체크인 가능 여부와 짐 보관 안내",
    sourceRefs: ["고객 안내형_4개국어_템플릿본.zip::04_얼리_체크인_문의.md"],
    duplicateGroupId: null,
  },
  "parking-guide": {
    menuId: "CUSTOMER_NOTICE",
    typeId: "parking",
    summary: "주차 가능 여부와 인근 유료 주차장 책임 범위 안내",
    sourceRefs: ["고객 안내형_4개국어_템플릿본.zip::08_주차_안내.md"],
    duplicateGroupId: null,
  },
  "prestay-same-day-guide": {
    menuId: "CUSTOMER_NOTICE",
    typeId: "prestay_notice",
    summary: "투숙 사전 및 당일 주요 안내",
    sourceRefs: ["고객 안내형_4개국어_템플릿본.zip::11_사전_및_당일_안내.md"],
    duplicateGroupId: null,
  },
  "self-checkin-guide": {
    menuId: "CUSTOMER_NOTICE",
    typeId: "self_checkin",
    summary: "셀프 체크인 방법과 연락처 안내",
    sourceRefs: ["고객 안내형_4개국어_템플릿본.zip::14_셀프_체크인_안내.md"],
    duplicateGroupId: null,
  },
  "laundry-complete-message": {
    menuId: "LAUNDRY_MANAGEMENT",
    typeId: "laundry_complete",
    summary: "세탁 완료 후 프론트 수령 안내",
    sourceRefs: ["@ 고객님께 보내는 모든 안내문들.zip::@ 세탁 완료 메시지.txt"],
    duplicateGroupId: "laundry-complete-strong-similar",
  },
  "airport-van-request-guide": {
    menuId: "CUSTOMER_NOTICE",
    typeId: "airport_van",
    summary: "공항밴 예약 요청 및 요금 안내",
    sourceRefs: ["고객 안내형_4개국어_템플릿본.zip::16_공항밴_예약요청_및_요금안내.md"],
    duplicateGroupId: null,
  },
  "airport-van-dispatch-confirmed": {
    menuId: "CUSTOMER_NOTICE",
    typeId: "airport_van",
    summary: "공항밴 배차 완료 안내",
    sourceRefs: ["고객 안내형_4개국어_템플릿본.zip::17_공항밴_배차완료_안내.md"],
    duplicateGroupId: null,
  },
  "room-upgrade-offer": {
    menuId: "CUSTOMER_NOTICE",
    typeId: "room_upgrade",
    summary: "객실 업그레이드 조건과 회신 마감 안내",
    sourceRefs: ["고객 안내형_4개국어_템플릿본.zip::30_룸업그레이드_제안_안내.md"],
    duplicateGroupId: null,
  },
  "room-upgrade-closed-followup": {
    menuId: "CUSTOMER_NOTICE",
    typeId: "room_upgrade_closed",
    summary: "업그레이드 마감 후속 안내",
    sourceRefs: ["고객 안내형_4개국어_템플릿본.zip::31_룸업그레이드_마감_후속안내.md"],
    duplicateGroupId: null,
  },
  "remark-card-keys": {
    menuId: "ROOM_REMARK_MEMO",
    typeId: "card_key",
    summary: "제공 카드키 수량 리마크",
    sourceRefs: ["repo://workflow-catalog::remark-card-keys"],
    duplicateGroupId: null,
  },
  "remark-rentals": {
    menuId: "ROOM_REMARK_MEMO",
    typeId: "rental_item",
    summary: "대여물품 리마크",
    sourceRefs: ["repo://workflow-catalog::remark-rentals"],
    duplicateGroupId: null,
  },
  "remark-medical-bloom": {
    menuId: "ROOM_REMARK_MEMO",
    typeId: "partner_service",
    summary: "메디컬블룸 예약 리마크",
    sourceRefs: ["repo://workflow-catalog::remark-medical-bloom"],
    duplicateGroupId: null,
  },
  "remark-stone-house": {
    menuId: "ROOM_REMARK_MEMO",
    typeId: "partner_service",
    summary: "스톤하우스 예약 리마크",
    sourceRefs: ["repo://workflow-catalog::remark-stone-house"],
    duplicateGroupId: null,
  },
  "report-day-night": {
    menuId: "WORK_REPORT",
    typeId: "day_night_report",
    summary: "주간/야간 업무 보고",
    sourceRefs: ["repo://workflow-catalog::report-day-night"],
    duplicateGroupId: null,
  },
  "report-coex-daily": {
    menuId: "WORK_REPORT",
    typeId: "branch_daily_report",
    summary: "코엑스점 일일 업무 보고",
    sourceRefs: ["repo://workflow-catalog::report-coex-daily"],
    duplicateGroupId: null,
  },
  "report-sales": {
    menuId: "SALES_MANAGEMENT",
    typeId: "room_sales",
    summary: "객실 매지출 보고",
    sourceRefs: ["repo://workflow-catalog::report-sales"],
    duplicateGroupId: null,
  },
  "report-dodine-sales": {
    menuId: "SALES_MANAGEMENT",
    typeId: "dodine_sales",
    summary: "드오디네 매지출 보고",
    sourceRefs: ["repo://workflow-catalog::report-dodine-sales"],
    duplicateGroupId: null,
  },
  "report-airport-van": {
    menuId: "WORK_REPORT",
    typeId: "reservation_report",
    summary: "공항밴 예약 보고",
    sourceRefs: ["repo://workflow-catalog::report-airport-van"],
    duplicateGroupId: null,
  },
};

const TEMPLATE_TYPE_ICONS: Readonly<Record<TemplateTypeId, string>> = Object.freeze({
  arrival_notice: "info",
  prestay_notice: "event_note",
  prearrival_csm: "forum",
  self_checkin: "vpn_key",
  early_checkin: "schedule",
  parking: "local_parking",
  cleaning_notice: "recycling",
  room_upgrade: "hotel_class",
  room_upgrade_closed: "hotel_class",
  laundry_complete: "local_laundry_service",
  card_key: "key",
  rental_item: "inventory_2",
  lost_item: "manage_search",
  room_visit: "meeting_room",
  airport_van: "airport_shuttle",
  partner_service: "room_service",
  day_night_report: "assignment",
  branch_daily_report: "summarize",
  room_sales: "payments",
  dodine_sales: "payments",
  reservation_report: "event_note",
});

export const UNIFIED_TEMPLATE_CATALOG: readonly UnifiedTemplateDefinition[] = Object.freeze(
  WORKFLOW_TEMPLATE_CATALOG.map(toUnifiedTemplate),
);

export function getUnifiedTemplate(templateId: string): UnifiedTemplateDefinition | null {
  return UNIFIED_TEMPLATE_CATALOG.find((template) => template.id === templateId) || null;
}

export function getUnifiedTemplatesForBranch(branchId: string): UnifiedTemplateDefinition[] {
  if (!isBranchId(branchId)) return [];
  return UNIFIED_TEMPLATE_CATALOG.filter((template) => template.branchScope.includes(branchId)).map(
    (template) => scopeUnifiedTemplateForBranch(template, branchId),
  );
}

export function scopeUnifiedTemplateForBranch(
  template: UnifiedTemplateDefinition,
  branchId: BranchId,
): UnifiedTemplateDefinition {
  return {
    ...template,
    attachments: filterAttachmentIdsForBranch(template.attachments, branchId),
  };
}

export function applyStoredUnifiedTemplateState(
  state: StoredExtensionState,
  baseCatalog: readonly TemplateDefinition[] = WORKFLOW_TEMPLATE_CATALOG,
): UnifiedTemplateDefinition[] {
  return applyStoredTemplateState(state, baseCatalog).map(toUnifiedTemplate);
}

function toUnifiedTemplate(template: TemplateDefinition): UnifiedTemplateDefinition {
  const metadata = metadataForTemplate(template);
  return { ...template, ...metadata, icon: TEMPLATE_TYPE_ICONS[metadata.typeId] };
}

function metadataForTemplate(template: TemplateDefinition): Omit<CatalogSourceMetadata, "icon"> {
  const metadata = TEMPLATE_METADATA[template.id];
  if (metadata) return metadata;
  if (isCustomTemplate(template)) return metadataForCustomTemplate(template);

  throw new Error(`Template metadata is required: ${template.id}`);
}

function isCustomTemplate(template: TemplateDefinition): template is CustomTemplate {
  return "builtIn" in template && template.builtIn === false;
}

function metadataForCustomTemplate(template: CustomTemplate): Omit<CatalogSourceMetadata, "icon"> {
  if (template.category === "CUSTOMER_RECORDS") {
    return {
      menuId: "ROOM_REMARK_MEMO",
      typeId: "card_key",
      summary: template.title,
      sourceRefs: [`custom://${template.id}`],
      duplicateGroupId: null,
    };
  }
  if (template.category === "WORK_TEMPLATE") {
    return {
      menuId: "WORK_REPORT",
      typeId: "day_night_report",
      summary: template.title,
      sourceRefs: [`custom://${template.id}`],
      duplicateGroupId: null,
    };
  }

  return {
    menuId: template.category === "QUICK_REPLY" ? "QUICK_REPLY" : "CUSTOMER_NOTICE",
    typeId: template.category === "QUICK_REPLY" ? "room_upgrade" : "arrival_notice",
    summary: template.title,
    sourceRefs: [`custom://${template.id}`],
    duplicateGroupId: null,
  };
}

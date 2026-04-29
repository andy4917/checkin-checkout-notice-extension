import {
  WORKFLOW_TEMPLATE_CATALOG,
  applyStoredTemplateState,
} from "./workflow-catalog.js";
import { filterAttachmentIdsForBranch } from "../assets/asset-catalog.js";
import { isBranchId } from "../config/branches.js";
import type { BranchId } from "../types.js";
import type {
  CatalogSourceMetadata,
  StoredExtensionState,
  TemplateDefinition,
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

const TEMPLATE_METADATA: Record<string, CatalogSourceMetadata> = {
  "guest-arrival-notice": {
    menuId: "CUSTOMER_NOTICE",
    typeId: "arrival_notice",
    summary: "입실 직후 객실과 지점 안내",
    sourceRefs: [
      "src/messages/templates.ts::arrival",
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
  "laundry-complete-message": {
    menuId: "LAUNDRY_MANAGEMENT",
    typeId: "laundry_complete",
    summary: "세탁 완료 후 프론트 수령 안내",
    sourceRefs: ["@ 고객님께 보내는 모든 안내문들.zip::@ 세탁 완료 메시지.txt"],
    duplicateGroupId: "laundry-complete-strong-similar",
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
  "remark-airport-van": {
    menuId: "ROOM_REMARK_MEMO",
    typeId: "airport_van",
    summary: "공항 밴 예약 리마크",
    sourceRefs: ["repo://workflow-catalog::remark-airport-van"],
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
    summary: "객실 매출 보고",
    sourceRefs: ["repo://workflow-catalog::report-sales"],
    duplicateGroupId: null,
  },
  "report-dodine-sales": {
    menuId: "SALES_MANAGEMENT",
    typeId: "dodine_sales",
    summary: "드오디네 매출 보고",
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
  const metadata = TEMPLATE_METADATA[template.id] || inferMetadata(template);
  return { ...template, ...metadata };
}

function inferMetadata(template: TemplateDefinition): CatalogSourceMetadata {
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

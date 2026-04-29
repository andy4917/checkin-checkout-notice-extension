import type { BranchId, Language } from "../types.js";
import { filterAttachmentIdsForBranch } from "../assets/asset-catalog.js";
import {
  TEMPLATE_DUPLICATE_GROUPS,
  UNIFIED_TEMPLATE_CATALOG,
} from "../catalog/template-catalog.js";

type TemplateCategory = "CHECKIN" | "CSM" | "QUICK_RESPONSE" | "LAUNDRY" | "REPORT" | "REMARK";

type TemplateCatalogEntry = {
  id: string;
  category: TemplateCategory;
  title: string;
  branchScope: BranchId[];
  language: Language[];
  variables: string[];
  attachments: string[];
  editable: boolean;
  sourcePath: string;
  duplicateGroupId: string | null;
};

const RUNTIME_TEMPLATE_CATALOG: readonly TemplateCatalogEntry[] = Object.freeze(
  UNIFIED_TEMPLATE_CATALOG.map((template) =>
    Object.freeze({
      id: template.id,
      category: toLegacyCategory(template.menuId, template.typeId),
      title: template.title,
      branchScope: [...template.branchScope],
      language: Object.keys(template.languages) as Language[],
      variables: template.variables.map((variable) => variable.name),
      attachments: [...template.attachments],
      editable: template.editable,
      sourcePath: template.sourceRefs[0] || `repo://catalog/${template.id}`,
      duplicateGroupId: template.duplicateGroupId,
    }),
  ),
);

const SOURCE_ONLY_TEMPLATES: TemplateCatalogEntry[] = [
    {
    id: "csm-prearrival-foreign",
    category: "CSM",
    title: "외국인 사전 CSM",
    branchScope: ["coex", "gangnam", "seolleung"],
    language: ["EN"],
    variables: ["guestName", "branchName", "checkInDate"],
    attachments: [],
    editable: true,
    sourcePath: "CSM.zip::CSM/2주전CSM.txt",
    duplicateGroupId: "csm-foreign-prearrival-exact",
    },
    {
    id: "room-upgrade-en-source",
    category: "QUICK_RESPONSE",
    title: "룸 업그레이드 제안",
    branchScope: ["coex", "gangnam", "seolleung"],
    language: ["EN"],
    variables: ["guestName", "branchName"],
    attachments: [],
    editable: true,
    sourcePath: "@ 고객님께 보내는 모든 안내문들.zip::룸업글 안내문(영어).txt",
    duplicateGroupId: "room-upgrade-en-exact",
    },
    {
    id: "full-cleaning-notice-source",
    category: "QUICK_RESPONSE",
    title: "전체청소 안내",
    branchScope: ["coex", "gangnam", "seolleung"],
    language: ["EN"],
    variables: ["guestName", "roomNo"],
    attachments: [],
    editable: true,
    sourcePath: "@ 고객님께 보내는 모든 안내문들.zip::전체청소 안내문.txt",
    duplicateGroupId: "full-cleaning-exact",
    },
    {
    id: "csm-two-week-source",
    category: "CSM",
    title: "2주 내 CSM",
    branchScope: ["coex", "gangnam", "seolleung"],
    language: ["KO", "EN"],
    variables: ["guestName", "branchName", "checkInDate"],
    attachments: [],
    editable: true,
    sourcePath: "@ 고객님께 보내는 모든 안내문들.zip::@ 2주내 CSM.txt",
    duplicateGroupId: "csm-two-week-strong-similar",
    },
];

const SOURCE_ONLY_TEMPLATE_CATALOG: readonly TemplateCatalogEntry[] = Object.freeze(
  SOURCE_ONLY_TEMPLATES.map((template) => Object.freeze(template)),
);

export const TEMPLATE_CATALOG: readonly TemplateCatalogEntry[] = Object.freeze([
  ...RUNTIME_TEMPLATE_CATALOG,
  ...SOURCE_ONLY_TEMPLATE_CATALOG,
]);

export { TEMPLATE_DUPLICATE_GROUPS };

export function getTemplatesForBranch(branchId: BranchId): TemplateCatalogEntry[] {
  return TEMPLATE_CATALOG.filter((template) => template.branchScope.includes(branchId)).map(
    (template) => ({
      ...template,
      attachments: filterAttachmentIdsForBranch(template.attachments, branchId),
    }),
  );
}

function toLegacyCategory(
  menuId: (typeof UNIFIED_TEMPLATE_CATALOG)[number]["menuId"],
  typeId: (typeof UNIFIED_TEMPLATE_CATALOG)[number]["typeId"],
): TemplateCategory {
  if (typeId === "laundry_complete") return "LAUNDRY";
  if (typeId === "arrival_notice") return "CHECKIN";
  if (typeId === "prearrival_csm") return "CSM";
  if (menuId === "QUICK_REPLY") return "QUICK_RESPONSE";
  if (menuId === "WORK_REPORT" || menuId === "SALES_MANAGEMENT") return "REPORT";
  return "REMARK";
}

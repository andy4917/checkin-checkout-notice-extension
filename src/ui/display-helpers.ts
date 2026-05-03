import { hasTemplateLanguage } from "../catalog/template-renderer.js";
import type { BranchId, Language } from "../types.js";
import type { LaundryStatus } from "../laundry/types.js";
import type { OtaReservationInputPreview } from "../application/ota-reservation-input.js";
import type { TemplateDefinition } from "../catalog/template-types.js";

export function formatToday(): string {
  const now = new Date();
  return `${now.getMonth() + 1}월 ${now.getDate()}일`;
}

export function summarizeTemplate(template: TemplateDefinition, selectedLanguage: Language): string {
  const raw = template.languages[selectedLanguage] || "";
  const compact = raw.replace(/\{[^}]+\}/g, "").replace(/\s+/g, " ").trim();
  if (!compact) return "선택한 언어의 번역본이 없습니다.";
  return compact.length > 44 ? `${compact.slice(0, 44)}...` : compact;
}

export function summarizeOtaPreview(preview: OtaReservationInputPreview): string {
  return [preview.fields.CORP_CUSTM_NAME, preview.fields.ROOM_FEE].filter(Boolean).join(" / ");
}

export function templateTypeLabel(template: TemplateDefinition): string {
  if (template.audience === "pmsRemark") return "객실 메모";
  if (template.audience === "internal") return "내부";
  return template.requiresContext === "none" ? "고객" : "고객 · WINGS";
}

export function formatBranchScopeLabel(
  template: TemplateDefinition,
  branchOptions: Array<{ id: BranchId; label: string }>,
): string {
  if (template.branchScope.length >= 3) return "전 지점";
  return template.branchScope
    .map((branchId) => branchOptions.find((branch) => branch.id === branchId)?.label || branchId)
    .join(", ");
}

export function visibleTemplateVariables(
  template: TemplateDefinition,
): TemplateDefinition["variables"] {
  return template.variables.filter((variable) => variable.kind !== "computed");
}

export function laundryStatusLabel(status: LaundryStatus): string {
  const labels: Record<LaundryStatus, string> = {
    RECEIVED: "접수",
    IN_PROGRESS: "처리중",
    READY: "수령 가능",
    PICKED_UP: "수령 완료",
    CANCELLED: "취소",
  };
  return labels[status];
}

export function nextLaundryStatus(status: LaundryStatus): LaundryStatus {
  if (status === "RECEIVED") return "IN_PROGRESS";
  if (status === "IN_PROGRESS") return "READY";
  if (status === "READY") return "PICKED_UP";
  return status;
}

export function hasAnyTemplateForLanguage(
  templates: readonly TemplateDefinition[],
  language: Language,
): boolean {
  return templates.some((template) => hasTemplateLanguage(template, language));
}

export function getFirstAvailableLanguage(
  templates: readonly TemplateDefinition[],
  languages: Array<{ id: Language; label: string }>,
): Language | null {
  for (const language of languages) {
    if (hasAnyTemplateForLanguage(templates, language.id)) return language.id;
  }
  return null;
}

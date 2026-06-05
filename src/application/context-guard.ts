import type { TemplateContextRequirement } from "../catalog/template-types.js";

export const PMS_CONTEXT_MESSAGE = "PMS 목록에서 고객정보를 선택해주세요.";

export type WorkContext = {
  isPmsPage: boolean;
  isGuestRecord: boolean;
};

export type ContextGuardResult =
  | { ok: true }
  | { ok: false; message: typeof PMS_CONTEXT_MESSAGE | "고객정보를 열어주십시오" };

export function guardRequiredContext(
  requiresContext: TemplateContextRequirement,
  context: WorkContext,
): ContextGuardResult {
  if (requiresContext === "none") return { ok: true };
  if (requiresContext === "pmsPage") {
    return context.isPmsPage
      ? { ok: true }
      : { ok: false, message: PMS_CONTEXT_MESSAGE };
  }
  return context.isGuestRecord
    ? { ok: true }
    : { ok: false, message: "고객정보를 열어주십시오" };
}

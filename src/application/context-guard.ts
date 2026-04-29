import type { TemplateContextRequirement } from "../catalog/template-types.js";

export type WorkContext = {
  isPmsPage: boolean;
  isGuestRecord: boolean;
};

export type ContextGuardResult =
  | { ok: true }
  | { ok: false; message: "로그인된 WINGS 페이지를 열어주십시오" | "고객정보를 열어주십시오" };

export function guardRequiredContext(
  requiresContext: TemplateContextRequirement,
  context: WorkContext,
): ContextGuardResult {
  if (requiresContext === "none") return { ok: true };
  if (requiresContext === "pmsPage") {
    return context.isPmsPage
      ? { ok: true }
      : { ok: false, message: "로그인된 WINGS 페이지를 열어주십시오" };
  }
  return context.isGuestRecord
    ? { ok: true }
    : { ok: false, message: "고객정보를 열어주십시오" };
}

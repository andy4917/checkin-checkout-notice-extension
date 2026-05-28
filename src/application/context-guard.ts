import type { TemplateContextRequirement } from "../catalog/template-types.js";
import { WINGS_BROWSER_TAB_MESSAGE } from "./operator-error-messages.js";

export type WorkContext = {
  isPmsPage: boolean;
  isGuestRecord: boolean;
};

export type ContextGuardResult =
  | { ok: true }
  | { ok: false; message: typeof WINGS_BROWSER_TAB_MESSAGE | "고객정보를 열어주십시오" };

export function guardRequiredContext(
  requiresContext: TemplateContextRequirement,
  context: WorkContext,
): ContextGuardResult {
  if (requiresContext === "none") return { ok: true };
  if (requiresContext === "pmsPage") {
    return context.isPmsPage
      ? { ok: true }
      : { ok: false, message: WINGS_BROWSER_TAB_MESSAGE };
  }
  return context.isGuestRecord
    ? { ok: true }
    : { ok: false, message: "고객정보를 열어주십시오" };
}

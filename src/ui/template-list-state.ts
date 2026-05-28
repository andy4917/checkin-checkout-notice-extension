import type { TemplateVariable, UnifiedTemplateDefinition } from "../catalog/template-types.js";

export function getTemplateRequirement(
  template: UnifiedTemplateDefinition,
  options: {
    hasSelectedPmsRecord: boolean;
    templateValues: Record<string, string>;
    templateVariableValues: Record<string, string>;
  },
): string {
  if (template.requiresContext === "guestRecord" && !options.hasSelectedPmsRecord) return "고객정보 필요";
  if (
    template.variables.some(
      (variable) =>
        variable.kind === "pmsRequired" &&
        !options.templateValues[variable.name]?.trim() &&
        !options.templateValues[variable.label]?.trim(),
    )
  ) {
    return "PMS 값 필요";
  }
  if (
    template.variables.some(
      (variable) =>
        variable.kind === "manualRequired" &&
        !options.templateVariableValues[variable.name]?.trim(),
    )
  ) {
    return "입력값 필요";
  }
  return "";
}

export function getManualVariables(template: UnifiedTemplateDefinition): TemplateVariable[] {
  return template.variables.filter(
    (variable) => variable.kind === "manualRequired" || variable.kind === "manualOptional",
  );
}

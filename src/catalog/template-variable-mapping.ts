import type { Language } from "../types.js";
import type { TemplateDefinition } from "./template-types.js";

const VARIABLE_NAMES: Readonly<Record<string, string>> = Object.freeze({
  지점명: "branchName",
  호텔명: "hotelName",
  고객명: "guestName",
  객실번호: "roomNo",
  "객실 타입": "roomType",
  객실타입: "roomType",
  "대여 물품명": "rentalItemName",
  대여물품명: "rentalItemName",
});

const VARIABLE_LABELS: Readonly<Record<string, string>> = Object.freeze({
  branchName: "지점명",
  hotelName: "호텔명",
  guestName: "고객명",
  roomNo: "객실번호",
  roomType: "객실 타입",
  roomTypeName: "객실 타입",
  rentalItemName: "대여 물품명",
});

export function templateVariableName(labelOrName: string): string {
  return VARIABLE_NAMES[labelOrName] || labelOrName;
}

export function templateVariableLabel(name: string): string {
  return VARIABLE_LABELS[name] || name;
}

export function extractTemplateVariables(body: string): TemplateDefinition["variables"] {
  const tokens = [
    ...Array.from(body.matchAll(/\{([a-zA-Z0-9_]+)\}/g), (match) => match[1]),
    ...Array.from(body.matchAll(/\[([^\]]+)\]/g), (match) => match[1].trim()),
  ];
  return Array.from(new Set(tokens.map(templateVariableName))).map((name) => ({
    name,
    label: templateVariableLabel(name),
    kind: "manualOptional" as const,
  }));
}

export function extractTemplateVariablesFromLanguages(
  languages: Partial<Record<Language, string>>,
): TemplateDefinition["variables"] {
  return mergeTemplateVariables(
    [],
    Object.values(languages).flatMap((body) => extractTemplateVariables(body || "")),
  );
}

export function mergeTemplateVariables(
  baseVariables: readonly TemplateDefinition["variables"][number][],
  nextVariables: readonly TemplateDefinition["variables"][number][],
): TemplateDefinition["variables"] {
  const merged = [...baseVariables];
  for (const variable of nextVariables) {
    if (!merged.some((item) => item.name === variable.name)) {
      merged.push(variable);
    }
  }
  return merged;
}

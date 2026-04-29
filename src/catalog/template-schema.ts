import { isBranchId } from "../config/branches.js";
import type { BranchId, Language } from "../types.js";
import type {
  CustomTemplate,
  TemplateAudience,
  TemplateCategory,
  TemplateContextRequirement,
  TemplateDefinition,
  TemplateOverride,
  TemplateVariable,
  TemplateVariableKind,
} from "./template-types.js";

export const ALL_BRANCH_IDS: readonly BranchId[] = Object.freeze([
  "coex",
  "gangnam",
  "seolleung",
]);

export const SUPPORTED_TEMPLATE_LANGUAGES: readonly Language[] = Object.freeze([
  "KO",
  "EN",
  "JP",
  "CN",
]);

export class TemplateCatalogSchemaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TemplateCatalogSchemaError";
  }
}

export type TemplateEntryDraft = {
  id?: string;
  category: TemplateCategory;
  audience: TemplateAudience;
  title: string;
  branchScope: unknown;
  languages: Partial<Record<Language, string>>;
  variables?: TemplateVariable[];
  attachments?: string[];
  requiresContext: TemplateContextRequirement;
  defaultValue?: string;
};

export function createCustomTemplateDefinition(draft: TemplateEntryDraft): CustomTemplate {
  const languages = normalizeLanguages(draft.languages, "languages");
  const defaultValue = normalizeText(draft.defaultValue ?? languages.KO ?? "", "defaultValue");

  return validateTemplateDefinitionForSave({
    id: normalizeTemplateId(draft.id || `custom-${Date.now().toString(36)}`),
    category: requireCategory(draft.category),
    audience: requireAudience(draft.audience),
    title: normalizeRequiredText(draft.title, "title"),
    branchScope: normalizeBranchScope(draft.branchScope, "branchScope"),
    languages,
    variables: normalizeVariables(draft.variables || [], "variables"),
    attachments: normalizeStringList(draft.attachments || [], "attachments"),
    requiresContext: requireContextRequirement(draft.requiresContext),
    editable: true,
    defaultValue,
    builtIn: false,
  });
}

export function validateTemplateDefinitionForSave<T extends TemplateDefinition>(template: T): T {
  normalizeTemplateId(template.id);
  requireCategory(template.category);
  requireAudience(template.audience);
  normalizeRequiredText(template.title, "title");
  normalizeBranchScope(template.branchScope, "branchScope");
  normalizeLanguages(template.languages, "languages");
  normalizeVariables(template.variables, "variables");
  normalizeStringList(template.attachments, "attachments");
  requireContextRequirement(template.requiresContext);
  normalizeText(template.defaultValue, "defaultValue");
  return template;
}

export function normalizeTemplateOverride(input: unknown, fieldName: string): TemplateOverride {
  if (!isRecord(input)) {
    throw new TemplateCatalogSchemaError(`${fieldName} must be an object.`);
  }

  const override: TemplateOverride = {};

  if ("title" in input) {
    override.title = normalizeRequiredText(input.title, `${fieldName}.title`);
  }
  if ("branchScope" in input) {
    override.branchScope = normalizeBranchScope(input.branchScope, `${fieldName}.branchScope`);
  }
  if ("languages" in input) {
    override.languages = normalizeLanguages(input.languages, `${fieldName}.languages`);
  }
  if ("variables" in input) {
    override.variables = normalizeVariables(input.variables, `${fieldName}.variables`);
  }
  if ("attachments" in input) {
    override.attachments = normalizeStringList(input.attachments, `${fieldName}.attachments`);
  }
  if ("defaultValue" in input) {
    override.defaultValue = normalizeText(input.defaultValue, `${fieldName}.defaultValue`);
  }

  return override;
}

export function normalizeCustomTemplate(input: unknown, fieldName: string): CustomTemplate {
  if (!isRecord(input)) {
    throw new TemplateCatalogSchemaError(`${fieldName} must be an object.`);
  }

  return createCustomTemplateDefinition({
    id: input.id as string,
    category: input.category as TemplateCategory,
    audience: input.audience as TemplateAudience,
    title: input.title as string,
    branchScope: input.branchScope,
    languages: isRecord(input.languages) ? (input.languages as Partial<Record<Language, string>>) : {},
    variables: Array.isArray(input.variables) ? input.variables : [],
    attachments: Array.isArray(input.attachments) ? input.attachments : [],
    requiresContext: input.requiresContext as TemplateContextRequirement,
    defaultValue: input.defaultValue as string,
  });
}

export function normalizeBranchScope(input: unknown, fieldName = "branchScope"): BranchId[] {
  if (!Array.isArray(input)) {
    throw new TemplateCatalogSchemaError(`${fieldName} must be an array.`);
  }

  const normalized: BranchId[] = [];
  for (const value of input) {
    if (typeof value !== "string" || !isBranchId(value)) {
      throw new TemplateCatalogSchemaError(`${fieldName} contains an unknown branch: ${String(value)}`);
    }
    if (!normalized.includes(value)) {
      normalized.push(value);
    }
  }

  if (normalized.length === 0) {
    throw new TemplateCatalogSchemaError(`${fieldName} must include at least one branch.`);
  }

  return normalized;
}

function normalizeTemplateId(input: unknown): string {
  const value = normalizeRequiredText(input, "id");
  if (!/^[a-z0-9][a-z0-9-]*$/.test(value)) {
    throw new TemplateCatalogSchemaError("id must use lowercase letters, numbers, and hyphens.");
  }
  return value;
}

function normalizeLanguages(input: unknown, fieldName: string): Partial<Record<Language, string>> {
  if (!isRecord(input)) {
    throw new TemplateCatalogSchemaError(`${fieldName} must be an object.`);
  }

  const languages: Partial<Record<Language, string>> = {};
  for (const language of SUPPORTED_TEMPLATE_LANGUAGES) {
    if (language in input) {
      languages[language] = normalizeText(input[language], `${fieldName}.${language}`);
    }
  }

  if (Object.keys(languages).length === 0) {
    throw new TemplateCatalogSchemaError(`${fieldName} must include at least one supported language.`);
  }

  return languages;
}

function normalizeVariables(input: unknown, fieldName: string): TemplateVariable[] {
  if (!Array.isArray(input)) {
    throw new TemplateCatalogSchemaError(`${fieldName} must be an array.`);
  }

  return input.map((item, index) => {
    const itemFieldName = `${fieldName}[${index}]`;
    if (!isRecord(item)) {
      throw new TemplateCatalogSchemaError(`${itemFieldName} must be an object.`);
    }
    return {
      name: normalizeRequiredText(item.name, `${itemFieldName}.name`),
      label: normalizeRequiredText(item.label, `${itemFieldName}.label`),
      kind: requireVariableKind(item.kind, `${itemFieldName}.kind`),
    };
  });
}

function normalizeStringList(input: unknown, fieldName: string): string[] {
  if (!Array.isArray(input)) {
    throw new TemplateCatalogSchemaError(`${fieldName} must be an array.`);
  }
  return input.map((item, index) => normalizeRequiredText(item, `${fieldName}[${index}]`));
}

function normalizeRequiredText(input: unknown, fieldName: string): string {
  const value = normalizeText(input, fieldName).trim();
  if (!value) {
    throw new TemplateCatalogSchemaError(`${fieldName} is required.`);
  }
  return value;
}

function normalizeText(input: unknown, fieldName: string): string {
  if (typeof input !== "string") {
    throw new TemplateCatalogSchemaError(`${fieldName} must be text.`);
  }
  return input;
}

function requireCategory(input: unknown): TemplateCategory {
  if (
    input === "CUSTOMER_RECORDS" ||
    input === "GUEST_NOTICE" ||
    input === "QUICK_REPLY" ||
    input === "WORK_TEMPLATE"
  ) {
    return input;
  }
  throw new TemplateCatalogSchemaError(`Unknown template category: ${String(input)}`);
}

function requireAudience(input: unknown): TemplateAudience {
  if (input === "guest" || input === "internal" || input === "pmsRemark") {
    return input;
  }
  throw new TemplateCatalogSchemaError(`Unknown template audience: ${String(input)}`);
}

function requireContextRequirement(input: unknown): TemplateContextRequirement {
  if (input === "none" || input === "pmsPage" || input === "guestRecord") {
    return input;
  }
  throw new TemplateCatalogSchemaError(`Unknown context requirement: ${String(input)}`);
}

function requireVariableKind(input: unknown, fieldName: string): TemplateVariableKind {
  if (
    input === "manualOptional" ||
    input === "manualRequired" ||
    input === "pmsRequired" ||
    input === "computed"
  ) {
    return input;
  }
  throw new TemplateCatalogSchemaError(`${fieldName} is unknown: ${String(input)}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

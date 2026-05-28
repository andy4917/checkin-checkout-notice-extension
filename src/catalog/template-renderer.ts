import type { Language } from "../types.js";
import type { TemplateDefinition } from "./template-types.js";

const TEMPLATE_LANGUAGE_ORDER: readonly Language[] = Object.freeze(["KO", "EN", "JP", "CN"]);

type MissingRequiredValueMode = "throw" | "blank";

type RenderTemplateOptions = {
  missingRequiredValueMode?: MissingRequiredValueMode;
};

export class UnsupportedLanguageError extends Error {
  constructor(lang: string) {
    super(`지원하지 않는 언어입니다: ${lang}`);
    this.name = "UnsupportedLanguageError";
  }
}

export class PmsRequiredValueMissingError extends Error {
  constructor(variableName: string) {
    super(`PMS 핵심 정보를 가져오지 못했습니다: ${variableName}`);
    this.name = "PmsRequiredValueMissingError";
  }
}

export class TemplateLanguageUnavailableError extends Error {
  constructor(templateId: string, language: Language) {
    super(`해당 템플릿의 ${language} 번역본이 없어 비활성화되었습니다: ${templateId}`);
    this.name = "TemplateLanguageUnavailableError";
  }
}

export class ManualRequiredValueMissingError extends Error {
  constructor(variableName: string) {
    super(`필수 입력값을 입력해주세요: ${variableName}`);
    this.name = "ManualRequiredValueMissingError";
  }
}

export function renderTemplate(
  template: TemplateDefinition,
  lang: string,
  values: Record<string, string | number | null | undefined> = {},
  options: RenderTemplateOptions = {},
): string {
  const language = requireTemplateLanguage(lang);
  const body = getTemplateLanguageBody(template, language);

  if (body === null) {
    throw new TemplateLanguageUnavailableError(template.id, language);
  }

  const missingRequiredValueMode = options.missingRequiredValueMode || "throw";

  return replaceTemplateVariables(body, /\{([a-zA-Z0-9_]+)\}/g, template, values, missingRequiredValueMode).replace(
    /\[([^\]]+)\]/g,
    (match, variableName: string) => replaceOneVariable(match, variableName, template, values, missingRequiredValueMode),
  );
}

function replaceTemplateVariables(
  body: string,
  pattern: RegExp,
  template: TemplateDefinition,
  values: Record<string, string | number | null | undefined>,
  missingRequiredValueMode: MissingRequiredValueMode,
): string {
  return body.replace(pattern, (match, variableName: string) =>
    replaceOneVariable(match, variableName, template, values, missingRequiredValueMode),
  );
}

function replaceOneVariable(
  match: string,
  variableName: string,
  template: TemplateDefinition,
  values: Record<string, string | number | null | undefined>,
  missingRequiredValueMode: MissingRequiredValueMode,
): string {
  const variable = template.variables.find(
    (item) => item.name === variableName || item.label === variableName,
  );
  if (!variable) return match;
  const value = values[variable.name] ?? values[variable.label];

  if (variable?.kind === "pmsRequired" && isBlank(value) && missingRequiredValueMode === "throw") {
    throw new PmsRequiredValueMissingError(variableName);
  }
  if (variable?.kind === "manualRequired" && isBlank(value) && missingRequiredValueMode === "throw") {
    throw new ManualRequiredValueMissingError(variableName);
  }

  return isBlank(value) ? "" : String(value);
}

export function getAvailableTemplateLanguages(template: TemplateDefinition): Language[] {
  return TEMPLATE_LANGUAGE_ORDER.filter((language) => hasTemplateLanguage(template, language));
}

export function hasTemplateLanguage(template: TemplateDefinition, lang: string): lang is Language {
  const language = requireTemplateLanguage(lang);
  return getTemplateLanguageBody(template, language) !== null;
}

function requireTemplateLanguage(lang: string): Language {
  if (lang === "KO" || lang === "EN" || lang === "JP" || lang === "CN") {
    return lang;
  }
  throw new UnsupportedLanguageError(lang);
}

function getTemplateLanguageBody(template: TemplateDefinition, language: Language): string | null {
  const body = template.languages[language];
  return typeof body === "string" && body.trim().length > 0 ? body : null;
}

function isBlank(value: string | number | null | undefined): boolean {
  return value === null || value === undefined || String(value).length === 0;
}

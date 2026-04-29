import { UnsupportedLanguageError } from "../messages/message-service.js";
import type { Language } from "../types.js";
import type { TemplateDefinition } from "./template-types.js";

const TEMPLATE_LANGUAGE_ORDER: readonly Language[] = Object.freeze(["KO", "EN", "JP", "CN"]);

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

export function renderTemplate(
  template: TemplateDefinition,
  lang: string,
  values: Record<string, string | number | null | undefined> = {},
): string {
  const language = requireTemplateLanguage(lang);
  const body = getTemplateLanguageBody(template, language);

  if (body === null) {
    throw new TemplateLanguageUnavailableError(template.id, language);
  }

  return body.replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, variableName: string) => {
    const variable = template.variables.find((item) => item.name === variableName);
    const value = values[variableName];

    if (variable?.kind === "pmsRequired" && isBlank(value)) {
      throw new PmsRequiredValueMissingError(variableName);
    }

    return isBlank(value) ? "" : String(value);
  });
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

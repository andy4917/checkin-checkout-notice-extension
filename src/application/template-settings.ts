import type { StoredExtensionState, TemplateOverride } from "../catalog/template-types.js";
import {
  createCustomTemplateDefinition,
  normalizeCustomTemplate,
  normalizeTemplateOverride,
} from "../catalog/template-schema.js";
import {
  normalizeStoredExtensionState,
} from "../platform/storage-schema.js";
import {
  type ChromeStorageArea,
  readExtensionState,
  writeExtensionState,
} from "../platform/chrome-storage.js";

export type TemplateSettingsExport = {
  schemaVersion: 1;
  templateOverrides: StoredExtensionState["templateOverrides"];
  customTemplates: StoredExtensionState["customTemplates"];
};

export function exportTemplateSettings(state: StoredExtensionState): TemplateSettingsExport {
  const normalized = normalizeStoredExtensionState(state);
  return {
    schemaVersion: 1,
    templateOverrides: normalized.templateOverrides,
    customTemplates: normalized.customTemplates,
  };
}

export function importTemplateSettings(
  currentState: StoredExtensionState,
  payload: unknown,
): StoredExtensionState {
  const current = normalizeStoredExtensionState(currentState);
  const incoming = normalizeTemplateSettingsPayload(payload);
  return normalizeStoredExtensionState({
    ...current,
    templateOverrides: incoming.templateOverrides,
    customTemplates: incoming.customTemplates,
  });
}

export function resetAllTemplateSettings(currentState: StoredExtensionState): StoredExtensionState {
  const current = normalizeStoredExtensionState(currentState);
  return {
    ...current,
    templateOverrides: {},
    customTemplates: [],
  };
}

export function resetOneTemplateOverride(
  currentState: StoredExtensionState,
  templateId: string,
): StoredExtensionState {
  const current = normalizeStoredExtensionState(currentState);
  const { [templateId]: _removed, ...templateOverrides } = current.templateOverrides;
  return { ...current, templateOverrides };
}

export async function saveImportedTemplateSettings(
  payload: unknown,
  storageArea: ChromeStorageArea,
): Promise<StoredExtensionState> {
  const current = await readExtensionState(storageArea);
  const nextState = importTemplateSettings(current, payload);
  await writeExtensionState(nextState, storageArea);
  return nextState;
}

export async function clearTemplateSettings(
  storageArea: ChromeStorageArea,
): Promise<StoredExtensionState> {
  const current = await readExtensionState(storageArea);
  const nextState = resetAllTemplateSettings(current);
  await writeExtensionState(nextState, storageArea);
  return nextState;
}

function normalizeTemplateSettingsPayload(payload: unknown): TemplateSettingsExport {
  if (!isRecord(payload)) {
    throw new Error("템플릿 설정 payload는 object여야 합니다.");
  }
  if (payload.schemaVersion !== 1) {
    throw new Error("지원하지 않는 템플릿 설정 버전입니다.");
  }

  const templateOverrides: Record<string, TemplateOverride> = {};
  if (isRecord(payload.templateOverrides)) {
    for (const [templateId, override] of Object.entries(payload.templateOverrides)) {
      templateOverrides[templateId] = normalizeTemplateOverride(
        override,
        `templateOverrides.${templateId}`,
      );
    }
  }

  const customTemplates = Array.isArray(payload.customTemplates)
    ? payload.customTemplates.map((template, index) =>
        normalizeCustomTemplate(template, `customTemplates[${index}]`),
      )
    : [];

  return {
    schemaVersion: 1,
    templateOverrides,
    customTemplates: customTemplates.map((template) =>
      createCustomTemplateDefinition({
        id: template.id,
        category: template.category,
        audience: template.audience,
        title: template.title,
        branchScope: template.branchScope,
        languages: template.languages,
        variables: template.variables,
        attachments: template.attachments,
        requiresContext: template.requiresContext,
        defaultValue: template.defaultValue,
      }),
    ),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

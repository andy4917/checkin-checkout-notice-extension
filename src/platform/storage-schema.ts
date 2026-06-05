import { isBranchId } from "../config/branches.js";
import { normalizeAirportVanFormValues } from "../application/airport-van-form.js";
import type { BranchFormValues, StoredExtensionState } from "../catalog/template-types.js";
import {
  TemplateCatalogSchemaError,
  normalizeCustomTemplate,
  normalizeTemplateOverride,
} from "../catalog/template-schema.js";

export const STORAGE_KEY = "workAssistantState";
export const STORAGE_SCHEMA_VERSION = 1;

export const DEFAULT_EXTENSION_STATE: StoredExtensionState = Object.freeze({
  schemaVersion: STORAGE_SCHEMA_VERSION,
  templateOverrides: {},
  customTemplates: [],
  ui: {},
});

export class StorageSchemaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageSchemaError";
  }
}

const RECOVERABLE_CORRUPTION_MESSAGES = Object.freeze([
  "Stored extension state must be an object.",
  "templateOverrides must be an object.",
  "customTemplates must be an array.",
  "ui must be an object.",
]);

export function isRecoverableStorageCorruption(error: unknown): boolean {
  if (!(error instanceof StorageSchemaError)) return false;
  return (
    RECOVERABLE_CORRUPTION_MESSAGES.includes(error.message) ||
    error.message.startsWith("Unsupported storage schemaVersion:")
  );
}

export function normalizeStoredExtensionState(input: unknown): StoredExtensionState {
  if (input === undefined || input === null) return { ...DEFAULT_EXTENSION_STATE };
  if (!isRecord(input)) {
    throw new StorageSchemaError("Stored extension state must be an object.");
  }
  if (
    input.schemaVersion !== undefined &&
    input.schemaVersion !== STORAGE_SCHEMA_VERSION
  ) {
    throw new StorageSchemaError(`Unsupported storage schemaVersion: ${String(input.schemaVersion)}`);
  }

  const state: StoredExtensionState = {
    schemaVersion: STORAGE_SCHEMA_VERSION,
    templateOverrides: normalizeTemplateOverrides(input.templateOverrides),
    customTemplates: normalizeCustomTemplates(input.customTemplates),
    ui: normalizeUiState(input.ui),
  };

  if (typeof input.lastBranchId === "string") {
    if (!isBranchId(input.lastBranchId)) {
      throw new StorageSchemaError(`Invalid lastBranchId: ${input.lastBranchId}`);
    }
    state.lastBranchId = input.lastBranchId;
  }

  return state;
}

function normalizeTemplateOverrides(input: unknown): StoredExtensionState["templateOverrides"] {
  if (input === undefined) return {};
  if (!isRecord(input)) {
    throw new StorageSchemaError("templateOverrides must be an object.");
  }

  const overrides: StoredExtensionState["templateOverrides"] = {};
  for (const [templateId, override] of Object.entries(input)) {
    overrides[templateId] = wrapCatalogSchemaError(
      () => normalizeTemplateOverride(override, `templateOverrides.${templateId}`),
      `Invalid template override for ${templateId}`,
    );
  }
  return overrides;
}

function normalizeCustomTemplates(input: unknown): StoredExtensionState["customTemplates"] {
  if (input === undefined) return [];
  if (!Array.isArray(input)) {
    throw new StorageSchemaError("customTemplates must be an array.");
  }

  return input.map((template, index) =>
    wrapCatalogSchemaError(
      () => normalizeCustomTemplate(template, `customTemplates[${index}]`),
      `Invalid custom template at index ${index}`,
    ),
  );
}

function normalizeUiState(input: unknown): StoredExtensionState["ui"] {
  if (input === undefined) return {};
  if (!isRecord(input)) {
    throw new StorageSchemaError("ui must be an object.");
  }
  return {
    lastTab: input.lastTab === "ARRIVAL" || input.lastTab === "DEPARTURE" ? input.lastTab : undefined,
    compactMode: typeof input.compactMode === "boolean" ? input.compactMode : undefined,
    templateVariableValues: normalizeTemplateVariableValues(input.templateVariableValues),
    airportVanFormValues: normalizeOptionalAirportVanFormValues(input.airportVanFormValues),
    branchFormValues: normalizeBranchFormValues(input.branchFormValues),
  };
}

function normalizeTemplateVariableValues(input: unknown): Record<string, string> | undefined {
  if (input === undefined) return undefined;
  if (!isRecord(input)) {
    throw new StorageSchemaError("ui.templateVariableValues must be an object.");
  }

  const values: Record<string, string> = {};
  for (const [name, value] of Object.entries(input)) {
    if (typeof value !== "string") {
      throw new StorageSchemaError(`ui.templateVariableValues.${name} must be text.`);
    }
    values[name] = value;
  }
  return values;
}

function normalizeBranchFormValues(input: unknown): StoredExtensionState["ui"]["branchFormValues"] {
  if (input === undefined) return undefined;
  if (!isRecord(input)) {
    throw new StorageSchemaError("ui.branchFormValues must be an object.");
  }

  const values: StoredExtensionState["ui"]["branchFormValues"] = {};
  for (const [branchId, branchValues] of Object.entries(input)) {
    if (!isBranchId(branchId)) {
      throw new StorageSchemaError(`ui.branchFormValues contains an unknown branch: ${branchId}`);
    }
    values[branchId] = normalizeBranchFormValue(branchValues, branchId);
  }
  return Object.keys(values).length > 0 ? values : undefined;
}

function normalizeBranchFormValue(input: unknown, branchId: string): BranchFormValues {
  if (!isRecord(input)) {
    throw new StorageSchemaError(`ui.branchFormValues.${branchId} must be an object.`);
  }
  const values: BranchFormValues = {
    templateVariableValues: normalizeTemplateVariableValues(input.templateVariableValues),
    airportVanFormValues: normalizeOptionalAirportVanFormValues(input.airportVanFormValues),
  };
  return compactBranchFormValue(values);
}

function normalizeOptionalAirportVanFormValues(input: unknown): StoredExtensionState["ui"]["airportVanFormValues"] {
  if (input === undefined) return undefined;
  const values = normalizeAirportVanFormValues(input);
  return Object.keys(values).length > 0 ? values : undefined;
}

function compactBranchFormValue(values: BranchFormValues): BranchFormValues {
  const result: BranchFormValues = {};
  if (values.templateVariableValues && Object.keys(values.templateVariableValues).length > 0) {
    result.templateVariableValues = values.templateVariableValues;
  }
  if (values.airportVanFormValues && Object.keys(values.airportVanFormValues).length > 0) {
    result.airportVanFormValues = values.airportVanFormValues;
  }
  return result;
}

function wrapCatalogSchemaError<T>(callback: () => T, prefix: string): T {
  try {
    return callback();
  } catch (error) {
    if (error instanceof TemplateCatalogSchemaError) {
      throw new StorageSchemaError(`${prefix}: ${error.message}`);
    }
    throw error;
  }
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

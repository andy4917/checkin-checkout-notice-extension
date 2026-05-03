import {
  extractTemplateVariables,
  extractTemplateVariablesFromLanguages,
  mergeTemplateVariables,
} from "../catalog/template-variable-mapping.js";
import {
  createCustomTemplateDefinition,
  normalizeBranchScope,
  validateTemplateDefinitionForSave,
} from "../catalog/template-schema.js";
import type { BranchId, Language } from "../types.js";
import type {
  StoredExtensionState,
  TemplateAudience,
  TemplateCategory,
  TemplateContextRequirement,
  TemplateDefinition,
} from "../catalog/template-types.js";
import { cloneStoredState, createCustomTemplateId, getSelectedBranches } from "./app-state-helpers.js";

export type TemplateEditInput = {
  editBody: string;
  editBranchScope: Record<BranchId, boolean>;
  editTitle: string;
  isBuiltInTemplate: (templateId: string) => boolean;
  selectedLanguage: Language;
  storedState: StoredExtensionState;
  template: TemplateDefinition;
};

export function createEditedTemplateState({
  editBody,
  editBranchScope,
  editTitle,
  isBuiltInTemplate,
  selectedLanguage,
  storedState,
  template,
}: TemplateEditInput): StoredExtensionState {
  const branchScope = normalizeBranchScope(getSelectedBranches(editBranchScope));
  const nextState = cloneStoredState(storedState);
  const languageBody = editBody;

  if (isBuiltInTemplate(template.id)) {
    const previous = nextState.templateOverrides[template.id] || {};
    nextState.templateOverrides[template.id] = {
      ...previous,
      title: editTitle.trim() || template.title,
      branchScope,
      languages: { ...(previous.languages || {}), [selectedLanguage]: languageBody },
      variables: mergeTemplateVariables(template.variables, extractTemplateVariables(languageBody)),
      defaultValue: languageBody || template.defaultValue,
    };
    return nextState;
  }

  nextState.customTemplates = nextState.customTemplates.map((item) =>
    item.id === template.id
      ? (() => {
          const languages = { ...item.languages, [selectedLanguage]: languageBody };
          return validateTemplateDefinitionForSave({
            ...item,
            title: editTitle.trim() || item.title,
            branchScope,
            languages,
            variables: extractTemplateVariablesFromLanguages(languages),
            defaultValue: languageBody || item.defaultValue,
          });
        })()
      : item,
  );
  return nextState;
}

export type CustomTemplateInput = {
  newAudience: TemplateAudience;
  newBody: string;
  newBranchScope: Record<BranchId, boolean>;
  newCategory: TemplateCategory;
  newContext: TemplateContextRequirement;
  newTitle: string;
  selectedLanguage: Language;
};

export function createNewCustomTemplate({
  newAudience,
  newBody,
  newBranchScope,
  newCategory,
  newContext,
  newTitle,
  selectedLanguage,
}: CustomTemplateInput): TemplateDefinition {
  return createCustomTemplateDefinition({
    id: createCustomTemplateId(newTitle),
    category: newCategory,
    audience: newAudience,
    title: newTitle.trim(),
    branchScope: getSelectedBranches(newBranchScope),
    languages: { [selectedLanguage]: newBody },
    variables: extractTemplateVariables(newBody),
    attachments: [],
    requiresContext: newContext,
    defaultValue: newBody,
  });
}

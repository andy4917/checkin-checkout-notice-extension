<script lang="ts">
  import { getAvailableTemplateLanguages, hasTemplateLanguage } from "../../catalog/template-renderer.js";
  import { guardRequiredContext } from "../../application/context-guard.js";
  import type { Language } from "../../types.js";
  import type { TemplateDefinition } from "../../catalog/template-types.js";

  type WorkContext = {
    isPmsPage: boolean;
    isGuestRecord: boolean;
  };

  export let activeTemplates: TemplateDefinition[];
  export let copiedTemplateId: string;
  export let selectedLanguage: Language;
  export let branchScopeLabel: (template: TemplateDefinition) => string;
  export let currentWorkContext: () => WorkContext;
  export let onCopyTemplate: (template: TemplateDefinition) => void | Promise<void>;
  export let onTemplateVariableInput: (
    templateId: string,
    variableName: string,
    event: Event,
  ) => void;
  export let templateInputValue: (template: TemplateDefinition, variableName: string) => string;
  export let templateSummary: (template: TemplateDefinition) => string;
  export let templateTypeLabel: (template: TemplateDefinition) => string;
  export let visibleTemplateVariables: (
    template: TemplateDefinition,
  ) => TemplateDefinition["variables"];
</script>

<section class="template-list" aria-label="템플릿 목록">
  {#each activeTemplates as template}
    {@const guard = guardRequiredContext(template.requiresContext, currentWorkContext())}
    {@const languageAvailable = hasTemplateLanguage(template, selectedLanguage)}
    <article class:blocked={!guard.ok || !languageAvailable} class="template-card">
      <div class="template-main">
        <div class="template-meta">
          <span>{templateTypeLabel(template)}</span>
          <span>{branchScopeLabel(template)}</span>
          <span>{getAvailableTemplateLanguages(template).join(", ")}</span>
        </div>
        <h2>{template.title}</h2>
        <p class="template-summary">{templateSummary(template)}</p>
        {#if !guard.ok}
          <p class="guard-message">{guard.message}</p>
        {:else if !languageAvailable}
          <p class="guard-message">선택한 언어의 번역본이 없어 비활성화되었습니다.</p>
        {/if}
        {#if visibleTemplateVariables(template).length > 0}
          <div class="template-variable-grid">
            {#each visibleTemplateVariables(template) as variable}
              <label>
                <span>{variable.label}</span>
                <input
                  value={templateInputValue(template, variable.name)}
                  oninput={(event) => onTemplateVariableInput(template.id, variable.name, event)}
                />
              </label>
            {/each}
          </div>
        {/if}
      </div>
      <button type="button" disabled={!guard.ok || !languageAvailable} onclick={() => onCopyTemplate(template)}>
        {copiedTemplateId === template.id ? "복사됨" : "복사"}
      </button>
    </article>
  {/each}
</section>

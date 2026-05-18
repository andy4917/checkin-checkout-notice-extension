<script lang="ts">
  import { hasTemplateLanguage } from "../../catalog/template-renderer.js";
  import { guardRequiredContext } from "../../application/context-guard.js";
  import { resolveTemplateGroups } from "../../catalog/template-groups.js";
  import type { Language } from "../../types.js";
  import type { TemplateDefinition, UnifiedTemplateDefinition } from "../../catalog/template-types.js";
  import * as MaterialIconModule from "./MaterialIcon.svelte";

  const MaterialIcon = MaterialIconModule.default;

  type WorkContext = {
    isPmsPage: boolean;
    isGuestRecord: boolean;
  };

  export let activeTemplates: UnifiedTemplateDefinition[];
  export let copiedTemplateId: string;
  export let selectedLanguage: Language;
  export let currentWorkContext: () => WorkContext;
  export let onCopyTemplate: (template: TemplateDefinition) => void | Promise<void>;
  export let onTemplateVariableInput: (
    templateId: string,
    variableName: string,
    event: Event,
  ) => void;
  export let templateInputValue: (template: TemplateDefinition, variableName: string) => string;
  export let visibleTemplateVariables: (
    template: TemplateDefinition,
  ) => TemplateDefinition["variables"];

  function getTemplateGuard(template: TemplateDefinition) {
    return guardRequiredContext(template.requiresContext, currentWorkContext());
  }

  function isLanguageAvailable(template: TemplateDefinition) {
    return hasTemplateLanguage(template, selectedLanguage);
  }

  function templateIcon(template: UnifiedTemplateDefinition) {
    return template.icon;
  }

  let expandedTemplateId = "";

  function toggleTemplateInputs(templateId: string) {
    expandedTemplateId = expandedTemplateId === templateId ? "" : templateId;
  }

  $: templateGroups = resolveTemplateGroups(activeTemplates);
</script>

<section class="template-list" aria-label="템플릿 목록">
  {#each templateGroups as group}
    <section class="template-group" aria-label={group.label}>
      <h2>{group.label}</h2>
      <div class="template-group-list">
        {#each group.templates as template}
          {@const guard = getTemplateGuard(template)}
          {@const languageAvailable = isLanguageAvailable(template)}
          {@const variables = visibleTemplateVariables(template)}
          {@const expanded = expandedTemplateId === template.id}
          <article
            class:blocked={!guard.ok || !languageAvailable}
            class="template-card"
          >
            <span class="template-card-icon" aria-hidden="true">
              <MaterialIcon name={templateIcon(template)} size={22} />
            </span>
            <div class="template-main">
              <h3>{template.title}</h3>
              {#if variables.length > 0}
                <button
                  class:expanded
                  class="template-input-toggle"
                  type="button"
                  aria-label={`${template.title} 입력값`}
                  aria-expanded={expanded}
                  onclick={() => toggleTemplateInputs(template.id)}
                >
                  <MaterialIcon name="expand_more" size={17} />
                </button>
              {/if}
              {#if expanded && variables.length > 0}
                <div class="template-variable-grid">
                  {#each variables as variable}
                    <label>
                      <span>{variable.label}</span>
                      <input
                        name={`${template.id}-${variable.name}`}
                        value={templateInputValue(template, variable.name)}
                        oninput={(event) => onTemplateVariableInput(template.id, variable.name, event)}
                      />
                    </label>
                  {/each}
                </div>
              {/if}
            </div>
            <button
              class="template-copy-button"
              type="button"
              aria-label={copiedTemplateId === template.id ? `${template.title} 복사됨` : `${template.title} 복사`}
              disabled={!guard.ok || !languageAvailable}
              onclick={() => onCopyTemplate(template)}
            >
              <MaterialIcon name={copiedTemplateId === template.id ? "check" : "content_copy"} size={20} />
            </button>
          </article>
        {/each}
      </div>
    </section>
  {/each}
</section>

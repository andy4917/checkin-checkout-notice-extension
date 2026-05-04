<script lang="ts">
  import { guardRequiredContext } from "../../application/context-guard.js";
  import { hasTemplateLanguage } from "../../catalog/template-renderer.js";
  import type { TemplateDefinition } from "../../catalog/template-types.js";
  import type { Language } from "../../types.js";
  import * as MaterialIconModule from "./MaterialIcon.svelte";

  const MaterialIcon = MaterialIconModule.default;

  type WorkContext = {
    isPmsPage: boolean;
    isGuestRecord: boolean;
  };

  export let activeTemplates: TemplateDefinition[];
  export let copiedTemplateId: string;
  export let selectedGuidanceTemplateId: string;
  export let selectedLanguage: Language;
  export let currentWorkContext: () => WorkContext;
  export let onCopyTemplate: (template: TemplateDefinition) => void | Promise<void>;
  export let onSelectGuidanceTemplate: (templateId: string) => void;
  export let onTemplateVariableInput: (
    templateId: string,
    variableName: string,
    event: Event,
  ) => void;
  export let templateInputValue: (template: TemplateDefinition, variableName: string) => string;
  export let templateSummary: (template: TemplateDefinition) => string;
  export let visibleTemplateVariables: (
    template: TemplateDefinition,
  ) => TemplateDefinition["variables"];

  function templateIcon(template: TemplateDefinition) {
    return (template as TemplateDefinition & { icon: string }).icon;
  }

  function canCopy(template: TemplateDefinition) {
    return (
      guardRequiredContext(template.requiresContext, currentWorkContext()).ok &&
      hasTemplateLanguage(template, selectedLanguage)
    );
  }

  const selectGuidance = (template: TemplateDefinition) => onSelectGuidanceTemplate(template.id);
</script>

<section class="customer-guidance-list" aria-label="고객 안내문 목록">
  {#each activeTemplates as template}
    {@const selected = selectedGuidanceTemplateId === template.id}
    {@const variables = visibleTemplateVariables(template)}
    {@const copyEnabled = canCopy(template)}
    <article
      class:blocked={!copyEnabled}
      class:selected
      class="customer-guidance-card"
    >
      <button
        class="customer-guidance-select"
        type="button"
        aria-expanded={selected}
        onclick={() => selectGuidance(template)}
      >
        <span class="customer-guidance-icon" aria-hidden="true">
          <MaterialIcon name={templateIcon(template)} size={24} />
        </span>
        <span class="customer-guidance-main">
          <h2>{template.title}</h2>
          <p>{templateSummary(template)}</p>
        </span>
      </button>
      <button
        class="customer-guidance-copy"
        type="button"
        aria-label={copiedTemplateId === template.id ? `${template.title} 복사됨` : `${template.title} 복사`}
        disabled={!copyEnabled}
        onclick={(event) => {
          event.stopPropagation();
          void onCopyTemplate(template);
        }}
      >
        <MaterialIcon name={copiedTemplateId === template.id ? "check" : "content_copy"} size={20} />
      </button>
      {#if selected && variables.length > 0}
        <div class="customer-guidance-fields">
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
    </article>
  {/each}
</section>

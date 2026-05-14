<script lang="ts">
  import { guardRequiredContext } from "../../application/context-guard.js";
  import { resolveTemplateGroups } from "../../catalog/template-groups.js";
  import { hasTemplateLanguage } from "../../catalog/template-renderer.js";
  import type { TemplateDefinition, UnifiedTemplateDefinition } from "../../catalog/template-types.js";
  import type { Language } from "../../types.js";
  import * as MaterialIconModule from "./MaterialIcon.svelte";

  const MaterialIcon = MaterialIconModule.default;

  type WorkContext = {
    isPmsPage: boolean;
    isGuestRecord: boolean;
  };

  export let activeTemplates: UnifiedTemplateDefinition[];
  export let copiedTemplateId: string;
  export let selectedGuidanceTemplateId: string;
  export let selectedLanguage: Language;
  export let currentWorkContext: () => WorkContext;
  export let onCopyTemplate: (template: TemplateDefinition) => void | Promise<void>;
  export let onSelectGuidanceTemplate: (templateId: string) => void;

  function templateIcon(template: UnifiedTemplateDefinition) {
    return template.icon;
  }

  function canCopy(template: TemplateDefinition) {
    return (
      guardRequiredContext(template.requiresContext, currentWorkContext()).ok &&
      hasTemplateLanguage(template, selectedLanguage)
    );
  }

  const selectGuidance = (template: TemplateDefinition) => onSelectGuidanceTemplate(template.id);
  $: templateGroups = resolveTemplateGroups(activeTemplates);
</script>

<section class="customer-guidance-list" aria-label="고객 안내문 목록">
  {#each templateGroups as group}
    <section class="template-group" aria-label={group.label}>
      <h2>{group.label}</h2>
      <div class="template-group-list">
        {#each group.templates as template}
          {@const selected = selectedGuidanceTemplateId === template.id}
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
                <h3>{template.title}</h3>
              </span>
            </button>
            <button
              class="customer-guidance-copy"
              type="button"
              aria-label={copiedTemplateId === template.id ? `${template.title} 복사완료` : `${template.title} 복사`}
              disabled={!copyEnabled}
              onclick={(event) => {
                event.stopPropagation();
                void onCopyTemplate(template);
              }}
            >
              <MaterialIcon name={copiedTemplateId === template.id ? "check" : "content_copy"} size={20} />
            </button>
          </article>
        {/each}
      </div>
    </section>
  {/each}
</section>

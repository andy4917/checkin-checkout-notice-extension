<script lang="ts">
  import { getAvailableTemplateLanguages, hasTemplateLanguage } from "../../catalog/template-renderer.js";
  import { guardRequiredContext } from "../../application/context-guard.js";
  import type { Language } from "../../types.js";
  import type { TemplateDefinition } from "../../catalog/template-types.js";
  import * as MaterialIconModule from "./MaterialIcon.svelte";

  const MaterialIcon = MaterialIconModule.default;

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

  function getTemplateGuard(template: TemplateDefinition) {
    return guardRequiredContext(template.requiresContext, currentWorkContext());
  }

  function isLanguageAvailable(template: TemplateDefinition) {
    return hasTemplateLanguage(template, selectedLanguage);
  }

  function availableLanguageLabel(template: TemplateDefinition) {
    return getAvailableTemplateLanguages(template).join(", ");
  }

  const templateIconByType: Readonly<Record<string, string>> = {
    airport_van: "airport_shuttle",
    day_night_report: "assignment",
    dodine_sales: "payments",
    laundry_complete: "local_laundry_service",
    partner_service: "room_service",
    reservation_report: "event_note",
    room_remark: "edit_note",
    room_sales: "payments",
  };

  function templateIcon(template: TemplateDefinition) {
    if (templateIconByType[template.typeId]) return templateIconByType[template.typeId];
    if (template.id.includes("wifi")) return "wifi";
    if (template.id.includes("parking")) return "local_parking";
    if (template.id.includes("late") || template.id.includes("early")) return "schedule";
    if (template.id.includes("breakfast")) return "restaurant";
    if (template.id.includes("luggage")) return "luggage";
    if (template.id.includes("key")) return "vpn_key";
    return "description";
  }
</script>

<section class="template-list" aria-label="템플릿 목록">
  {#each activeTemplates as template}
    {@const guard = getTemplateGuard(template)}
    {@const languageAvailable = isLanguageAvailable(template)}
    <article class:blocked={!guard.ok || !languageAvailable} class="template-card">
      <span class="template-card-icon" aria-hidden="true">
        <MaterialIcon name={templateIcon(template)} size={22} filled />
      </span>
      <div class="template-main">
        <div class="template-meta">
          <span>{templateTypeLabel(template)}</span>
          <span>{branchScopeLabel(template)}</span>
          <span>{availableLanguageLabel(template)}</span>
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
</section>

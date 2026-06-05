<script lang="ts">
  import { getBuiltInRemarkType, type RemarkType } from "../../domain/remarks.js";
  import type { WorkRoomContext } from "../../domain/room-context.js";
  import type { TemplateVariable, UnifiedTemplateDefinition } from "../../catalog/template-types.js";
  import { getManualVariables, getTemplateRequirement as resolveTemplateRequirement } from "../template-list-state.js";
  import * as MaterialIconModule from "./MaterialIcon.svelte";

  const MaterialIcon = MaterialIconModule.default;
  const remarkOrder: readonly RemarkType[] = ["cardKeys", "rentals", "medicalBloom", "stoneHouse"];

  export let templates: readonly UnifiedTemplateDefinition[];
  export let templateValues: Record<string, string>;
  export let templateVariableValues: Record<string, string>;
  export let workRoomContext: WorkRoomContext;
  export let copiedTemplateId: string | null;
  export let loading: boolean;
  export let onSetTemplateVariableValue: (variableName: string, value: string) => void | Promise<void>;
  export let onUpsertRoomRemark: (templateId: string) => void | Promise<void>;

  let activeTemplateId = "";
  let pendingTemplateId = "";

  $: remarkTemplates = remarkOrder
    .map((type) => templates.find((template) => getBuiltInRemarkType(template.id) === type) || null)
    .filter((template): template is UnifiedTemplateDefinition => Boolean(template));
  $: cardKeyTemplate = remarkTemplates.find((template) => getBuiltInRemarkType(template.id) === "cardKeys") || null;
  $: rentalTemplate = remarkTemplates.find((template) => getBuiltInRemarkType(template.id) === "rentals") || null;
  $: partnerTemplates = remarkTemplates.filter((template) =>
    ["medicalBloom", "stoneHouse"].includes(getBuiltInRemarkType(template.id) || ""),
  );
  $: if (!activeTemplateId || !remarkTemplates.some((template) => template.id === activeTemplateId)) {
    activeTemplateId = remarkTemplates[0]?.id || "";
  }
  $: activeTemplate = remarkTemplates.find((template) => template.id === activeTemplateId) || null;
  $: activeRequirement = activeTemplate ? getTemplateRequirement(activeTemplate) : "";
  $: selectedPartnerTemplate =
    partnerTemplates.find((template) => template.id === activeTemplateId) || partnerTemplates[0] || null;

  function roomTitle(): string {
    return workRoomContext.selected ? `Room ${workRoomContext.roomLabel}` : "객실 선택";
  }

  function roomStateLabel(): string {
    return workRoomContext.selected ? "선택됨" : "미선택";
  }

  function templateVariables(template: UnifiedTemplateDefinition): TemplateVariable[] {
    return getManualVariables(template);
  }

  function primaryVariable(template: UnifiedTemplateDefinition | null): TemplateVariable | null {
    return template ? templateVariables(template)[0] || null : null;
  }

  function templateValue(variableName: string): string {
    return templateVariableValues[variableName] || templateValues[variableName] || "";
  }

  function variableValue(variable: TemplateVariable): string {
    return templateValue(variable.name);
  }

  function numericTemplateValue(template: UnifiedTemplateDefinition | null): number {
    const variable = primaryVariable(template);
    if (!variable) return 0;
    const parsed = Number.parseInt(templateValue(variable.name), 10);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }

  function getTemplateRequirement(template: UnifiedTemplateDefinition): string {
    return resolveTemplateRequirement(template, {
      hasSelectedPmsRecord: workRoomContext.selected,
      templateValues,
      templateVariableValues,
    });
  }

  function selectTemplate(template: UnifiedTemplateDefinition | null) {
    if (!template) return;
    activeTemplateId = template.id;
  }

  async function adjustCardKeyCount(delta: number) {
    if (!cardKeyTemplate) return;
    const variable = primaryVariable(cardKeyTemplate);
    if (!variable) return;
    selectTemplate(cardKeyTemplate);
    await onSetTemplateVariableValue(variable.name, String(Math.max(0, numericTemplateValue(cardKeyTemplate) + delta)));
  }

  async function handleVariableInput(variableName: string, event: Event) {
    await onSetTemplateVariableValue(variableName, (event.currentTarget as HTMLInputElement).value);
  }

  async function applyActiveTemplate() {
    if (!activeTemplate) return;
    const variable = primaryVariable(activeTemplate);
    if (getBuiltInRemarkType(activeTemplate.id) === "cardKeys" && variable?.name === "count" && !templateValue(variable.name)) {
      await onSetTemplateVariableValue(variable.name, "0");
    }
    pendingTemplateId = activeTemplate.id;
    try {
      await onUpsertRoomRemark(activeTemplate.id);
    } finally {
      pendingTemplateId = "";
    }
  }
</script>

<section class="room-remark-surface" aria-label="객실 정보 리마크">
  <header class="room-remark-hero">
    <span class="room-remark-state">{roomStateLabel()}</span>
    <h1>{roomTitle()}</h1>
  </header>

  <section class="room-inventory-requests" aria-labelledby="room-inventory-title">
    <h2 id="room-inventory-title">객실 물품</h2>
    <div class="room-inventory-grid">
      {#if cardKeyTemplate}
        <article class:active={activeTemplateId === cardKeyTemplate.id} class="inventory-stepper">
          <button class="inventory-main" type="button" onclick={() => selectTemplate(cardKeyTemplate)}>
            <span class="inventory-icon" aria-hidden="true">
              <MaterialIcon name={cardKeyTemplate.icon} size={18} />
            </span>
            <strong>{cardKeyTemplate.title}</strong>
          </button>
          <div class="inventory-count-stepper" aria-label={`${cardKeyTemplate.title} 수량`}>
            <button
              type="button"
              disabled={loading || numericTemplateValue(cardKeyTemplate) <= 0}
              aria-label={`${cardKeyTemplate.title} 감소`}
              onclick={() => adjustCardKeyCount(-1)}
            >-</button>
            <output>{numericTemplateValue(cardKeyTemplate)}</output>
            <button
              type="button"
              disabled={loading}
              aria-label={`${cardKeyTemplate.title} 증가`}
              onclick={() => adjustCardKeyCount(1)}
            >+</button>
          </div>
        </article>
      {/if}

      {#if rentalTemplate}
        {@const rentalVariable = primaryVariable(rentalTemplate)}
        <article class:active={activeTemplateId === rentalTemplate.id} class="inventory-stepper rental-stepper">
          <button class="inventory-main" type="button" onclick={() => selectTemplate(rentalTemplate)}>
            <span class="inventory-icon" aria-hidden="true">
              <MaterialIcon name={rentalTemplate.icon} size={18} />
            </span>
            <strong>{rentalTemplate.title}</strong>
          </button>
          {#if rentalVariable}
            <label class="room-rental-field">
              <span>{rentalVariable.label}</span>
              <input
                value={variableValue(rentalVariable)}
                aria-label={rentalVariable.label}
                disabled={loading}
                onfocus={() => selectTemplate(rentalTemplate)}
                oninput={(event) => handleVariableInput(rentalVariable.name, event)}
              />
            </label>
          {/if}
        </article>
      {/if}
    </div>
  </section>

  {#if partnerTemplates.length > 0}
    <section class="room-additional-remarks" aria-labelledby="room-additional-title">
      <h2 id="room-additional-title">추가 리마크</h2>
      <div class="room-additional-panel">
        <div class="partner-remark-selector" aria-label="추가 리마크 업무">
          {#each partnerTemplates as template}
            <button
              class:active={activeTemplateId === template.id}
              type="button"
              aria-pressed={activeTemplateId === template.id}
              onclick={() => selectTemplate(template)}
            >
              <span class="inventory-icon" aria-hidden="true">
                <MaterialIcon name={template.icon} size={18} />
              </span>
              <strong>{template.title}</strong>
            </button>
          {/each}
        </div>

        {#if selectedPartnerTemplate}
          <article class="partner-remark-card">
            <div class="partner-remark-fields">
              {#each templateVariables(selectedPartnerTemplate) as variable}
                <label class="variable-field">
                  <span>{variable.label}</span>
                  <input
                    value={variableValue(variable)}
                    aria-label={`${selectedPartnerTemplate.title} ${variable.label}`}
                    disabled={loading}
                    onfocus={() => selectTemplate(selectedPartnerTemplate)}
                    oninput={(event) => handleVariableInput(variable.name, event)}
                  />
                </label>
              {/each}
            </div>
          </article>
        {/if}
      </div>
    </section>
  {/if}

  <div class="work-dock room-remark-dock">
    <button
      class:applying={Boolean(activeTemplate && pendingTemplateId === activeTemplate.id)}
      class="primary-action room-remark-action"
      type="button"
      aria-busy={activeTemplate ? pendingTemplateId === activeTemplate.id : false}
      aria-label={activeRequirement || (activeTemplate ? `${activeTemplate.title} WINGS 리마크 입력` : "WINGS 리마크 입력")}
      disabled={loading || !activeTemplate || Boolean(activeRequirement)}
      onclick={applyActiveTemplate}
    >
      <MaterialIcon
        name={activeTemplate && pendingTemplateId === activeTemplate.id ? "sync" : copiedTemplateId === activeTemplate?.id ? "check" : "send"}
        size={18}
      />
      <span>{activeTemplate ? `${activeTemplate.title} WINGS 리마크 입력` : "WINGS 리마크 입력"}</span>
    </button>
  </div>
</section>

<script lang="ts">
  import { guardRequiredContext } from "../../application/context-guard.js";
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
  export let selectedLanguage: Language;
  export let currentWorkContext: () => WorkContext;
  export let onCopyTemplate: (template: TemplateDefinition) => void | Promise<void>;
  export let onTemplateVariableInput: (
    templateId: string,
    variableName: string,
    event: Event,
  ) => void;
  export let templateInputValue: (template: TemplateDefinition, variableName: string) => string;

  const pickupLabel = "픽업";
  const sendingLabel = "샌딩";
  const creditCardLabel = "카드 결제";
  const cashToDriverLabel = "기사님께 현금 결제";
  const todayLabel = formatToday(new Date());

  function formatToday(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}.${month}.${day}`;
  }

  function hasVariable(template: TemplateDefinition, variableName: string) {
    return template.variables.some((variable) => variable.name === variableName);
  }

  function setVariable(template: TemplateDefinition, variableName: string, value: string) {
    onTemplateVariableInput(template.id, variableName, {
      target: { value },
    } as unknown as Event);
  }

  function toggleRouteDirection(template: TemplateDefinition) {
    setVariable(template, "rideDirection", isSending ? pickupLabel : sendingLabel);
  }

  function variableValue(template: TemplateDefinition, variableName: string) {
    return templateInputValue(template, variableName);
  }

  function canCopy(template: TemplateDefinition | null) {
    if (!template) return false;
    return (
      guardRequiredContext(template.requiresContext, currentWorkContext()).ok &&
      hasTemplateLanguage(template, selectedLanguage)
    );
  }

  $: requestTemplate =
    activeTemplates.find((template) => hasVariable(template, "rideDirection")) ||
    activeTemplates[0] ||
    null;
  $: direction = requestTemplate ? variableValue(requestTemplate, "rideDirection") : "";
  $: isSending = direction === sendingLabel || direction === "Sending";
  $: originVariable = isSending ? "departurePoint" : "airportName";
  $: destinationVariable = isSending ? "airportName" : "destination";
  $: copyEnabled = canCopy(requestTemplate);
</script>

<section class="airport-van-panel" aria-label="공항밴 관리">
  {#if !requestTemplate}
    <article class="pms-record empty">공항밴 템플릿이 없습니다.</article>
  {:else}
    <div class="airport-segmented" aria-label="이용 구분">
      <button
        class:active={!isSending}
        type="button"
        onclick={() => setVariable(requestTemplate, "rideDirection", pickupLabel)}
      >
        픽업
      </button>
      <button
        class:active={isSending}
        type="button"
        onclick={() => setVariable(requestTemplate, "rideDirection", sendingLabel)}
      >
        샌딩
      </button>
    </div>

    <section class="airport-field-section" aria-label="출발지와 도착지 선택">
      <h3>출발지 & 도착지 선택</h3>
      <div class="airport-route-card">
        <label>
          <span class="airport-route-line">
            <span>출발지</span>
            <input
              name={`${requestTemplate.id}-${originVariable}`}
              placeholder={isSending ? "호텔" : "공항"}
              value={variableValue(requestTemplate, originVariable)}
              oninput={(event) => onTemplateVariableInput(requestTemplate.id, originVariable, event)}
            />
          </span>
        </label>
        <div class="airport-route-divider" aria-hidden="true">
          <span><MaterialIcon name="arrow_downward" size={20} /></span>
        </div>
        <label>
          <span class="airport-route-line">
            <span>도착지</span>
            <input
              name={`${requestTemplate.id}-${destinationVariable}`}
              placeholder={isSending ? "공항" : "호텔"}
              value={variableValue(requestTemplate, destinationVariable)}
              oninput={(event) => onTemplateVariableInput(requestTemplate.id, destinationVariable, event)}
            />
          </span>
        </label>
        <button
          class="airport-route-swap-button"
          type="button"
          aria-label="출발지와 도착지 전환"
          onclick={() => toggleRouteDirection(requestTemplate)}
        >
          <MaterialIcon name="swap_vert" size={21} />
        </button>
      </div>
    </section>

    <section class="airport-detail-grid" aria-label="Flight Details">
      <label>
        <span class="airport-detail-title">
          <MaterialIcon name="calendar_today" size={18} />
          이용일
        </span>
        <div class="airport-text-field">
          <input
            name={`${requestTemplate.id}-rideDate`}
            placeholder={todayLabel}
            value={variableValue(requestTemplate, "rideDate")}
            oninput={(event) => onTemplateVariableInput(requestTemplate.id, "rideDate", event)}
          />
        </div>
      </label>
      <label>
        <span class="airport-detail-title">
          <MaterialIcon name="schedule" size={18} />
          시간
        </span>
        <div class="airport-text-field">
          <input
            name={`${requestTemplate.id}-pickupTime`}
            placeholder=""
            value={variableValue(requestTemplate, "pickupTime")}
            oninput={(event) => onTemplateVariableInput(requestTemplate.id, "pickupTime", event)}
          />
        </div>
      </label>
      <label class="wide">
        <span>항공편명</span>
        <div class="airport-field-with-icon">
          <MaterialIcon name="flight" size={22} />
          <input
            name={`${requestTemplate.id}-flightNo`}
            placeholder="예: KE082"
            value={variableValue(requestTemplate, "flightNo")}
            oninput={(event) => onTemplateVariableInput(requestTemplate.id, "flightNo", event)}
          />
        </div>
      </label>
    </section>

    <section class="airport-payment-section" aria-label="결제 수단">
      <h3>결제 수단</h3>
      <div class="airport-payment-grid">
        <button
          class:active={variableValue(requestTemplate, "paymentMethod") === creditCardLabel}
          type="button"
          onclick={() => setVariable(requestTemplate, "paymentMethod", creditCardLabel)}
        >
          <MaterialIcon name="credit_card" size={28} />
          <span>카드 결제</span>
        </button>
        <button
          class:cash={variableValue(requestTemplate, "paymentMethod") === cashToDriverLabel}
          type="button"
          onclick={() => setVariable(requestTemplate, "paymentMethod", cashToDriverLabel)}
        >
          <MaterialIcon name="payments" size={28} />
          <span>기사님께 현금 결제</span>
        </button>
      </div>
    </section>

    <div class="airport-bottom-action">
      <button
        type="button"
        disabled={!copyEnabled}
        onclick={() => onCopyTemplate(requestTemplate)}
      >
        <MaterialIcon name={copiedTemplateId === requestTemplate.id ? "check" : "content_copy"} size={22} />
        예약 정보 복사
      </button>
    </div>
  {/if}
</section>

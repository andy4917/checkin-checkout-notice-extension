<script lang="ts">
  import type { BranchId, Language } from "../../types.js";
  import type {
    TemplateAudience,
    TemplateCategory,
    TemplateContextRequirement,
    TemplateDefinition,
  } from "../../catalog/template-types.js";
  import * as LanguageSegmentedControlModule from "./LanguageSegmentedControl.svelte";
  import * as MaterialIconModule from "./MaterialIcon.svelte";

  const LanguageSegmentedControl = LanguageSegmentedControlModule.default;
  const MaterialIcon = MaterialIconModule.default;

  export let audienceOptions: Array<{ id: TemplateAudience; label: string }>;
  export let branchOptions: Array<{ id: BranchId; label: string }>;
  export let catalogTemplates: TemplateDefinition[];
  export let categoryOptions: Array<{ id: TemplateCategory; label: string }>;
  export let contextOptions: Array<{ id: TemplateContextRequirement; label: string }>;
  export let editBody: string;
  export let editBranchScope: Record<BranchId, boolean>;
  export let editTitle: string;
  export let isBuiltInTemplate: (templateId: string) => boolean;
  export let languages: Array<{ id: Language; label: string }>;
  export let navigationLocked: boolean;
  export let newAudience: TemplateAudience;
  export let newBody: string;
  export let newBranchScope: Record<BranchId, boolean>;
  export let newCategory: TemplateCategory;
  export let newContext: TemplateContextRequirement;
  export let newTitle: string;
  export let selectedLanguage: Language;
  export let settingsTemplateId: string;
  export let onAddCustomTemplate: () => void | Promise<void>;
  export let onCancelTemplateEdit: () => void;
  export let onClearNewTemplateDraft: () => void;
  export let onEditBodyChange: (value: string) => void;
  export let onEditBranchScopeChange: (branchId: BranchId, checked: boolean) => void;
  export let onEditTitleChange: (value: string) => void;
  export let onSelectLanguage: (language: Language) => void;
  export let onNewAudienceChange: (value: TemplateAudience) => void;
  export let onNewBodyChange: (value: string) => void;
  export let onNewBranchScopeChange: (branchId: BranchId, checked: boolean) => void;
  export let onNewCategoryChange: (value: TemplateCategory) => void;
  export let onNewContextChange: (value: TemplateContextRequirement) => void;
  export let onNewTitleChange: (value: string) => void;
  export let onResetTemplateEdit: () => void | Promise<void>;
  export let onSaveTemplateEdit: () => void | Promise<void>;
  export let onSettingsTemplateChange: (event: Event) => void;
</script>

<section class="settings-panel">
  <details class="settings-editor-card">
    <summary>
      <span class="settings-entry-icon" aria-hidden="true">
        <MaterialIcon name="description" size={22} />
      </span>
      <span>
        <strong>기존 항목 수정</strong>
      </span>
      <MaterialIcon name="expand_more" size={20} />
    </summary>
    <div class="settings-editor">
    <label>
      <span>수정 항목</span>
      <select
        name="settings-template"
        value={settingsTemplateId}
        onchange={onSettingsTemplateChange}
        disabled={navigationLocked}
      >
        {#each catalogTemplates as template}
          <option value={template.id}>{template.title}</option>
        {/each}
      </select>
    </label>
    <LanguageSegmentedControl
      {languages}
      {selectedLanguage}
      onSelectLanguage={onSelectLanguage}
    />
    <label>
      <span>제목</span>
      <input
        name="settings-edit-title"
        value={editTitle}
        oninput={(event) => onEditTitleChange((event.target as HTMLInputElement).value)}
      />
    </label>
    <label>
      <span>내용</span>
      <textarea
        name="settings-edit-body"
        value={editBody}
        oninput={(event) => onEditBodyChange((event.target as HTMLTextAreaElement).value)}
      ></textarea>
    </label>
    <fieldset class="branch-scope-editor">
      <legend>사용 지점</legend>
      <div class="branch-scope-options">
        {#each branchOptions as branch}
          <label>
            <input
              type="checkbox"
              checked={editBranchScope[branch.id]}
              onchange={(event) =>
                onEditBranchScopeChange(branch.id, (event.target as HTMLInputElement).checked)}
            />
            <span>{branch.label}</span>
          </label>
        {/each}
      </div>
    </fieldset>
    <div class="settings-actions">
      <button type="button" onclick={onSaveTemplateEdit}>저장</button>
      <button class="secondary" type="button" onclick={onCancelTemplateEdit}>취소</button>
    </div>
    </div>
  </details>

  <details class="settings-editor-card">
    <summary>
      <span class="settings-entry-icon" aria-hidden="true">
        <MaterialIcon name="add_notes" size={22} />
      </span>
      <span>
        <strong>새 항목 추가</strong>
      </span>
      <MaterialIcon name="expand_more" size={20} />
    </summary>
    <div class="settings-editor">
    <div class="settings-row">
      <label>
        <span>메뉴</span>
        <select
          name="settings-new-category"
          value={newCategory}
          onchange={(event) =>
            onNewCategoryChange((event.target as HTMLSelectElement).value as TemplateCategory)}
        >
          {#each categoryOptions as option}
            <option value={option.id}>{option.label}</option>
          {/each}
        </select>
      </label>
      <label>
        <span>대상</span>
        <select
          name="settings-new-audience"
          value={newAudience}
          onchange={(event) =>
            onNewAudienceChange((event.target as HTMLSelectElement).value as TemplateAudience)}
        >
          {#each audienceOptions as option}
            <option value={option.id}>{option.label}</option>
          {/each}
        </select>
      </label>
    </div>
    <label>
      <span>필요 화면</span>
      <select
        name="settings-new-context"
        value={newContext}
        onchange={(event) =>
          onNewContextChange(
            (event.target as HTMLSelectElement).value as TemplateContextRequirement,
          )}
      >
        {#each contextOptions as option}
          <option value={option.id}>{option.label}</option>
        {/each}
      </select>
    </label>
    <fieldset class="branch-scope-editor">
      <legend>사용 지점</legend>
      <div class="branch-scope-options">
        {#each branchOptions as branch}
          <label>
            <input
              type="checkbox"
              checked={newBranchScope[branch.id]}
              onchange={(event) =>
                onNewBranchScopeChange(branch.id, (event.target as HTMLInputElement).checked)}
            />
            <span>{branch.label}</span>
          </label>
        {/each}
      </div>
    </fieldset>
    <label>
      <span>제목</span>
      <input
        name="settings-new-title"
        value={newTitle}
        oninput={(event) => onNewTitleChange((event.target as HTMLInputElement).value)}
      />
    </label>
    <label>
      <span>내용</span>
      <textarea
        name="settings-new-body"
        value={newBody}
        oninput={(event) => onNewBodyChange((event.target as HTMLTextAreaElement).value)}
      ></textarea>
    </label>
    <div class="settings-actions">
      <button type="button" onclick={onAddCustomTemplate}>추가</button>
      <button class="secondary" type="button" onclick={onClearNewTemplateDraft}>비우기</button>
    </div>
    </div>
  </details>

  <section class="settings-danger-zone" aria-label="위험 작업">
    <div>
      <h3>초기화</h3>
    </div>
    <button type="button" onclick={onResetTemplateEdit}>
      <MaterialIcon name={isBuiltInTemplate(settingsTemplateId) ? "restart_alt" : "delete_forever"} size={18} />
      {isBuiltInTemplate(settingsTemplateId) ? "기본값" : "삭제"}
    </button>
  </section>
</section>

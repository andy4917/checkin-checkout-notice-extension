import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

type SurfaceContract = {
  surfaceId: string;
  title: string;
  menuPath: string[];
  ownerModules: string[];
  storageKeys: string[];
  actions: string[];
  expectedVisibleState: string;
  loadingState: string;
  emptyState: string;
  errorState: string;
  forbiddenResidue: string[];
  motionContract: string;
  overflowContract: string;
  backendVerification: string;
  smokeRequired: boolean;
  referenceFiles: string[];
};

const root = resolve(import.meta.dirname, "..");
const targetRoot = join(root, "docs", "product-surface-targets");

const commonForbidden = [
  "N/A",
  "YYYY.MM.DD",
  "HH:MM",
  "The Gangnan",
  "복사되었습니다",
  "저장된 데이터 손상이 발견되었습니다",
  "placeholder attribute",
  "fake business data",
];

const surfaces: SurfaceContract[] = [
  surface("home-root", "홈 루트", ["확장 열기"], ["src/catalog/menu-routing.ts", "src/ui/components/HomeView.svelte"], ["workAssistantState.lastBranchId"], ["그룹 진입", "하단 PMS/설정 진입"], "5개 업무 그룹과 하단 4개 작업이 보이고 지점 미선택 시 PMS 하단 작업만 비활성화된다.", "지점 적용 중 navigation lock만 적용한다.", "해당 없음", "공용 shell status에 실제 오류만 표시한다.", "home detail track uses shared motion tokens; root has no work animation.", "screen-stage/home viewport에서 horizontal overflow가 없어야 한다.", "backend 없음. 하단 PMS action은 지점 선택 전 호출되지 않는다.", true),
  surface("branch-picker-header-lock", "지점 선택 / 헤더 잠금", ["헤더 로고 버튼"], ["src/ui/components/ShellHeader.svelte", "src/config/branches.ts", "src/ui/side-panel-navigation-controller.svelte.ts"], ["workAssistantState.lastBranchId"], ["지점 popup 열기", "지점 선택 저장"], "로고와 날짜가 유지되고 popup에는 실제 branch option만 보인다.", "지점 저장 중 trigger는 disabled 되지만 로고 opacity/filter는 유지된다.", "지점 미선택 logo state", "저장 실패 시 공용 error status", "disabled logo must keep opacity 1; popup opens/closes without route jump.", "popup과 헤더가 viewport 밖으로 밀리지 않아야 한다.", "chrome.storage.local setLastBranchId 호출과 실패 상태를 검증한다.", true),
  surface("home-submenu-customer-guidance", "고객 안내문 하위 메뉴", ["홈", "고객 안내문"], ["src/catalog/menu-routing.ts", "src/ui/components/HomeView.svelte"], ["workAssistantState.ui.templateVariableValues"], ["언어 변경", "템플릿 복사"], "체크인/체크아웃/객실/요금 안내 항목과 언어 strip이 보인다.", "언어 변경 또는 복사 중 해당 버튼만 busy/disabled", "템플릿이 없을 때 업무 데이터처럼 보이지 않는 최소 empty", "필수 PMS/clipboard 실패 status", "forward/backward home track transform uses --sidepanel-motion-*.", "detail panel single scroll; labels must not clip.", "clipboard.writeText가 성공해야 copied state가 보인다.", true),
  surface("home-submenu-quick-replies", "빠른 문의 답변 하위 메뉴", ["홈", "빠른 문의 답변"], ["src/catalog/menu-routing.ts", "src/catalog/template-renderer.ts", "src/ui/components/HomeView.svelte"], ["workAssistantState.ui.templateVariableValues"], ["언어 변경", "문의 답변 복사"], "자주 쓰는 문의 유형과 copy action이 보인다.", "언어 변경 또는 복사 중 해당 버튼만 busy/disabled", "템플릿이 없을 때 최소 empty", "필수 수동값/clipboard 실패 status", "forward/backward home track transform uses --sidepanel-motion-*.", "accordion row와 copy button이 좁은 폭에서 겹치지 않는다.", "renderTemplate required value와 clipboard.writeText 결과를 검증한다.", true),
  surface("home-submenu-service-management", "고객 서비스 관리 하위 메뉴", ["홈", "고객 서비스 관리"], ["src/catalog/menu-routing.ts", "src/ui/components/HomeView.svelte"], [], ["세탁물/매지출/공항밴 진입"], "세탁물 관리, 매지출 관리, 공항밴 관리 3개 row가 보인다.", "해당 없음", "해당 없음", "해당 없음", "forward/backward home track transform uses --sidepanel-motion-*.", "3개 row가 single column에서 overflow 없이 보인다.", "backend 없음. 각 row가 WorkSurface route로 연결되는지 검증한다.", true),
  surface("home-submenu-work-management", "업무 관리 하위 메뉴", ["홈", "업무 관리"], ["src/catalog/menu-routing.ts", "src/ui/components/HomeView.svelte"], [], ["객실 정보 메모/NAVER-STATION/업무보고 진입"], "업무 관련 3개 row가 보이고 언어 strip/copy button이 없다.", "해당 없음", "해당 없음", "해당 없음", "forward/backward home track transform uses --sidepanel-motion-*.", "3개 row가 single column에서 overflow 없이 보인다.", "각 row가 owner WorkSurface로 연결되는지 검증한다.", true),
  surface("home-submenu-template-editor", "템플릿 / 양식 편집 하위 메뉴", ["홈", "템플릿 / 양식 편집"], ["src/catalog/menu-routing.ts", "src/ui/components/HomeView.svelte"], [], ["템플릿 편집 진입", "양식 편집 진입"], "템플릿 편집과 양식 편집 2개 row가 보인다.", "해당 없음", "해당 없음", "해당 없음", "forward/backward home track transform uses --sidepanel-motion-*.", "2개 row와 chevron이 잘리지 않는다.", "각 row가 settings owner surface로 연결되는지 검증한다.", true),
  surface("customer-guidance", "고객 안내문 템플릿 surface", ["홈", "고객 안내문", "템플릿 항목"], ["src/catalog/template-catalog.ts", "src/catalog/template-renderer.ts", "src/ui/components/WorkSurface.svelte"], ["workAssistantState.ui.templateVariableValues"], ["언어 선택", "입력값 저장", "복사"], "선택된 고객 안내 템플릿 그룹과 실제 copy action이 보인다.", "copy/write 중 버튼 disabled", "템플릿 목록 없음은 최소 empty로만 표현", "필수 PMS/수동값/clipboard 실패 status", "work surface uses data-view-motion direction animation.", "accordion/list/dock이 screen-stage 안에서만 scroll된다.", "renderTemplate와 clipboard.writeText success/failure를 검증한다.", false),
  surface("quick-reply", "빠른 문의 답변 surface", ["홈", "빠른 문의 답변", "템플릿 항목"], ["src/catalog/template-catalog.ts", "src/catalog/template-renderer.ts", "src/ui/components/WorkSurface.svelte"], ["workAssistantState.ui.templateVariableValues"], ["입력값 저장", "복사"], "문의 답변 템플릿과 필요한 수동 입력만 보인다.", "copy/write 중 버튼 disabled", "템플릿 목록 없음은 최소 empty로만 표현", "필수 수동값/clipboard 실패 status", "work surface uses data-view-motion direction animation.", "input panel과 copy action이 겹치지 않는다.", "renderTemplate와 clipboard.writeText success/failure를 검증한다.", false),
  surface("service-management", "고객 서비스 관리 route group", ["홈", "고객 서비스 관리"], ["src/catalog/menu-routing.ts"], [], ["세탁물/매지출/공항밴 route"], "하위 메뉴가 각 work owner surface로만 이동한다.", "해당 없음", "해당 없음", "해당 없음", "home submenu forward/back.", "row overflow 없음", "backend 없음.", false),
  surface("work-management", "업무 관리 route group", ["홈", "업무 관리"], ["src/catalog/menu-routing.ts"], [], ["객실 메모/OTA/업무보고 route"], "하위 메뉴가 각 업무 owner surface로만 이동한다.", "해당 없음", "해당 없음", "해당 없음", "home submenu forward/back.", "row overflow 없음", "backend 없음.", false),
  surface("template-form-editor-hub", "템플릿 / 양식 편집 route group", ["홈", "템플릿 / 양식 편집"], ["src/catalog/menu-routing.ts"], [], ["템플릿 설정", "양식 설정"], "편집용 두 row만 보인다.", "해당 없음", "해당 없음", "해당 없음", "home submenu forward/back.", "row overflow 없음", "backend 없음.", false),
  surface("settings-hub", "설정 hub", ["하단", "설정"], ["src/catalog/menu-routing.ts", "src/ui/components/WorkSurface.svelte"], [], ["템플릿 편집 진입", "양식 편집 진입"], "템플릿 편집과 양식 편집 row만 보인다.", "해당 없음", "설정 항목 없음 placeholder 금지", "해당 없음", "work surface uses data-view-motion direction animation.", "settings row가 viewport 폭 안에 들어온다.", "backend 없음.", true),
  surface("laundry-management", "세탁물 관리", ["홈", "고객 서비스 관리", "세탁물 관리"], ["src/application/laundry-records.ts", "src/laundry/storage.ts", "src/ui/components/WorkSurface.svelte"], ["laundryRecords:v1"], ["세탁물 추가", "세탁/건조/완료 이동", "삭제"], "진행 중, 세탁 예정, 완료 영역과 실제 추가 control이 보인다.", "storage write 중 action disabled", "count 0은 badge로만 보이고 fake room card는 만들지 않는다.", "storage/move 실패 status", "work surface uses data-view-motion direction animation.", "board/cards/dock이 horizontal overflow를 만들지 않는다.", "chrome.storage read/write와 move rule 실패를 검증한다.", true, ["새 폴더/세탁물 관리 screen.png"]),
  surface("sales-management", "매지출 관리", ["홈", "고객 서비스 관리", "매지출 관리"], ["src/application/sales-expense-form.ts", "src/catalog/template-renderer.ts", "src/ui/components/WorkSurface.svelte"], ["workAssistantState.ui.templateVariableValues"], ["금액 입력", "분류 선택", "상세 입력", "저장/복사"], "금액, 카테고리, 상세, 저장 action이 보인다.", "clipboard/write 중 action disabled", "새 지출 금액 0은 입력 초기값일 뿐 fake record가 아니다.", "필수값/clipboard 실패 status", "work surface uses data-view-motion direction animation.", "amount panel/category chips/detail panel이 clipped 되지 않는다.", "templateValues 저장과 clipboard.writeText를 검증한다.", true, ["새 폴더/매지출관리 screen.png"]),
  surface("airport-van-management", "공항밴 관리", ["홈", "고객 서비스 관리", "공항밴 관리"], ["src/application/airport-van-form.ts", "src/ui/components/WorkSurface.svelte"], ["workAssistantState.ui.airportVanFormValues"], ["픽업/샌딩 선택", "필드 입력", "업무/고객 문구 복사"], "route, 탑승/항공편/수하물/결제 control과 copy action이 보인다.", "copy/write 중 action disabled", "입력 전 필드는 비어 있고 placeholder value를 만들지 않는다.", "필수값/clipboard 실패 status", "work surface uses data-view-motion direction animation.", "field grid와 dock이 overflow 없이 scroll된다.", "form state 저장, renderAirportVanCopy, clipboard.writeText를 검증한다.", true, ["새 폴더/공항밴 관리 screen.png"]),
  surface("room-remark-memo", "객실 정보 메모", ["홈", "업무 관리", "객실 정보 메모"], ["src/application/wings-remark.ts", "src/domain/remarks.ts", "src/domain/room-context.ts", "src/ui/components/WorkSurface.svelte"], ["workAssistantState.ui.templateVariableValues"], ["객실 물품 수량 조정", "추가 리마크 입력", "WINGS 리마크 입력"], "객실 선택 상태, 물품 stepper, 추가 리마크, WINGS action이 보인다.", "WINGS write 중 action busy", "객실 미선택은 상태 badge로만 표시한다.", "WINGS tab/room/remark dependency 실패 status", "work surface uses data-view-motion direction animation.", "stepper와 dock이 clipped 되지 않는다.", "active tab remark read/write dependency success/failure를 검증한다.", true, ["새 폴더/객실 리마크 관리 screen.png"]),
  surface("ota-reservation-input", "NAVER / STATION 예약입력", ["홈", "업무 관리", "NAVER / STATION 예약입력"], ["src/application/ota-reservation-input.ts", "src/ota/*", "src/wings/reservation-draft.ts", "src/ui/components/WorkSurface.svelte"], [], ["예약정보 가져오기", "WINGS 입력"], "source segment, 추출 action, preview/result, WINGS 입력 action이 보인다.", "fetch/fill 중 action disabled", "preview 전에는 fake booking summary를 만들지 않는다.", "active tab/branch/WINGS dependency 실패 status", "work surface uses data-view-motion direction animation.", "preview card와 dock이 overflow 없이 보인다.", "active tab fetchPayload와 fillForm success/failure를 검증한다.", true, ["새 폴더/OTA 예약관리 screen.png"]),
  surface("work-report-template-list", "업무보고 양식", ["홈", "업무 관리", "업무보고 양식"], ["src/catalog/template-catalog.ts", "src/catalog/template-renderer.ts", "src/ui/components/WorkSurface.svelte"], ["workAssistantState.ui.templateVariableValues"], ["업무보고 템플릿 선택", "복사"], "업무보고 템플릿 accordion과 copy action이 보인다.", "copy/write 중 action disabled", "템플릿 목록 없음은 최소 empty로만 표현", "필수값/clipboard 실패 status", "work surface uses data-view-motion direction animation.", "accordion rows가 clipped 되지 않는다.", "renderTemplate와 clipboard.writeText를 검증한다.", true, ["새 폴더/업무보고 설정 screen.png"]),
  surface("pms-checkin-list", "체크인 목록", ["하단", "체크인 목록"], ["src/application/sync-guests.ts", "src/pms/client.ts", "src/ui/components/PmsGuestPanel.svelte"], ["workAssistantState.lastBranchId"], ["PMS 조회", "검색", "객실 선택"], "체크인 PMS 목록 또는 명확한 실패/빈 상태가 보인다.", "PMS 조회 중", "현재 등록된 PMS 기록 없음", "PMS 조회 실패와 운영 메시지", "pms panel uses data-view-motion direction animation.", "record rows/search가 horizontal overflow 없이 보인다.", "fetch credentials include POST와 failure path를 검증한다.", true),
  surface("pms-checkout-list", "체크아웃 목록", ["하단", "체크아웃 목록"], ["src/application/sync-guests.ts", "src/pms/client.ts", "src/ui/components/PmsGuestPanel.svelte"], ["workAssistantState.lastBranchId"], ["PMS 조회", "검색", "객실 선택"], "체크아웃 PMS 목록 또는 명확한 실패/빈 상태가 보인다.", "PMS 조회 중", "현재 등록된 PMS 기록 없음", "PMS 조회 실패와 운영 메시지", "pms panel uses data-view-motion direction animation.", "record rows/search가 horizontal overflow 없이 보인다.", "fetch credentials include POST와 departure filter를 검증한다.", true),
  surface("pms-room-select", "객실 선택", ["하단", "객실 선택"], ["src/application/sync-guests.ts", "src/domain/room-context.ts", "src/ui/components/PmsGuestPanel.svelte"], ["workAssistantState.lastBranchId"], ["PMS 조회", "객실 선택", "업무 template 값 반영"], "객실 선택용 PMS 목록 또는 명확한 실패/빈 상태가 보인다.", "PMS 조회 중", "현재 등록된 PMS 기록 없음", "PMS 조회 실패와 운영 메시지", "pms panel uses data-view-motion direction animation.", "record rows/search가 horizontal overflow 없이 보인다.", "selected record가 room context/templateValues에 반영되는지 검증한다.", true),
  surface("template-settings", "템플릿 설정", ["설정", "템플릿 편집"], ["src/application/template-settings.ts", "src/platform/storage-schema.ts", "src/ui/components/WorkSurface.svelte"], ["workAssistantState.templateOverrides", "workAssistantState.customTemplates"], ["초기화 armed", "초기화 실행"], "템플릿 설정 초기화 action과 armed warning만 보인다.", "storage write 중 action disabled", "해당 없음", "storage write/schema 실패 status", "work surface uses data-view-motion direction animation.", "danger action이 clipped 되지 않는다.", "resetAllTemplateSettings와 writeState success/failure를 검증한다.", true, ["새 폴더/탬플릿 설정 세팅 screen.png"]),
  surface("form-settings", "양식 설정", ["설정", "양식 편집"], ["src/catalog/template-catalog.ts", "src/ui/components/WorkSurface.svelte", "src/platform/storage-schema.ts"], ["workAssistantState.ui.templateVariableValues"], ["필수 입력값 수정"], "필수 manual variable field만 보인다.", "storage write 중 field/action disabled", "필수 입력값이 없으면 fake field를 만들지 않는다.", "storage write/schema 실패 status", "work surface uses data-view-motion direction animation.", "input grid가 horizontal overflow 없이 보인다.", "setTemplateVariableValue와 writeState를 검증한다.", true, ["새 폴더/탬플릿 설정 세팅 screen.png"]),
  surface("storage-recovery", "저장소 복구 / migration", ["app mount"], ["src/platform/chrome-storage.ts", "src/platform/storage-schema.ts", "src/ui/side-panel-navigation-controller.svelte.ts"], ["workAssistantState"], ["schema mismatch normalize/save", "unrecoverable failure 표시"], "복구 가능한 mismatch는 조용히 기본 state로 저장되고 붉은 복구 배너를 보이지 않는다.", "mount 중", "DEFAULT_EXTENSION_STATE", "실제 storage read/write 실패만 actionable error", "mount should not force route motion.", "shell status가 layout overflow를 만들지 않는다.", "readExtensionStateWithRecovery recovered=true와 write failure를 검증한다.", false),
];

function surface(
  surfaceId: string,
  title: string,
  menuPath: string[],
  ownerModules: string[],
  storageKeys: string[],
  actions: string[],
  expectedVisibleState: string,
  loadingState: string,
  emptyState: string,
  errorState: string,
  motionContract: string,
  overflowContract: string,
  backendVerification: string,
  smokeRequired: boolean,
  referenceFiles: string[] = [],
): SurfaceContract {
  return {
    surfaceId,
    title,
    menuPath,
    ownerModules,
    storageKeys,
    actions,
    expectedVisibleState,
    loadingState,
    emptyState,
    errorState,
    forbiddenResidue: commonForbidden,
    motionContract,
    overflowContract,
    backendVerification,
    smokeRequired,
    referenceFiles,
  };
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function targetSvg(contract: SurfaceContract): string {
  const lines = [
    `Path: ${contract.menuPath.join(" > ")}`,
    `Visible: ${contract.expectedVisibleState}`,
    `Actions: ${contract.actions.join(", ") || "none"}`,
    `Loading: ${contract.loadingState}`,
    `Empty: ${contract.emptyState}`,
    `Error: ${contract.errorState}`,
    `Motion: ${contract.motionContract}`,
    `Overflow: ${contract.overflowContract}`,
    `Backend: ${contract.backendVerification}`,
    `Forbidden: ${contract.forbiddenResidue.join(", ")}`,
  ];
  const text = lines
    .map((line, index) => `<text x="34" y="${120 + index * 34}" class="body">${escapeXml(line)}</text>`)
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="620" viewBox="0 0 720 620" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(contract.title)}</title>
  <desc id="desc">${escapeXml(contract.expectedVisibleState)}</desc>
  <style>
    .frame { fill: #fbfbfa; stroke: #111; stroke-width: 2; }
    .header { fill: #fff; stroke: #dedede; }
    .panel { fill: #fff; stroke: #e4e4e2; stroke-width: 1.5; }
    .primary { fill: #111; }
    .body { font: 18px Arial, sans-serif; fill: #1b1f23; }
    .title { font: 700 30px Arial, sans-serif; fill: #111; }
    .meta { font: 15px Arial, sans-serif; fill: #687076; }
    .button { font: 700 18px Arial, sans-serif; fill: #fff; }
  </style>
  <rect x="1" y="1" width="718" height="618" rx="28" class="frame"/>
  <rect x="24" y="24" width="672" height="78" rx="14" class="header"/>
  <text x="48" y="72" class="title">${escapeXml(contract.title)}</text>
  <text x="520" y="72" class="meta">UH SUITE / 2026.06.04</text>
  <rect x="24" y="122" width="672" height="360" rx="16" class="panel"/>
${text}
  <rect x="34" y="510" width="652" height="58" rx="12" class="primary"/>
  <text x="58" y="546" class="button">${escapeXml(contract.actions[0] || "검증")}</text>
</svg>
`;
}

function notes(contract: SurfaceContract): string {
  const refs = contract.referenceFiles.length > 0 ? contract.referenceFiles.map((file) => `- ${file}`).join("\n") : "- no direct positive reference file; use repo contract and user negative screenshots.";
  return `# ${contract.title}

## Reference Files

${refs}

## Intent

${contract.expectedVisibleState}

## Failure Signals

- ${contract.forbiddenResidue.join("\n- ")}

## Verification

${contract.backendVerification}
`;
}

function inventoryMarkdown(): string {
  const rows = surfaces
    .map((item) =>
      `| \`${item.surfaceId}\` | ${item.title} | ${item.menuPath.join(" > ")} | ${item.ownerModules.join(", ")} | ${item.storageKeys.join(", ") || "-"} | ${item.actions.join(", ") || "-"} | ${item.expectedVisibleState} | ${item.loadingState} | ${item.emptyState} | ${item.errorState} | ${item.motionContract} | ${item.overflowContract} | ${item.backendVerification} | ${item.smokeRequired ? "yes" : "no"} |`,
    )
    .join("\n");
  return `# Product Surface Inventory

This inventory is generated from the current catalog, UI component, application/domain owner, and Chrome extension contract sources. User problem screenshots are negative references; the ZIP reference images are positive visual direction only for the matching named surfaces.

| surfaceId | 화면명 | 접근 경로 | owner modules | storage keys | 주요 actions | expected visible state | loading state | empty state | error state | motion contract | overflow contract | backend verification | smoke |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
${rows}
`;
}

mkdirSync(targetRoot, { recursive: true });
writeFileSync(join(root, "docs", "product-surface-inventory.md"), inventoryMarkdown());

for (const contract of surfaces) {
  const dir = join(targetRoot, contract.surfaceId);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "contract.json"), `${JSON.stringify(contract, null, 2)}\n`);
  writeFileSync(join(dir, "target.svg"), targetSvg(contract));
  writeFileSync(join(dir, "notes.md"), notes(contract));
}

console.log(`Wrote ${surfaces.length} product surface targets to ${targetRoot}`);

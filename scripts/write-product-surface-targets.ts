import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

type SurfaceGroup =
  | "home"
  | "customer-guidance"
  | "quick-reply"
  | "service-management"
  | "work-management"
  | "template-form-editor";

type BackendContract = {
  owners: string[];
  boundary: string;
  successEvidence: string;
  failureEvidence: string;
};

type VerticalAnchoringInvariant = {
  coordinateSpace: string;
  tolerancePx: number;
  requiredMeasurements: string[];
  failureSignals: string[];
};

type SurfaceContract = {
  surfaceId: string;
  order: number;
  title: string;
  group: SurfaceGroup;
  menuPath: string[];
  catalogEvidence: string[];
  ownerModules: string[];
  storageKeys: string[];
  primaryActions: string[];
  expectedVisibleState: string;
  loadingState: string;
  emptyState: string;
  errorState: string;
  statusPolicy: string;
  hiddenSurfacePolicy: string;
  backendContract: BackendContract;
  prohibitedVisibleText: string[];
  prohibitedStatusText: string[];
  prohibitedPlaceholders: string[];
  fixedShellContract: string;
  motionContract: string;
  overflowContract: string;
  verticalAnchoringInvariant: VerticalAnchoringInvariant;
  expectedImagePath: string;
  imageGenerationStatus: "expectedImagePresent";
  smokeCoverage: {
    required: true;
    accessPath: string[];
    assertions: string[];
  };
};

type SurfaceDefinition = Omit<
  SurfaceContract,
  | "verticalAnchoringInvariant"
  | "expectedImagePath"
  | "imageGenerationStatus"
  | "prohibitedVisibleText"
  | "prohibitedStatusText"
  | "prohibitedPlaceholders"
> & {
  visualRows: string[];
  visualControls: string[];
};

const root = resolve(import.meta.dirname, "..");
const docsRoot = join(root, "docs");
const targetRoot = join(docsRoot, "product-surface-targets");
const inventoryPath = join(docsRoot, "product-surface-inventory.md");

const prohibitedVisibleText = [
  "N/A",
  "YYYY.MM.DD",
  "HH:MM",
  "The Gangnan",
  "복사되었습니다",
  "저장된 데이터 손상이 발견되었습니다",
  "현재 설정 항목 없음",
];

const prohibitedStatusText = [
  "세탁물을 추가했습니다",
  "진행상태를 기록했습니다",
  "객실을 선택했습니다",
  "템플릿 설정을 초기화했습니다",
  "템플릿을 저장했습니다",
  "저장소를 불러오지 못했습니다",
  "지점을 선택하여주십시오",
];

const prohibitedPlaceholders = [
  "visible placeholder attribute",
  "sample guest, room, branch, reservation, amount, or hotel value",
  "success text without a successful owner boundary",
  "WINGS login requirement text",
  "fake PMS record",
];

const verticalAnchoringInvariant: VerticalAnchoringInvariant = {
  coordinateSpace: "Actual Google Chrome side panel .app-shell coordinate space, not an extension URL tab viewport.",
  tolerancePx: 2,
  requiredMeasurements: [
    "non-fullscreen problem-state real Chrome side panel capture",
    "fullscreen normal-state real Chrome side panel capture",
    "tab-switch or side-panel-reopen real Chrome side panel capture",
    "window.innerHeight",
    "window.visualViewport.height",
    "document.documentElement.clientHeight",
    "matchMedia('(max-height: 640px)').matches",
    "matchMedia('(max-height: 500px)').matches",
    ".app-shell bounding rect",
    ".screen-stage bounding rect",
    ".home-surface or .work-surface bounding rect",
    ".root-panel or first primary control bounding rect",
    ".home-fixed-bottom-bar bounding rect",
  ],
  failureSignals: [
    "same surface card top changes across Chrome tab/window state",
    "same surface menu block top changes across Chrome tab/window state",
    "footer overlaps central surface",
    "extension URL tab viewport evidence is used as release proof without real side-panel evidence",
    "fullscreen-only evidence is used as release proof for the non-fullscreen side-panel failure",
  ],
};

const fixedShellContract =
  "400px Chrome side panel width, fixed full-opacity header, one central surface, fixed footer. Header, first content row, and footer top keep stable app-shell-relative coordinates across Chrome tab/window state.";
const defaultHiddenSurfacePolicy =
  "Catalog-owned product surface rows remain visible and reachable regardless of backing data availability; component-local filtering must not hide 구조.md surfaces.";

const homeOwner = ["src/catalog/menu-routing.ts", "src/ui/components/HomeView.svelte", "src/catalog/template-renderer.ts"];
const workOwner = ["src/catalog/menu-routing.ts", "src/ui/components/WorkSurface.svelte"];

const surfaces: SurfaceDefinition[] = [
  surface({
    order: 1,
    surfaceId: "home",
    title: "홈",
    group: "home",
    menuPath: ["홈"],
    catalogEvidence: ["homeNavigationGroups", "homeBottomNavigationItems"],
    ownerModules: ["src/catalog/menu-routing.ts", "src/ui/components/HomeView.svelte", "src/ui/components/SidePanelView.svelte"],
    storageKeys: ["workAssistantState.lastBranchId"],
    primaryActions: ["고객 안내문", "빠른 문의 답변", "고객 서비스 관리", "업무 관리", "템플릿 / 양식 편집"],
    expectedVisibleState: "5개 업무 그룹과 하단 체크인/체크아웃/객실 선택/설정 바가 한 화면 구조로 고정된다.",
    loadingState: "지점 변경 중에도 로고와 홈 row 좌표는 흔들리지 않는다.",
    emptyState: "홈은 비어 있는 상태를 만들지 않는다.",
    errorState: "홈 shell에는 OTA/WINGS 의존 안내가 아닌 일반 성공/오류 status를 띄우지 않는다.",
    statusPolicy: "No general save/copy/laundry/template/airport-van/room-select status text.",
    hiddenSurfacePolicy: defaultHiddenSurfacePolicy,
    backendContract: backend(["src/catalog/menu-routing.ts"], "catalog navigation only", "visible rows match 구조.md", "unknown route remains a catalog error"),
    fixedShellContract,
    motionContract: "Root home has no work-surface enter animation; submenu track motion uses catalog-driven direction only.",
    overflowContract: "Home root row block does not create horizontal overflow or footer overlap.",
    visualRows: ["고객 안내문", "빠른 문의 답변", "고객 서비스 관리", "업무 관리", "템플릿 / 양식 편집"],
    visualControls: ["지점 선택", "날짜", "하단 4개 메뉴"],
    smokeCoverage: smoke(["open side panel"], ["home rows exact 5", "vertical anchoring measured twice in real Chrome side panel"]),
  }),
  templateSurface(2, "customer-checkin-notice", "고객 안내문", "체크인 안내문", ["arrival_notice", "prearrival_csm", "prestay_notice", "self_checkin", "early_checkin"]),
  templateSurface(3, "customer-checkout-notice", "고객 안내문", "체크아웃 안내문", ["cleaning_notice"]),
  templateSurface(4, "customer-room-notice", "고객 안내문", "객실 관련 안내문", ["room_upgrade", "room_upgrade_closed", "card_key", "laundry_complete", "partner_service"]),
  templateSurface(5, "customer-fee-notice", "고객 안내문", "각종 요금 관련 안내문", ["parking", "airport_van", "room_sales", "dodine_sales"]),
  quickSurface(6, "quick-rental-reply", "물품 대여 문의", "rental_item"),
  quickSurface(7, "quick-lost-item-reply", "분실물 문의", "lost_item"),
  quickSurface(8, "quick-room-visit-reply", "객실 방문 예정", "room_visit"),
  surface({
    order: 9,
    surfaceId: "laundry-management",
    title: "세탁물 관리",
    group: "service-management",
    menuPath: ["홈", "고객 서비스 관리", "세탁물 관리"],
    catalogEvidence: ["homeNavigationGroups.service-management.service-laundry"],
    ownerModules: ["src/application/laundry-records.ts", "src/laundry/storage.ts", ...workOwner],
    storageKeys: ["laundryRecords:v1"],
    primaryActions: ["세탁물 추가", "세탁기", "건조기", "완료"],
    expectedVisibleState: "세탁 진행/예정/완료 상태와 추가 입력 control이 보인다.",
    loadingState: "storage write 중 관련 action만 disabled.",
    emptyState: "0 count badge는 가능하지만 가짜 객실 row는 만들지 않는다.",
    errorState: "일반 세탁 성공/오류 문구를 shell status에 띄우지 않는다.",
    statusPolicy: "Laundry owner state changes are visible in board state only; no general status text.",
    hiddenSurfacePolicy: defaultHiddenSurfacePolicy,
    backendContract: backend(["src/application/laundry-records.ts", "src/laundry/storage.ts"], "chrome.storage laundry state", "record appears or moves in board state", "real storage failure is test evidence, not shell success copy"),
    fixedShellContract,
    motionContract: "Work surface enters through data-view-motion contract.",
    overflowContract: "Laundry columns scroll inside central surface and never overlap footer.",
    visualRows: ["진행 중", "세탁물 추가", "세탁 예정", "완료"],
    visualControls: ["객실 입력", "상태 이동", "제거"],
    smokeCoverage: smoke(["고객 서비스 관리", "세탁물 관리"], ["board visible", "no general laundry status text", "no footer overlap"]),
  }),
  surface({
    order: 10,
    surfaceId: "sales-management",
    title: "매지출 관리",
    group: "service-management",
    menuPath: ["홈", "고객 서비스 관리", "매지출 관리"],
    catalogEvidence: ["homeNavigationGroups.service-management.service-sales"],
    ownerModules: ["src/application/sales-expense-form.ts", "src/catalog/template-renderer.ts", ...workOwner],
    storageKeys: ["workAssistantState.ui.branchFormValues"],
    primaryActions: ["금액 입력", "카테고리", "상세", "매지출 보고 복사"],
    expectedVisibleState: "금액, 카테고리, 상세, 보고 복사 action이 첫 화면에 정렬된다.",
    loadingState: "copy/write 중 action만 disabled.",
    emptyState: "금액 0은 입력 초기값이며 가짜 매출 기록을 만들지 않는다.",
    errorState: "일반 매지출 저장/복사 성공·오류 문구를 shell status에 띄우지 않는다.",
    statusPolicy: "Sales copy/storage feedback stays off shell status unless an OTA/WINGS dependency is involved.",
    hiddenSurfacePolicy: defaultHiddenSurfacePolicy,
    backendContract: backend(["src/application/sales-expense-form.ts", "src/catalog/template-renderer.ts"], "template value and clipboard boundary", "clipboard write receives rendered report", "required values or clipboard failure do not become fake success"),
    fixedShellContract,
    motionContract: "Work surface enters through data-view-motion contract.",
    overflowContract: "Amount panel and category chips fit before footer without horizontal overflow.",
    visualRows: ["금액 입력", "카테고리", "소모품", "수리", "식음료", "기타"],
    visualControls: ["상세 입력", "보고 복사"],
    smokeCoverage: smoke(["고객 서비스 관리", "매지출 관리"], ["category chips visible before scroll", "no general sales status text"]),
  }),
  surface({
    order: 11,
    surfaceId: "airport-van-management",
    title: "공항밴 관리",
    group: "service-management",
    menuPath: ["홈", "고객 서비스 관리", "공항밴 관리"],
    catalogEvidence: ["homeNavigationGroups.service-management.service-airport-van"],
    ownerModules: ["src/application/airport-van-form.ts", ...workOwner],
    storageKeys: ["workAssistantState.ui.branchFormValues"],
    primaryActions: ["픽업", "샌딩", "업무 기록 복사", "고객 전달 복사"],
    expectedVisibleState: "공항밴 이동 경로, 탑승/항공편/수하물/결제 control과 복사 action이 보인다.",
    loadingState: "copy/write 중 action만 disabled.",
    emptyState: "입력 전 필드는 값이 비어 있어야 하며 가짜 값으로 채우지 않는다.",
    errorState: "일반 공항밴 저장/복사 성공·오류 문구를 shell status에 띄우지 않는다.",
    statusPolicy: "Airport-van form feedback is local control state only; no general shell status text.",
    hiddenSurfacePolicy: defaultHiddenSurfacePolicy,
    backendContract: backend(["src/application/airport-van-form.ts"], "stored form and clipboard boundary", "clipboard write receives rendered airport-van text", "missing required fields do not become fake success"),
    fixedShellContract,
    motionContract: "Work surface enters through data-view-motion contract.",
    overflowContract: "Field groups scroll inside central surface and do not collide with footer.",
    visualRows: ["픽업", "샌딩", "이동 경로", "탑승 정보", "항공편 정보", "결제수단"],
    visualControls: ["업무 기록 복사", "고객 전달 복사"],
    smokeCoverage: smoke(["고객 서비스 관리", "공항밴 관리"], ["route controls visible", "no general airport-van status text"]),
  }),
  surface({
    order: 12,
    surfaceId: "room-remark",
    title: "객실 정보 리마크",
    group: "work-management",
    menuPath: ["홈", "업무 관리", "객실 정보 리마크"],
    catalogEvidence: ["homeNavigationGroups.work-management.work-room-remark"],
    ownerModules: ["src/application/wings-remark.ts", "src/domain/remarks.ts", "src/domain/room-context.ts", ...workOwner],
    storageKeys: ["workAssistantState.ui.branchFormValues"],
    primaryActions: ["제공 카드키", "대여물품", "추가 리마크", "WINGS 리마크 입력"],
    expectedVisibleState: "객실 선택 상태, 물품 stepper, 추가 리마크, WINGS 입력 action이 보인다.",
    loadingState: "WINGS write 중 관련 action busy.",
    emptyState: "객실 미선택은 상태 badge로만 표시하고 fake room data를 만들지 않는다.",
    errorState: "WINGS 객실 정보창/리마크 의존 실패 안내만 shell status에 허용된다.",
    statusPolicy: "Only WINGS dependency notices are allowed for this surface.",
    hiddenSurfacePolicy: defaultHiddenSurfacePolicy,
    backendContract: backend(["src/application/wings-remark.ts", "src/domain/remarks.ts"], "active WINGS remark read/upsert/write", "remark line is written to WINGS room info", "missing WINGS room information window remains a failure state"),
    fixedShellContract,
    motionContract: "Work surface enters through data-view-motion contract.",
    overflowContract: "Stepper controls and WINGS action remain above footer or scroll inside central surface.",
    visualRows: ["객실 선택", "제공 카드키", "대여물품", "추가 리마크", "WINGS 리마크 입력"],
    visualControls: ["수량 조절", "리마크 입력"],
    smokeCoverage: smoke(["업무 관리", "객실 정보 리마크"], ["room context state visible", "WINGS dependency failure captured when unavailable"]),
  }),
  surface({
    order: 13,
    surfaceId: "ota-reservation-input",
    title: "NAVER / STATION 예약입력",
    group: "work-management",
    menuPath: ["홈", "업무 관리", "NAVER / STATION 예약입력"],
    catalogEvidence: ["homeNavigationGroups.work-management.work-ota"],
    ownerModules: ["src/application/ota-reservation-input.ts", "src/ota/*", "src/wings/reservation-draft.ts", ...workOwner],
    storageKeys: [],
    primaryActions: ["예약정보 가져오기", "WINGS 입력"],
    expectedVisibleState: "NAVER/STATION source, 예약정보 가져오기, 실제 preview, WINGS 입력 action이 보인다.",
    loadingState: "active tab extraction or WINGS fill 중 action disabled.",
    emptyState: "preview 전에는 예약 요약 가짜 값을 만들지 않는다.",
    errorState: "OTA active tab, branch mismatch, WINGS reservation window dependency 안내만 허용된다.",
    statusPolicy: "OTA/WINGS dependency notices are allowed; generic success text is not.",
    hiddenSurfacePolicy: defaultHiddenSurfacePolicy,
    backendContract: backend(["src/application/ota-reservation-input.ts", "src/ota/*", "src/wings/reservation-draft.ts"], "active tab OTA extraction and WINGS fill", "normalized preview fills WINGS fields", "missing OTA/WINGS dependency remains visible failure"),
    fixedShellContract,
    motionContract: "Work surface enters through data-view-motion contract.",
    overflowContract: "Preview area and WINGS action scroll inside central surface without footer overlap.",
    visualRows: ["NAVER", "STATION", "예약정보 가져오기", "추출된 예약정보", "WINGS 입력"],
    visualControls: ["source segment", "preview rows"],
    smokeCoverage: smoke(["업무 관리", "NAVER / STATION 예약입력"], ["OTA controls visible", "OTA/WINGS failure is not hidden"]),
  }),
  surface({
    order: 14,
    surfaceId: "work-report-form",
    title: "업무보고 양식",
    group: "work-management",
    menuPath: ["홈", "업무 관리", "업무보고 양식"],
    catalogEvidence: ["homeNavigationGroups.work-management.work-report"],
    ownerModules: ["src/catalog/template-catalog.ts", "src/catalog/template-renderer.ts", ...workOwner],
    storageKeys: ["workAssistantState.ui.branchFormValues"],
    primaryActions: ["업무보고 템플릿 선택", "복사"],
    expectedVisibleState: "업무보고 템플릿 목록과 복사 action이 compact list로 보인다.",
    loadingState: "copy/write 중 action만 disabled.",
    emptyState: "템플릿 목록 없음은 최소 상태로만 표현하고 업무 데이터처럼 보이지 않는다.",
    errorState: "일반 업무보고 복사 성공·오류 문구를 shell status에 띄우지 않는다.",
    statusPolicy: "Work-report clipboard feedback stays on control state only.",
    hiddenSurfacePolicy: defaultHiddenSurfacePolicy,
    backendContract: backend(["src/catalog/template-catalog.ts", "src/catalog/template-renderer.ts"], "template render and clipboard boundary", "clipboard write receives rendered report", "required values or clipboard failure do not become fake success"),
    fixedShellContract,
    motionContract: "Work surface enters through data-view-motion contract.",
    overflowContract: "Template rows and copy action fit inside central surface.",
    visualRows: ["업무 양식", "주야간 업무 보고", "일일업무 보고", "공항밴 예약보고"],
    visualControls: ["복사 action"],
    smokeCoverage: smoke(["업무 관리", "업무보고 양식"], ["work report rows visible", "no general copy status text"]),
  }),
  surface({
    order: 15,
    surfaceId: "notice-reply-editor",
    title: "안내문 편집 / 빠른답변 편집",
    group: "template-form-editor",
    menuPath: ["홈", "템플릿 / 양식 편집", "안내문 편집 / 빠른답변 편집"],
    catalogEvidence: ["homeNavigationGroups.template-editor.template-edit", "templateEditorMenu"],
    ownerModules: ["src/application/template-settings.ts", "src/platform/storage-schema.ts", ...workOwner],
    storageKeys: ["workAssistantState.templateOverrides", "workAssistantState.customTemplates"],
    primaryActions: ["템플릿 선택", "언어 선택", "저장하기", "초기화"],
    expectedVisibleState: "안내문/빠른답변 템플릿 선택, 언어, 제목, 본문 편집 controls가 보인다.",
    loadingState: "storage write 중 save/reset action만 disabled.",
    emptyState: "템플릿이 없으면 최소 상태만 표시한다.",
    errorState: "일반 저장 성공/오류 문구를 shell status에 띄우지 않는다.",
    statusPolicy: "Template save/reset feedback must not use shell status text.",
    hiddenSurfacePolicy: defaultHiddenSurfacePolicy,
    backendContract: backend(["src/application/template-settings.ts", "src/platform/storage-schema.ts"], "template override storage", "valid override is persisted", "schema/storage failure remains failure evidence without success copy"),
    fixedShellContract,
    motionContract: "Work surface enters through data-view-motion contract.",
    overflowContract: "Editor fields scroll inside central surface and save action does not overlap footer.",
    visualRows: ["템플릿", "템플릿 언어", "제목", "본문", "저장하기"],
    visualControls: ["활성 템플릿", "초기화"],
    smokeCoverage: smoke(["템플릿 / 양식 편집", "안내문 편집 / 빠른답변 편집"], ["editor controls visible", "no general save status text"]),
  }),
  surface({
    order: 16,
    surfaceId: "work-form-editor",
    title: "업무 양식 편집",
    group: "template-form-editor",
    menuPath: ["홈", "템플릿 / 양식 편집", "업무 양식 편집"],
    catalogEvidence: ["homeNavigationGroups.template-editor.form-edit", "formEditorMenu"],
    ownerModules: ["src/catalog/template-catalog.ts", "src/platform/storage-schema.ts", ...workOwner],
    storageKeys: ["workAssistantState.ui.branchFormValues"],
    primaryActions: ["필수 입력값", "필수 입력값 수정"],
    expectedVisibleState: "업무 양식의 수동 입력값 controls만 보이고 가짜 필드를 만들지 않는다.",
    loadingState: "storage write 중 해당 input만 disabled.",
    emptyState: "필수 입력값이 없으면 최소 상태만 표시한다.",
    errorState: "일반 저장 성공/오류 문구를 shell status에 띄우지 않는다.",
    statusPolicy: "Form value persistence feedback must not use shell status text.",
    hiddenSurfacePolicy: defaultHiddenSurfacePolicy,
    backendContract: backend(["src/catalog/template-catalog.ts", "src/platform/storage-schema.ts"], "manual variable storage", "valid input value is persisted", "schema/storage failure remains failure evidence without success copy"),
    fixedShellContract,
    motionContract: "Work surface enters through data-view-motion contract.",
    overflowContract: "Input rows fit inside central surface without footer overlap.",
    visualRows: ["필수 입력값", "체크인 시간", "체크아웃 시간"],
    visualControls: ["입력값 수정"],
    smokeCoverage: smoke(["템플릿 / 양식 편집", "업무 양식 편집"], ["form editor controls visible", "no general save status text"]),
  }),
];

function surface(definition: SurfaceDefinition): SurfaceDefinition {
  return definition;
}

function templateSurface(order: number, surfaceId: string, groupTitle: "고객 안내문", title: string, templateTypes: string[]): SurfaceDefinition {
  return surface({
    order,
    surfaceId,
    title,
    group: "customer-guidance",
    menuPath: ["홈", groupTitle, title],
    catalogEvidence: [`homeNavigationGroups.customer-guidance.${surfaceId}`, `templateFilter:${templateTypes.join(",")}`],
    ownerModules: homeOwner,
    storageKeys: ["workAssistantState.ui.branchFormValues"],
    primaryActions: ["언어 선택", "템플릿 복사"],
    expectedVisibleState: `${title} 템플릿 row와 icon-only copy control이 보인다.`,
    loadingState: "language/copy action만 disabled.",
    emptyState: "템플릿 없음은 최소 상태로만 표현한다.",
    errorState: "일반 복사 성공/오류 문구를 shell status에 띄우지 않는다.",
    statusPolicy: "Customer guidance copy feedback stays on the button state only.",
    hiddenSurfacePolicy: "Customer guidance leaves are 16-surface product surfaces. Missing templates must produce an owner-defined empty state and must not remove the catalog row in HomeView.",
    backendContract: backend(["src/catalog/template-renderer.ts", "navigator.clipboard"], "template render and clipboard boundary", "clipboard write receives rendered customer guidance text", "required value or clipboard failure does not become fake success"),
    fixedShellContract,
    motionContract: "Home detail track uses forward/backward motion; selected leaf keeps stable first-row anchoring.",
    overflowContract: "Template rows scroll inside the detail panel and do not push the footer.",
    visualRows: [title, ...templateTypes.slice(0, 4).map((type) => type.replaceAll("_", " "))],
    visualControls: ["KR", "EN", "JP", "CH", "copy buttons"],
    smokeCoverage: smoke([groupTitle, title], [`${title} visible`, "copy controls scoped to selected surface", "no general copy status text"]),
  });
}

function quickSurface(order: number, surfaceId: string, title: string, templateType: string): SurfaceDefinition {
  return surface({
    order,
    surfaceId,
    title,
    group: "quick-reply",
    menuPath: ["홈", "빠른 문의 답변", title],
    catalogEvidence: [`homeNavigationGroups.quick-replies.${surfaceId}`, `templateFilter:${templateType}`],
    ownerModules: homeOwner,
    storageKeys: ["workAssistantState.ui.branchFormValues"],
    primaryActions: ["언어 선택", "빠른답변 복사"],
    expectedVisibleState: `${title} 빠른답변 row와 icon-only copy control이 보인다.`,
    loadingState: "language/copy action만 disabled.",
    emptyState: "템플릿 없음은 최소 상태로만 표현한다.",
    errorState: "일반 복사 성공/오류 문구를 shell status에 띄우지 않는다.",
    statusPolicy: "Quick reply copy feedback stays on the button state only.",
    hiddenSurfacePolicy: "Quick reply leaves are 16-surface product surfaces. Missing templates must produce an owner-defined empty state and must not remove the catalog row in HomeView.",
    backendContract: backend(["src/catalog/template-renderer.ts", "navigator.clipboard"], "template render and clipboard boundary", "clipboard write receives rendered quick-reply text", "required value or clipboard failure does not become fake success"),
    fixedShellContract,
    motionContract: "Home detail track uses forward/backward motion; selected leaf keeps stable first-row anchoring.",
    overflowContract: "Quick-reply rows scroll inside the detail panel and do not push the footer.",
    visualRows: [title, templateType.replaceAll("_", " ")],
    visualControls: ["KR", "EN", "JP", "CH", "copy buttons"],
    smokeCoverage: smoke(["빠른 문의 답변", title], [`${title} visible`, "only three quick-reply leaves exist", "no general copy status text"]),
  });
}

function backend(owners: string[], boundary: string, successEvidence: string, failureEvidence: string): BackendContract {
  return { owners, boundary, successEvidence, failureEvidence };
}

function smoke(accessPath: string[], assertions: string[]): SurfaceDefinition["smokeCoverage"] {
  return { required: true, accessPath, assertions };
}

function contractFor(definition: SurfaceDefinition): SurfaceContract {
  return {
    ...definition,
    expectedImagePath: `docs/product-surface-targets/${definition.surfaceId}/expected.png`,
    imageGenerationStatus: "expectedImagePresent",
    verticalAnchoringInvariant,
    prohibitedVisibleText,
    prohibitedStatusText,
    prohibitedPlaceholders,
  };
}

function writeTarget(definition: SurfaceDefinition): void {
  const contract = contractFor(definition);
  const surfaceDir = join(targetRoot, definition.surfaceId);
  mkdirSync(surfaceDir, { recursive: true });
  writeFileSync(join(surfaceDir, "contract.json"), `${JSON.stringify(contract, null, 2)}\n`);
  writeFileSync(join(surfaceDir, "target.svg"), renderSvg(definition));
  writeFileSync(join(surfaceDir, "notes.md"), renderNotes(contract));
}

function renderSvg(definition: SurfaceDefinition): string {
  const rows = definition.visualRows.slice(0, 7);
  const controls = definition.visualControls.slice(0, 5);
  const rowMarkup = rows.map((row, index) => {
    const y = 154 + index * 42;
    return `<g class="row" transform="translate(34 ${y})">
        <rect width="332" height="34" rx="4" fill="#ffffff" stroke="#d9dfe7"/>
        <text x="14" y="22" class="rowText">${escapeXml(row)}</text>
      </g>`;
  }).join("\n    ");
  const controlMarkup = controls.map((control, index) => {
    const x = 34 + (index % 2) * 170;
    const y = 480 + Math.floor(index / 2) * 38;
    return `<g class="control" transform="translate(${x} ${y})">
        <rect width="154" height="30" rx="4" fill="#eef3f8" stroke="#c8d2df"/>
        <text x="12" y="20" class="controlText">${escapeXml(control)}</text>
      </g>`;
  }).join("\n    ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="720" viewBox="0 0 400 720" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(definition.title)}</title>
  <desc id="desc">surfaceId: ${escapeXml(definition.surfaceId)}. 400px Chrome side panel target with fixed header, central surface, fixed footer, and vertical anchoring invariant.</desc>
  <style>
    .label{font:700 12px Arial,sans-serif;fill:#596373}
    .titleText{font:800 20px Arial,sans-serif;fill:#111827}
    .rowText{font:700 14px Arial,sans-serif;fill:#111827}
    .controlText{font:700 12px Arial,sans-serif;fill:#253044}
    .footerText{font:700 11px Arial,sans-serif;fill:#253044}
    .small{font:700 10px Arial,sans-serif;fill:#64748b}
  </style>
  <rect class="sidepanel" x="0" y="0" width="400" height="720" fill="#f6f8fb"/>
  <g class="header">
    <rect x="0" y="0" width="400" height="58" fill="#ffffff" stroke="#dbe1ea"/>
    <text x="24" y="35" class="titleText">UH SUITE</text>
    <text x="250" y="24" class="label">지점 선택</text>
    <text x="250" y="42" class="small">날짜</text>
  </g>
  <g class="surface">
    <rect x="24" y="76" width="352" height="560" rx="6" fill="#f8fafc" stroke="#dce3ec"/>
    <text x="34" y="112" class="label">${escapeXml(definition.menuPath.join(" > "))}</text>
    <text x="34" y="138" class="titleText">${escapeXml(definition.title)}</text>
    ${rowMarkup}
    ${controlMarkup}
    <text x="34" y="612" class="small">vertical anchoring invariant: app-shell relative top delta within 2px</text>
  </g>
  <g class="footer">
    <rect x="0" y="650" width="400" height="70" fill="#ffffff" stroke="#dbe1ea"/>
    ${["체크인 목록", "체크아웃 목록", "객실 선택", "설정"].map((label, index) => `<text x="${24 + index * 94}" y="690" class="footerText">${label}</text>`).join("")}
  </g>
</svg>
`;
}

function renderNotes(contract: SurfaceContract): string {
  return `# ${contract.title}

- surfaceId: \`${contract.surfaceId}\`
- menuPath: ${contract.menuPath.join(" > ")}
- expected image: \`${contract.expectedImagePath}\` (repo-boundary expected image contract)
- status policy: ${contract.statusPolicy}
- hidden surface policy: ${contract.hiddenSurfacePolicy}
- vertical anchoring: ${contract.verticalAnchoringInvariant.coordinateSpace}; tolerance ${contract.verticalAnchoringInvariant.tolerancePx}px.
- backend boundary: ${contract.backendContract.boundary}
- smoke access: ${contract.smokeCoverage.accessPath.join(" > ")}
`;
}

function writeInventory(): void {
  const contracts = surfaces.map(contractFor);
  const rows = contracts.map((contract) => [
    `\`${contract.surfaceId}\``,
    contract.title,
    contract.menuPath.join(" > "),
    contract.ownerModules.join(", "),
    contract.backendContract.boundary,
    contract.statusPolicy,
    contract.verticalAnchoringInvariant.coordinateSpace,
    contract.expectedImagePath,
  ]);
  const markdown = `# Product Surface Inventory

Source of truth: \`C:\\Users\\anise\\Downloads\\구조.md\`. This inventory intentionally defines 16 product surfaces: one home surface plus 15 menu leaf surfaces.

PMS bottom navigation remains a backend verification surface, but it is not counted as one of the 16 requested product screen images.
The bottom-bar settings screen is a utility and operation surface. It may link to existing editor product surfaces, but it is not counted as a seventeenth product image.

| surfaceId | 화면명 | path | owner modules | backend boundary | status policy | vertical anchoring | expected image |
|---|---|---|---|---|---|---|---|
${rows.map((row) => `| ${row.join(" | ")} |`).join("\n")}
`;
  writeFileSync(inventoryPath, markdown);
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

mkdirSync(targetRoot, { recursive: true });
const surfaceIds = new Set(surfaces.map((surface) => surface.surfaceId));
for (const entry of readdirSync(targetRoot, { withFileTypes: true })) {
  if (entry.isDirectory() && !surfaceIds.has(entry.name)) {
    rmSync(join(targetRoot, entry.name), { recursive: true, force: true });
  }
}
for (const definition of surfaces) {
  writeTarget(definition);
}
writeInventory();
console.log(`wrote ${surfaces.length} product surface targets to ${targetRoot}`);

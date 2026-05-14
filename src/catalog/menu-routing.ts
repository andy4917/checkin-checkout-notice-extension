import type {
  TemplateMenuId,
  TemplateTypeId,
  TemplateAudience,
  UnifiedTemplateDefinition,
} from "./template-types.js";

export type MenuId = TemplateMenuId | "AIRPORT_VAN_MANAGEMENT" | "OTA_RESERVATION_INPUT" | "SETTINGS";

export type HomeMenuSectionId = "primary" | "room-operations" | "work-forms";

export type MenuScreenKind =
  | "customerGuidance"
  | "laundry"
  | "templateList"
  | "otaReservationInput"
  | "settings";

export type MenuTemplateFilter =
  | { kind: "menu" }
  | { kind: "type"; typeId: TemplateTypeId }
  | { kind: "none" };

export type HomeMenuPresentation = {
  sectionId: HomeMenuSectionId;
  title: string;
  description: string;
  icon: string;
  order: number;
  tone?: "primary";
};

export type MenuItem = {
  id: MenuId;
  title: string;
  description: string;
  icon: string;
  screenKind: MenuScreenKind;
  templateFilter: MenuTemplateFilter;
  home?: HomeMenuPresentation;
};

export type MenuGroup = {
  title: string;
  items: readonly MenuItem[];
};

export type HomeMenuSection = {
  id: HomeMenuSectionId | "settings";
  title: string;
  items: readonly MenuItem[];
};

export type HomeQuickAction = {
  kind: "menu";
  id: string;
  label: string;
  icon: string;
  menuId: MenuId;
  detailLabel: string;
  confirmLabel: string;
};

export type RoomsSettingsCommandId = "UPSERT_WINGS_REMARK";

export type RoomsSettingsCommandAction = {
  kind: "command";
  id: string;
  label: string;
  icon: string;
  commandId: RoomsSettingsCommandId;
  detailLabel: string;
  confirmLabel: string;
  visibleWhenSelectedTemplateAudience?: TemplateAudience;
  requiresBranch?: boolean;
  requiresPmsRecord?: boolean;
  requiresWingsReservationWindow?: boolean;
};

export type RoomsSettingsAction = HomeQuickAction | RoomsSettingsCommandAction;

export class MenuRoutingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MenuRoutingError";
  }
}

export const menuGroups: readonly MenuGroup[] = Object.freeze([
  Object.freeze({
    title: "고객 커뮤니케이션",
    items: Object.freeze([
      Object.freeze({
        id: "CUSTOMER_NOTICE",
        title: "고객 안내문",
        description: "입실과 재실 안내",
        icon: "info",
        screenKind: "customerGuidance",
        templateFilter: Object.freeze({ kind: "menu" }),
        home: Object.freeze({
          sectionId: "primary",
          title: "고객 안내문",
          description: "입실, 퇴실, 이용 안내 발송",
          icon: "info",
          order: 10,
          tone: "primary",
        }),
      }),
      Object.freeze({
        id: "QUICK_REPLY",
        title: "빠른 문의 답변",
        description: "자주 묻는 문의 응대",
        icon: "chat_bubble",
        screenKind: "templateList",
        templateFilter: Object.freeze({ kind: "menu" }),
        home: Object.freeze({
          sectionId: "primary",
          title: "빠른 답변",
          description: "고객 문의 응대 템플릿",
          icon: "chat_bubble",
          order: 20,
        }),
      }),
    ]),
  }),
  Object.freeze({
    title: "고객 서비스 관리",
    items: Object.freeze([
      Object.freeze({
        id: "LAUNDRY_MANAGEMENT",
        title: "세탁물 관리",
        description: "세탁 완료와 전달 안내",
        icon: "local_laundry_service",
        screenKind: "laundry",
        templateFilter: Object.freeze({ kind: "menu" }),
        home: Object.freeze({
          sectionId: "room-operations",
          title: "세탁물 관리",
          description: "세탁 접수와 전달 상태",
          icon: "local_laundry_service",
          order: 20,
        }),
      }),
      Object.freeze({
        id: "AIRPORT_VAN_MANAGEMENT",
        title: "공항밴 관리",
        description: "공항밴 안내와 배차 확인",
        icon: "airport_shuttle",
        screenKind: "templateList",
        templateFilter: Object.freeze({ kind: "type", typeId: "airport_van" }),
        home: Object.freeze({
          sectionId: "room-operations",
          title: "공항밴 관리",
          description: "공항밴 안내와 배차 확인",
          icon: "airport_shuttle",
          order: 30,
        }),
      }),
      Object.freeze({
        id: "SALES_MANAGEMENT",
        title: "매지출 관리",
        description: "매지출과 드오디네 기록",
        icon: "payments",
        screenKind: "templateList",
        templateFilter: Object.freeze({ kind: "menu" }),
        home: Object.freeze({
          sectionId: "room-operations",
          title: "매지출 관리",
          description: "매출과 지출 기록",
          icon: "payments",
          order: 40,
        }),
      }),
      Object.freeze({
        id: "ROOM_REMARK_MEMO",
        title: "객실 정보 메모",
        description: "객실 물품과 메모 작성",
        icon: "bedroom_parent",
        screenKind: "templateList",
        templateFilter: Object.freeze({ kind: "menu" }),
        home: Object.freeze({
          sectionId: "work-forms",
          title: "객실 정보 메모",
          description: "객실 물품과 특이사항 메모",
          icon: "bedroom_parent",
          order: 10,
        }),
      }),
      Object.freeze({
        id: "OTA_RESERVATION_INPUT",
        title: "OTA 예약 입력",
        description: "네이버/스테이션 값을 WINGS에 입력",
        icon: "travel_explore",
        screenKind: "otaReservationInput",
        templateFilter: Object.freeze({ kind: "none" }),
        home: Object.freeze({
          sectionId: "work-forms",
          title: "OTA 예약 입력",
          description: "예약 정보를 WINGS에 반영",
          icon: "travel_explore",
          order: 20,
        }),
      }),
    ]),
  }),
  Object.freeze({
    title: "업무 관리",
    items: Object.freeze([
      Object.freeze({
        id: "WORK_REPORT",
        title: "업무 관리",
        description: "일일 업무와 예약 보고",
        icon: "assignment",
        screenKind: "templateList",
        templateFilter: Object.freeze({ kind: "menu" }),
        home: Object.freeze({
          sectionId: "work-forms",
          title: "업무 관리",
          description: "일일 업무와 예약 보고",
          icon: "assignment",
          order: 30,
        }),
      }),
    ]),
  }),
]);

export const settingsMenu: MenuItem = Object.freeze({
  id: "SETTINGS",
  title: "설정",
  description: "템플릿 기본값과 사용자 항목",
  icon: "design_services",
  screenKind: "settings",
  templateFilter: Object.freeze({ kind: "none" }),
  home: Object.freeze({
    sectionId: "work-forms",
    title: "템플릿 설정",
    description: "문구와 사용자 항목 관리",
    icon: "design_services",
    order: 90,
  }),
});

const HOME_SECTION_LABELS: Readonly<Record<HomeMenuSectionId | "settings", string>> =
  Object.freeze({
    primary: "고객 커뮤니케이션",
    "room-operations": "고객 서비스 관리",
    "work-forms": "업무 관리",
    settings: "설정",
  });

export const homeQuickActions: readonly HomeQuickAction[] = Object.freeze([
  Object.freeze({
    kind: "menu",
    id: "settings",
    label: "설정",
    icon: "settings",
    menuId: "SETTINGS",
    detailLabel: "설정 열기",
    confirmLabel: "열기",
  }),
]);

export const roomsSettingsActions: readonly RoomsSettingsAction[] = Object.freeze([
  ...homeQuickActions,
  Object.freeze({
    kind: "command",
    id: "upsert-wings-remark",
    label: "리마크 입력",
    icon: "edit_note",
    commandId: "UPSERT_WINGS_REMARK",
    detailLabel: "WINGS 리마크에 입력",
    confirmLabel: "실행",
    visibleWhenSelectedTemplateAudience: "pmsRemark",
    requiresPmsRecord: true,
    requiresWingsReservationWindow: true,
  }),
]);

export function getHomeMenuSections(): HomeMenuSection[] {
  const menus = menuGroups.flatMap((group) => group.items);
  const sectionIds: readonly HomeMenuSectionId[] = Object.freeze([
    "primary",
    "room-operations",
    "work-forms",
  ]);

  return [
    ...sectionIds.map((sectionId) =>
      Object.freeze({
        id: sectionId,
        title: HOME_SECTION_LABELS[sectionId],
        items: Object.freeze(
          menus
            .filter((item) => item.home?.sectionId === sectionId)
            .sort((left, right) => (left.home?.order || 0) - (right.home?.order || 0)),
        ),
      }),
    ),
    Object.freeze({
      id: "settings",
      title: HOME_SECTION_LABELS.settings,
      items: Object.freeze([settingsMenu]),
    }),
  ];
}

export function filterTemplatesForMenu(
  menuId: MenuId,
  templates: readonly UnifiedTemplateDefinition[],
): UnifiedTemplateDefinition[] {
  const menu = getMenu(menuId);
  if (menu.templateFilter.kind === "none") return [];
  if (menu.templateFilter.kind === "type") {
    const { typeId } = menu.templateFilter;
    return templates.filter((template) => template.typeId === typeId);
  }
  return templates.filter((template) => template.menuId === menuId);
}

export function isRoomsSettingsCommandId(input: string): input is RoomsSettingsCommandId {
  return roomsSettingsActions.some(
    (action) => action.kind === "command" && action.commandId === input,
  );
}

export function getRoomsSettingsCommand(
  commandId: RoomsSettingsCommandId,
): RoomsSettingsCommandAction {
  const command = roomsSettingsActions.find(
    (action): action is RoomsSettingsCommandAction =>
      action.kind === "command" && action.commandId === commandId,
  );
  if (!command) {
    throw new MenuRoutingError(`Unknown Rooms & Settings command: ${commandId}`);
  }
  return command;
}

export function getMenu(menuId: MenuId): MenuItem {
  const menu = [...menuGroups.flatMap((group) => group.items), settingsMenu].find(
    (item) => item.id === menuId,
  );
  if (!menu) {
    throw new MenuRoutingError(`Unknown menu: ${menuId}`);
  }
  return menu;
}

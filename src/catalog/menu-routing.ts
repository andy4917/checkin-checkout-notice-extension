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
  | "airportVan"
  | "laundry"
  | "templateList"
  | "otaReservationInput"
  | "settings";

export type MenuTemplateFilter =
  | { kind: "menu" }
  | { kind: "type"; typeId: TemplateTypeId }
  | { kind: "types"; typeIds: readonly TemplateTypeId[] }
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

export type HomeNavigationItem = {
  id: string;
  title: string;
  icon: string;
  menuId: MenuId;
  templateFilter?: MenuTemplateFilter;
};

export type HomeNavigationGroup = {
  id: string;
  title: string;
  icon: string;
  selectionMode: "accordion" | "menuScreen";
  items: readonly HomeNavigationItem[];
};

export type HomeBottomNavigationItem = {
  id: string;
  title: string;
  icon: string;
  menuId?: MenuId;
  action?: HomeBottomNavigationAction;
};

export type HomeBottomNavigationAction =
  | { kind: "pmsGuestList"; mode: "ARRIVAL" | "DEPARTURE" };

export type HomeNavigationLabels = {
  rootLabel: string;
  rootMenuLabel: string;
  bottomMenuLabel: string;
  defaultSubmenuLabel: string;
  backToRootLabel: string;
  openSubmenuLabel: (title: string) => string;
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
          title: "빠른 문의 답변",
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
        screenKind: "airportVan",
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
        description: "매지출 보고",
        icon: "payments",
        screenKind: "templateList",
        templateFilter: Object.freeze({ kind: "menu" }),
        home: Object.freeze({
          sectionId: "room-operations",
          title: "매지출 관리",
          description: "매지출 보고",
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
        title: "NAVER / STATION 예약입력",
        description: "네이버/스테이션 값을 WINGS에 입력",
        icon: "travel_explore",
        screenKind: "otaReservationInput",
        templateFilter: Object.freeze({ kind: "none" }),
        home: Object.freeze({
          sectionId: "work-forms",
          title: "NAVER / STATION 예약입력",
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
        title: "업무보고 양식",
        description: "일일 업무와 예약 보고",
        icon: "assignment",
        screenKind: "templateList",
        templateFilter: Object.freeze({ kind: "menu" }),
        home: Object.freeze({
          sectionId: "work-forms",
          title: "업무보고 양식",
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
  title: "템플릿 / 양식 편집",
  description: "템플릿 기본값과 사용자 항목",
  icon: "design_services",
  screenKind: "settings",
  templateFilter: Object.freeze({ kind: "none" }),
  home: Object.freeze({
    sectionId: "work-forms",
    title: "템플릿 / 양식 편집",
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

function typeFilter(typeId: TemplateTypeId): MenuTemplateFilter {
  return Object.freeze({ kind: "type", typeId });
}

function typesFilter(typeIds: readonly TemplateTypeId[]): MenuTemplateFilter {
  return Object.freeze({ kind: "types", typeIds: Object.freeze([...typeIds]) });
}

export const homeNavigationGroups: readonly HomeNavigationGroup[] = Object.freeze([
  Object.freeze({
    id: "customer-guidance",
    title: "고객 안내문",
    icon: "info",
    selectionMode: "accordion",
    items: Object.freeze([
      Object.freeze({
        id: "customer-checkin",
        title: "체크인 안내문",
        icon: "login",
        menuId: "CUSTOMER_NOTICE",
        templateFilter: typesFilter([
          "arrival_notice",
          "prearrival_csm",
          "prestay_notice",
          "self_checkin",
          "early_checkin",
        ]),
      }),
      Object.freeze({
        id: "customer-checkout",
        title: "체크아웃 안내문",
        icon: "keyboard_return",
        menuId: "CUSTOMER_NOTICE",
        templateFilter: typeFilter("cleaning_notice"),
      }),
      Object.freeze({
        id: "customer-room",
        title: "객실 관련 안내문",
        icon: "bedroom_parent",
        menuId: "CUSTOMER_NOTICE",
        templateFilter: typesFilter([
          "room_upgrade",
          "room_upgrade_closed",
          "card_key",
          "laundry_complete",
          "partner_service",
        ]),
      }),
      Object.freeze({
        id: "customer-fee",
        title: "각종 요금 관련 안내문",
        icon: "payments",
        menuId: "CUSTOMER_NOTICE",
        templateFilter: typesFilter(["parking", "airport_van", "room_sales", "dodine_sales"]),
      }),
    ]),
  }),
  Object.freeze({
    id: "quick-replies",
    title: "빠른 문의 답변",
    icon: "chat_bubble",
    selectionMode: "accordion",
    items: Object.freeze([
      Object.freeze({
        id: "quick-rental",
        title: "물품 대여 문의",
        icon: "inventory_2",
        menuId: "QUICK_REPLY",
        templateFilter: typeFilter("rental_item"),
      }),
      Object.freeze({
        id: "quick-lost-item",
        title: "분실물 문의",
        icon: "manage_search",
        menuId: "QUICK_REPLY",
        templateFilter: typeFilter("lost_item"),
      }),
      Object.freeze({
        id: "quick-room-visit",
        title: "객실 방문 예정",
        icon: "meeting_room",
        menuId: "QUICK_REPLY",
        templateFilter: typeFilter("room_visit"),
      }),
      Object.freeze({
        id: "quick-breakfast",
        title: "조식 문의",
        icon: "restaurant",
        menuId: "QUICK_REPLY",
        templateFilter: typeFilter("breakfast_inquiry"),
      }),
      Object.freeze({
        id: "quick-invoice",
        title: "인보이스 문의",
        icon: "receipt_long",
        menuId: "QUICK_REPLY",
        templateFilter: typeFilter("invoice_inquiry"),
      }),
      Object.freeze({
        id: "quick-cancellation",
        title: "체크인 1주이내 취소 문의",
        icon: "event_busy",
        menuId: "QUICK_REPLY",
        templateFilter: typeFilter("cancellation_inquiry"),
      }),
      Object.freeze({
        id: "quick-laundry-service",
        title: "세탁 서비스 문의",
        icon: "local_laundry_service",
        menuId: "QUICK_REPLY",
        templateFilter: typeFilter("laundry_service_inquiry"),
      }),
      Object.freeze({
        id: "quick-kakao-connect",
        title: "카톡 채널 문의 연결",
        icon: "forum",
        menuId: "QUICK_REPLY",
        templateFilter: typeFilter("kakao_channel_connect"),
      }),
      Object.freeze({
        id: "quick-kakao-closing",
        title: "카톡 채널 문의 마무리",
        icon: "done_all",
        menuId: "QUICK_REPLY",
        templateFilter: typeFilter("kakao_channel_closing"),
      }),
      Object.freeze({
        id: "quick-nearby-restaurant",
        title: "근처 식당 문의",
        icon: "restaurant_menu",
        menuId: "QUICK_REPLY",
        templateFilter: typeFilter("nearby_restaurant"),
      }),
    ]),
  }),
  Object.freeze({
    id: "service-management",
    title: "고객 서비스 관리",
    icon: "room_service",
    selectionMode: "menuScreen",
    items: Object.freeze([
      Object.freeze({ id: "service-laundry", title: "세탁물 관리", icon: "local_laundry_service", menuId: "LAUNDRY_MANAGEMENT" }),
      Object.freeze({ id: "service-sales", title: "매지출 관리", icon: "payments", menuId: "SALES_MANAGEMENT" }),
      Object.freeze({ id: "service-airport-van", title: "공항밴 관리", icon: "airport_shuttle", menuId: "AIRPORT_VAN_MANAGEMENT" }),
    ]),
  }),
  Object.freeze({
    id: "work-management",
    title: "업무 관리",
    icon: "assignment",
    selectionMode: "menuScreen",
    items: Object.freeze([
      Object.freeze({ id: "work-room-remark", title: "객실 정보 메모", icon: "bedroom_parent", menuId: "ROOM_REMARK_MEMO" }),
      Object.freeze({ id: "work-ota", title: "NAVER / STATION 예약입력", icon: "travel_explore", menuId: "OTA_RESERVATION_INPUT" }),
      Object.freeze({ id: "work-report", title: "업무보고 양식", icon: "summarize", menuId: "WORK_REPORT" }),
    ]),
  }),
  Object.freeze({
    id: "template-editor",
    title: "템플릿 / 양식 편집",
    icon: "design_services",
    selectionMode: "menuScreen",
    items: Object.freeze([
      Object.freeze({ id: "template-customer", title: "고객 템플릿 / 빠른답변", icon: "description", menuId: "SETTINGS" }),
      Object.freeze({ id: "template-work", title: "업무 내용 변경", icon: "edit_note", menuId: "SETTINGS" }),
    ]),
  }),
]);

export const homeBottomNavigationItems: readonly HomeBottomNavigationItem[] = Object.freeze([
  Object.freeze({ id: "checkin-list", title: "체크인 목록", icon: "login", action: Object.freeze({ kind: "pmsGuestList" as const, mode: "ARRIVAL" as const }) }),
  Object.freeze({ id: "checkout-list", title: "체크아웃 목록", icon: "keyboard_return", action: Object.freeze({ kind: "pmsGuestList" as const, mode: "DEPARTURE" as const }) }),
  Object.freeze({ id: "room-select", title: "객실 선택", icon: "meeting_room", action: Object.freeze({ kind: "pmsGuestList" as const, mode: "ARRIVAL" as const }) }),
  Object.freeze({ id: "settings", title: "설정", icon: "settings", menuId: "SETTINGS" }),
]);

export const homeNavigationLabels: HomeNavigationLabels = Object.freeze({
  rootLabel: "홈 메뉴",
  rootMenuLabel: "업무 그룹",
  bottomMenuLabel: "하단 업무 메뉴",
  defaultSubmenuLabel: "하위 메뉴",
  backToRootLabel: "홈 메뉴로 돌아가기",
  openSubmenuLabel: (title: string) => `${title} 메뉴 열기`,
});

export function usesWorkLanguageSelector(menuId: MenuId | null): boolean {
  if (!menuId) return false;
  const menu = getMenu(menuId);
  return menu.screenKind === "customerGuidance" || menu.id === "QUICK_REPLY";
}

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
  if (menu.templateFilter.kind === "types") {
    const typeIds = new Set(menu.templateFilter.typeIds);
    return templates.filter((template) => typeIds.has(template.typeId));
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
    throw new MenuRoutingError(`Unknown room remark command: ${commandId}`);
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

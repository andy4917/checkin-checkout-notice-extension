import type {
  TemplateMenuId,
  TemplateTypeId,
  UnifiedTemplateDefinition,
} from "./template-types.js";

export type MenuId = TemplateMenuId | "OTA_RESERVATION_INPUT" | "SETTINGS";

export type HomeMenuSectionId = "primary" | "room-operations" | "work-forms";

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
  id: string;
  label: string;
  icon: string;
  menuId?: MenuId;
};

export type TemplateTab = {
  id: string;
  label: string;
};

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
        icon: "✉",
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
        icon: "?",
        home: Object.freeze({
          sectionId: "primary",
          title: "빠른 답변",
          description: "고객 문의 응대 템플릿",
          icon: "message",
          order: 20,
        }),
      }),
    ]),
  }),
  Object.freeze({
    title: "운영 관리",
    items: Object.freeze([
      Object.freeze({
        id: "LAUNDRY_MANAGEMENT",
        title: "세탁물 관리",
        description: "세탁 완료와 전달 안내",
        icon: "▤",
        home: Object.freeze({
          sectionId: "room-operations",
          title: "세탁물 관리",
          description: "세탁 접수와 전달 상태",
          icon: "laundry",
          order: 20,
        }),
      }),
      Object.freeze({
        id: "SALES_MANAGEMENT",
        title: "매지출 관리",
        description: "매지출과 드오디네 기록",
        icon: "₩",
        home: Object.freeze({
          sectionId: "work-forms",
          title: "매지출 관리",
          description: "매출과 지출 기록",
          icon: "receipt",
          order: 10,
        }),
      }),
      Object.freeze({
        id: "ROOM_REMARK_MEMO",
        title: "객실 정보 메모",
        description: "객실 정보 메모 작성",
        icon: "≡",
        home: Object.freeze({
          sectionId: "room-operations",
          title: "객실 메모",
          description: "객실 특이사항과 예약 메모",
          icon: "rooms",
          order: 10,
        }),
      }),
      Object.freeze({
        id: "OTA_RESERVATION_INPUT",
        title: "OTA 예약 입력",
        description: "네이버/스테이션 값을 WINGS에 입력",
        icon: "＋",
        home: Object.freeze({
          sectionId: "room-operations",
          title: "OTA 예약 입력",
          description: "예약 정보를 WINGS에 반영",
          icon: "file-text",
          order: 30,
        }),
      }),
    ]),
  }),
  Object.freeze({
    title: "보고",
    items: Object.freeze([
      Object.freeze({
        id: "WORK_REPORT",
        title: "업무보고 생성",
        description: "일일 업무와 예약 보고",
        icon: "▣",
        home: Object.freeze({
          sectionId: "work-forms",
          title: "업무보고 생성",
          description: "일일 업무와 예약 보고",
          icon: "clipboard",
          order: 20,
        }),
      }),
    ]),
  }),
]);

export const settingsMenu: MenuItem = Object.freeze({
  id: "SETTINGS",
  title: "설정",
  description: "템플릿 기본값과 사용자 항목",
  icon: "⚙",
  home: Object.freeze({
    sectionId: "work-forms",
    title: "템플릿 설정",
    description: "문구와 사용자 항목 관리",
    icon: "settings",
    order: 90,
  }),
});

const HOME_SECTION_LABELS: Readonly<Record<HomeMenuSectionId | "settings", string>> =
  Object.freeze({
    primary: "고객 응대",
    "room-operations": "객실 운영",
    "work-forms": "업무 양식",
    settings: "설정",
  });

export const homeQuickActions: readonly HomeQuickAction[] = Object.freeze([
  Object.freeze({ id: "wings-login", label: "WINGS LOGIN", icon: "log-in" }),
  Object.freeze({ id: "light-mode", label: "LIGHT", icon: "sun" }),
  Object.freeze({ id: "dark-mode", label: "DARK", icon: "moon" }),
  Object.freeze({
    id: "room-select",
    label: "객실 선택",
    icon: "rooms",
    menuId: "CUSTOMER_NOTICE",
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

const MENU_TABS: Readonly<Record<TemplateMenuId, readonly TemplateTab[]>> = Object.freeze({
  CUSTOMER_NOTICE: Object.freeze([
    Object.freeze({ id: "all", label: "전체" }),
    Object.freeze({ id: "notice", label: "안내문" }),
    Object.freeze({ id: "pms", label: "WINGS" }),
  ]),
  QUICK_REPLY: Object.freeze([
    Object.freeze({ id: "all", label: "전체" }),
    Object.freeze({ id: "guest", label: "고객 답변" }),
    Object.freeze({ id: "manual", label: "수동" }),
  ]),
  LAUNDRY_MANAGEMENT: Object.freeze([
    Object.freeze({ id: "all", label: "전체" }),
    Object.freeze({ id: "complete", label: "완료" }),
    Object.freeze({ id: "notice", label: "안내" }),
  ]),
  SALES_MANAGEMENT: Object.freeze([
    Object.freeze({ id: "all", label: "전체" }),
    Object.freeze({ id: "sales", label: "매지출" }),
    Object.freeze({ id: "dodine", label: "드오디네" }),
  ]),
  ROOM_REMARK_MEMO: Object.freeze([
    Object.freeze({ id: "all", label: "전체" }),
    Object.freeze({ id: "remark", label: "객실 메모" }),
    Object.freeze({ id: "reservation", label: "예약" }),
  ]),
  WORK_REPORT: Object.freeze([
    Object.freeze({ id: "all", label: "전체" }),
    Object.freeze({ id: "daily", label: "일일" }),
    Object.freeze({ id: "reservation", label: "예약" }),
  ]),
});

const RESERVATION_REMARK_TYPES: readonly TemplateTypeId[] = Object.freeze([
  "airport_van",
  "partner_service",
]);

export function filterTemplatesForMenu(
  menuId: MenuId,
  templates: readonly UnifiedTemplateDefinition[],
): UnifiedTemplateDefinition[] {
  if (menuId === "OTA_RESERVATION_INPUT" || menuId === "SETTINGS") return [];
  return templates.filter((template) => template.menuId === menuId);
}

export function getTabsForMenu(menuId: MenuId): TemplateTab[] {
  if (menuId === "OTA_RESERVATION_INPUT" || menuId === "SETTINGS") return [];
  return [...MENU_TABS[menuId]];
}

export function matchesTemplateTab(
  menuId: MenuId,
  tabId: string,
  template: UnifiedTemplateDefinition,
): boolean {
  if (tabId === "all") return true;
  switch (menuId) {
    case "CUSTOMER_NOTICE":
      return tabId === "pms"
        ? template.requiresContext !== "none"
        : template.requiresContext === "none";
    case "QUICK_REPLY":
      return tabId === "manual"
        ? template.requiresContext === "none"
        : template.audience === "guest";
    case "LAUNDRY_MANAGEMENT":
      return tabId === "complete" ? template.typeId === "laundry_complete" : true;
    case "SALES_MANAGEMENT":
      return tabId === "dodine"
        ? template.typeId === "dodine_sales"
        : template.typeId === "room_sales";
    case "ROOM_REMARK_MEMO":
      return tabId === "reservation"
        ? RESERVATION_REMARK_TYPES.includes(template.typeId)
        : !RESERVATION_REMARK_TYPES.includes(template.typeId);
    case "WORK_REPORT":
      return tabId === "reservation"
        ? template.typeId === "reservation_report"
        : template.typeId !== "reservation_report";
    case "OTA_RESERVATION_INPUT":
    case "SETTINGS":
      return false;
  }
}

export function getMenu(menuId: MenuId): MenuItem {
  if (menuId === "SETTINGS") return settingsMenu;
  const menu = menuGroups.flatMap((group) => group.items).find((item) => item.id === menuId);
  if (!menu) {
    throw new MenuRoutingError(`Unknown menu: ${menuId}`);
  }
  return menu;
}

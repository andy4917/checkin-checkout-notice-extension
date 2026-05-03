import type {
  TemplateMenuId,
  TemplateTypeId,
  UnifiedTemplateDefinition,
} from "./template-types.js";

export type MenuId = TemplateMenuId | "OTA_RESERVATION_INPUT" | "SETTINGS";

export type MenuItem = {
  id: MenuId;
  title: string;
  description: string;
  icon: string;
};

export type MenuGroup = {
  title: string;
  items: readonly MenuItem[];
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
      }),
      Object.freeze({
        id: "QUICK_REPLY",
        title: "빠른 문의 답변",
        description: "자주 묻는 문의 응대",
        icon: "?",
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
      }),
      Object.freeze({
        id: "SALES_MANAGEMENT",
        title: "매지출 관리",
        description: "매지출과 드오디네 기록",
        icon: "₩",
      }),
      Object.freeze({
        id: "ROOM_REMARK_MEMO",
        title: "객실 정보 메모",
        description: "객실 정보 메모 작성",
        icon: "≡",
      }),
      Object.freeze({
        id: "OTA_RESERVATION_INPUT",
        title: "OTA 예약 입력",
        description: "네이버/스테이션 값을 WINGS에 입력",
        icon: "＋",
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
      }),
    ]),
  }),
]);

export const settingsMenu: MenuItem = Object.freeze({
  id: "SETTINGS",
  title: "설정",
  description: "템플릿 기본값과 사용자 항목",
  icon: "⚙",
});

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

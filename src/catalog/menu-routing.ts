import type {
  TemplateMenuId,
  UnifiedTemplateDefinition,
} from "./template-types.js";

export type MenuId = TemplateMenuId | "AIRPORT_VAN_MANAGEMENT" | "OTA_RESERVATION_INPUT" | "SETTINGS";

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
  menuId: MenuId;
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
        icon: "info",
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
    id: "settings",
    label: "설정",
    icon: "settings",
    menuId: "SETTINGS",
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
  if (menuId === "OTA_RESERVATION_INPUT" || menuId === "SETTINGS") return [];
  if (menuId === "AIRPORT_VAN_MANAGEMENT") {
    return templates.filter((template) => template.typeId === "airport_van");
  }
  return templates.filter((template) => template.menuId === menuId);
}

export function getMenu(menuId: MenuId): MenuItem {
  if (menuId === "SETTINGS") return settingsMenu;
  const menu = menuGroups.flatMap((group) => group.items).find((item) => item.id === menuId);
  if (!menu) {
    throw new MenuRoutingError(`Unknown menu: ${menuId}`);
  }
  return menu;
}

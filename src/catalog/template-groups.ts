import type {
  TemplateDefinition,
  TemplateTypeId,
  UnifiedTemplateDefinition,
} from "./template-types.js";

export type TemplateGroup<T extends TemplateDefinition = TemplateDefinition> = {
  id: string;
  label: string;
  templates: T[];
};

const TEMPLATE_GROUPS: Array<{
  id: string;
  label: string;
  typeIds: readonly TemplateTypeId[];
}> = [
  {
    id: "checkin",
    label: "체크인 안내문",
    typeIds: ["arrival_notice", "prearrival_csm", "prestay_notice", "self_checkin", "early_checkin"],
  },
  {
    id: "checkout",
    label: "체크아웃 안내문",
    typeIds: ["cleaning_notice"],
  },
  {
    id: "room",
    label: "객실 관련 안내문",
    typeIds: [
      "room_upgrade",
      "room_upgrade_closed",
      "card_key",
      "rental_item",
      "lost_item",
      "room_visit",
      "breakfast_inquiry",
      "invoice_inquiry",
      "cancellation_inquiry",
      "laundry_service_inquiry",
      "kakao_channel_connect",
      "kakao_channel_closing",
      "nearby_restaurant",
      "laundry_complete",
      "partner_service",
    ],
  },
  {
    id: "rate",
    label: "요금 관련 안내문",
    typeIds: ["parking", "airport_van", "room_sales", "dodine_sales"],
  },
  {
    id: "work",
    label: "업무 양식",
    typeIds: ["day_night_report", "branch_daily_report", "reservation_report"],
  },
];

const GROUP_ID_BY_TYPE = new Map<TemplateTypeId, string>(
  TEMPLATE_GROUPS.flatMap((group) => group.typeIds.map((typeId) => [typeId, group.id])),
);

function getTemplateTypeId(template: TemplateDefinition): TemplateTypeId | null {
  return (template as Partial<UnifiedTemplateDefinition>).typeId || null;
}

export function resolveTemplateGroups<T extends TemplateDefinition>(
  templates: readonly T[],
): TemplateGroup<T>[] {
  const buckets = new Map<string, T[]>();
  for (const group of TEMPLATE_GROUPS) {
    buckets.set(group.id, []);
  }
  buckets.set("other", []);

  for (const template of templates) {
    const typeId = getTemplateTypeId(template);
    const groupId = typeId ? GROUP_ID_BY_TYPE.get(typeId) || "other" : "other";
    buckets.get(groupId)?.push(template);
  }

  return [
    ...TEMPLATE_GROUPS.map((group) => ({
      id: group.id,
      label: group.label,
      templates: buckets.get(group.id) || [],
    })),
    {
      id: "other",
      label: "기타 안내문",
      templates: buckets.get("other") || [],
    },
  ].filter((group) => group.templates.length > 0);
}

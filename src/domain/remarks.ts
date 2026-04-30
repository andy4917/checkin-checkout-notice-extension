export type RemarkType = "cardKeys" | "rentals" | "medicalBloom" | "stoneHouse";

export type RemarkValues = Record<string, string | number | null | undefined>;

const REMARK_FORMATS: Record<RemarkType, { prefix: string; render(values: RemarkValues): string }> = {
  cardKeys: {
    prefix: "- 제공 카드키 :",
    render: (values) => `- 제공 카드키 : ${value(values.count)}장`,
  },
  rentals: {
    prefix: "- 대여물품 :",
    render: (values) => `- 대여물품 : ${value(values.items)}`,
  },
  medicalBloom: {
    prefix: "- 메디컬블룸 :",
    render: (values) =>
      `- 메디컬블룸 : ${value(values.courseName)} / 이용일 : ${value(values.useDateTime)} / ${value(values.status)}`,
  },
  stoneHouse: {
    prefix: "- 스톤하우스 :",
    render: (values) =>
      `- 스톤하우스 : ${value(values.courseName)} / 이용일 : ${value(values.useDateTime)} / ${value(values.status)}`,
  },
};

const BUILT_IN_REMARK_TYPES: Readonly<Record<string, RemarkType>> = Object.freeze({
  "remark-card-keys": "cardKeys",
  "remark-rentals": "rentals",
  "remark-medical-bloom": "medicalBloom",
  "remark-stone-house": "stoneHouse",
});

export function getBuiltInRemarkType(templateId: string): RemarkType | null {
  return BUILT_IN_REMARK_TYPES[templateId] || null;
}

export function createRemarkLine(type: RemarkType, values: RemarkValues = {}): string {
  return REMARK_FORMATS[type].render(values);
}

export function upsertRemarkLine(existingRemark: string, type: RemarkType, values: RemarkValues = {}): string {
  const nextLine = createRemarkLine(type, values);
  const prefix = REMARK_FORMATS[type].prefix;
  const lines = existingRemark.split(/\r?\n/);
  const index = lines.findIndex((line) => line.trimStart().startsWith(prefix));

  if (index >= 0) {
    lines[index] = nextLine;
    return lines.join("\n");
  }

  const trimmed = existingRemark.replace(/\s+$/g, "");
  return trimmed ? `${trimmed}\n\n${nextLine}` : nextLine;
}

function value(input: string | number | null | undefined): string {
  return input === null || input === undefined ? "" : String(input);
}

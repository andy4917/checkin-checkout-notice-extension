import type { BranchId } from "../types.js";
import type {
  StoredExtensionState,
  TemplateDefinition,
  TemplateVariable,
} from "./template-types.js";

const ALL_BRANCHES: BranchId[] = ["coex", "gangnam", "seolleung"];

const guestName: TemplateVariable = {
  name: "guestName",
  label: "고객명",
  kind: "pmsRequired",
};

const manualGuestName: TemplateVariable = {
  name: "guestName",
  label: "고객명",
  kind: "manualOptional",
};

const roomNo: TemplateVariable = {
  name: "roomNo",
  label: "객실번호",
  kind: "pmsRequired",
};

const manualRoomNo: TemplateVariable = {
  name: "roomNo",
  label: "객실번호",
  kind: "manualOptional",
};

const branchName: TemplateVariable = {
  name: "branchName",
  label: "지점",
  kind: "manualOptional",
};

const staffName: TemplateVariable = {
  name: "staffName",
  label: "근무자",
  kind: "manualOptional",
};

const reportDate: TemplateVariable = {
  name: "reportDate",
  label: "보고일",
  kind: "computed",
};

function defineTemplate(template: TemplateDefinition): Readonly<TemplateDefinition> {
  return Object.freeze(template);
}

export const WORKFLOW_TEMPLATE_CATALOG: readonly TemplateDefinition[] = Object.freeze([
  defineTemplate({
    id: "guest-arrival-notice",
    category: "GUEST_NOTICE",
    audience: "guest",
    title: "입실 직후 안내",
    branchScope: ALL_BRANCHES,
    languages: {
      KO: "{guestName} 님, 배정 객실은 {roomNo}입니다.",
      EN: "Dear {guestName}, your assigned room is {roomNo}.",
      JP: "{guestName} 様、ご案内のお部屋は {roomNo} でございます。",
      CN: "尊敬的 {guestName}，您被分配的客房为 {roomNo}。",
    },
    variables: [guestName, roomNo],
    attachments: [],
    requiresContext: "pmsPage",
    editable: true,
    defaultValue: "{guestName} 님, 배정 객실은 {roomNo}입니다.",
  }),
  defineTemplate({
    id: "quick-room-upgrade",
    category: "QUICK_REPLY",
    audience: "guest",
    title: "룸 업그레이드 제안",
    branchScope: ALL_BRANCHES,
    languages: {
      KO: "{guestName} 님, {branchName}에서 객실 업그레이드 가능 여부를 확인해드리겠습니다.",
      EN: "Dear {guestName}, we will check room upgrade availability at {branchName}.",
      JP: "{guestName} 様、{branchName} にて客室アップグレードの可否を確認いたします。",
      CN: "{guestName} 您好，我们将为您确认 {branchName} 的客房升级可用情况。",
    },
    variables: [manualGuestName, branchName],
    attachments: [],
    requiresContext: "none",
    editable: true,
    defaultValue:
      "{guestName} 님, {branchName}에서 객실 업그레이드 가능 여부를 확인해드리겠습니다.",
  }),
  defineTemplate({
    id: "laundry-complete-message",
    category: "GUEST_NOTICE",
    audience: "guest",
    title: "세탁 완료 메시지",
    branchScope: ALL_BRANCHES,
    languages: {
      KO: "{guestName} 님, 맡겨주신 세탁물이 완료되어 프론트에서 수령 가능합니다.",
      EN: "Dear {guestName}, your laundry is ready for pickup at the front desk.",
      JP: "{guestName} 様、お預かりしたランドリーはフロントにてお受け取りいただけます。",
      CN: "{guestName} 您好，您的洗衣已完成，可在前台领取。",
    },
    variables: [manualGuestName, manualRoomNo],
    attachments: [],
    requiresContext: "none",
    editable: true,
    defaultValue: "{guestName} 님, 맡겨주신 세탁물이 완료되어 프론트에서 수령 가능합니다.",
  }),
  defineTemplate({
    id: "remark-card-keys",
    category: "CUSTOMER_RECORDS",
    audience: "pmsRemark",
    title: "제공 카드키",
    branchScope: ALL_BRANCHES,
    languages: {
      KO: "- 제공 카드키 : {count}장",
    },
    variables: [{ name: "count", label: "제공 카드키 수", kind: "manualOptional" }],
    attachments: [],
    requiresContext: "guestRecord",
    editable: true,
    defaultValue: "- 제공 카드키 : {count}장",
  }),
  defineTemplate({
    id: "remark-rentals",
    category: "CUSTOMER_RECORDS",
    audience: "pmsRemark",
    title: "대여물품",
    branchScope: ALL_BRANCHES,
    languages: {
      KO: "- 대여물품 : {items}",
    },
    variables: [{ name: "items", label: "대여물품", kind: "manualOptional" }],
    attachments: [],
    requiresContext: "guestRecord",
    editable: true,
    defaultValue: "- 대여물품 : {items}",
  }),
  defineTemplate({
    id: "remark-airport-van",
    category: "CUSTOMER_RECORDS",
    audience: "pmsRemark",
    title: "공항 밴",
    branchScope: ALL_BRANCHES,
    languages: {
      KO: "- 공항 밴 : {direction} / 이용일 : {useDateTime} / 배차번호 : {dispatchNo}",
    },
    variables: [
      { name: "direction", label: "픽업/샌딩", kind: "manualOptional" },
      { name: "useDateTime", label: "이용일", kind: "manualOptional" },
      { name: "dispatchNo", label: "배차번호", kind: "manualOptional" },
    ],
    attachments: [],
    requiresContext: "guestRecord",
    editable: true,
    defaultValue: "- 공항 밴 : {direction} / 이용일 : {useDateTime} / 배차번호 : {dispatchNo}",
  }),
  defineTemplate({
    id: "remark-medical-bloom",
    category: "CUSTOMER_RECORDS",
    audience: "pmsRemark",
    title: "메디컬블룸",
    branchScope: ALL_BRANCHES,
    languages: {
      KO: "- 메디컬블룸 : {courseName} / 이용일 : {useDateTime} / {status}",
    },
    variables: [
      { name: "courseName", label: "코스이름", kind: "manualOptional" },
      { name: "useDateTime", label: "이용일", kind: "manualOptional" },
      { name: "status", label: "예약문의/예약확정", kind: "manualOptional" },
    ],
    attachments: [],
    requiresContext: "guestRecord",
    editable: true,
    defaultValue: "- 메디컬블룸 : {courseName} / 이용일 : {useDateTime} / {status}",
  }),
  defineTemplate({
    id: "remark-stone-house",
    category: "CUSTOMER_RECORDS",
    audience: "pmsRemark",
    title: "스톤하우스",
    branchScope: ALL_BRANCHES,
    languages: {
      KO: "- 스톤하우스 : {courseName} / 이용일 : {useDateTime} / {status}",
    },
    variables: [
      { name: "courseName", label: "코스이름", kind: "manualOptional" },
      { name: "useDateTime", label: "이용일", kind: "manualOptional" },
      { name: "status", label: "예약문의/예약확정", kind: "manualOptional" },
    ],
    attachments: [],
    requiresContext: "guestRecord",
    editable: true,
    defaultValue: "- 스톤하우스 : {courseName} / 이용일 : {useDateTime} / {status}",
  }),
  defineTemplate({
    id: "report-day-night",
    category: "WORK_TEMPLATE",
    audience: "internal",
    title: "주야간 업무 보고",
    branchScope: ALL_BRANCHES,
    languages: {
      KO: `[ {reportDate} {branchName} 주간/야간 보고 ]

* 근무자 : {staffName}
* 현황
체크인 : {checkInCount}건
재실 : {inHouseCount}건
공실 : {vacantCount}건
* 컴플레인 총 {complaintTotal}건
시설 : {facilityComplaintCount}건
정비 : {maintenanceComplaintCount}건
서비스 : {serviceComplaintCount}건
* 공용부 확인 보고
각 층 복도 및 객실 앞
프론트
* 사진과 같이 보내드립니다.`,
    },
    variables: [
      reportDate,
      branchName,
      staffName,
      { name: "checkInCount", label: "체크인", kind: "manualOptional" },
      { name: "inHouseCount", label: "재실", kind: "manualOptional" },
      { name: "vacantCount", label: "공실", kind: "manualOptional" },
      { name: "complaintTotal", label: "컴플레인 총", kind: "manualOptional" },
      { name: "facilityComplaintCount", label: "시설", kind: "manualOptional" },
      { name: "maintenanceComplaintCount", label: "정비", kind: "manualOptional" },
      { name: "serviceComplaintCount", label: "서비스", kind: "manualOptional" },
    ],
    attachments: [],
    requiresContext: "none",
    editable: true,
    defaultValue: "주야간 업무 보고",
  }),
  defineTemplate({
    id: "report-coex-daily",
    category: "WORK_TEMPLATE",
    audience: "internal",
    title: "코엑스점 일일업무 보고",
    branchScope: ["coex"],
    languages: {
      KO: `[ {reportDate} 코엑스점 일일업무 보고 ]
B동 : {buildingB} / A동 : {buildingA}

예약 기입 (상시)

R/A 대조 (2달) : {raCheck}
네이버&스테이션 재고 확인 (2달) : {inventoryCheck}
네이버&스테이션 실 예약 확인 (2달) : {reservationCheck}
마케팅 협찬 누락 확인 : {marketingCheck}
전체청소 메세지 송신 : {cleaningMessageSent}
어라이벌 시트 작성 [17시까지] : {arrivalSheet}
오더리스트 작성 [17시까지] : {orderList}
분실물 회수 [17시 이후] : {lostAndFound}`,
    },
    variables: [
      reportDate,
      { name: "buildingB", label: "B동", kind: "manualOptional" },
      { name: "buildingA", label: "A동", kind: "manualOptional" },
      { name: "raCheck", label: "R/A 대조", kind: "manualOptional" },
      { name: "inventoryCheck", label: "재고 확인", kind: "manualOptional" },
      { name: "reservationCheck", label: "실 예약 확인", kind: "manualOptional" },
      { name: "marketingCheck", label: "마케팅 협찬 누락", kind: "manualOptional" },
      { name: "cleaningMessageSent", label: "전체청소 메세지", kind: "manualOptional" },
      { name: "arrivalSheet", label: "어라이벌 시트", kind: "manualOptional" },
      { name: "orderList", label: "오더리스트", kind: "manualOptional" },
      { name: "lostAndFound", label: "분실물 회수", kind: "manualOptional" },
    ],
    attachments: [],
    requiresContext: "none",
    editable: true,
    defaultValue: "코엑스점 일일업무 보고",
  }),
  defineTemplate({
    id: "report-sales",
    category: "WORK_TEMPLATE",
    audience: "internal",
    title: "매출 보고",
    branchScope: ALL_BRANCHES,
    languages: {
      KO: `* 날짜\t객실번호\t체크인\t내용\t금액
* {salesDate}\t{roomNo}\t{checkInDate}\t{salesItem}\t{amount}
* 메모 : {memo}`,
    },
    variables: [
      { name: "salesDate", label: "날짜", kind: "manualOptional" },
      { name: "roomNo", label: "객실번호", kind: "manualOptional" },
      { name: "checkInDate", label: "체크인", kind: "manualOptional" },
      { name: "salesItem", label: "내용", kind: "manualOptional" },
      { name: "amount", label: "금액", kind: "manualOptional" },
      { name: "memo", label: "메모", kind: "manualOptional" },
    ],
    attachments: [],
    requiresContext: "none",
    editable: true,
    defaultValue: "매출 보고",
  }),
  defineTemplate({
    id: "report-dodine-sales",
    category: "WORK_TEMPLATE",
    audience: "internal",
    title: "매출 드오디네 보고",
    branchScope: ALL_BRANCHES,
    languages: {
      KO: `* {salesDate}\t{itemName}\t\t{name}\t{amount}
* 메모 : {memo}`,
    },
    variables: [
      { name: "salesDate", label: "날짜", kind: "manualOptional" },
      { name: "itemName", label: "상품", kind: "manualOptional" },
      { name: "name", label: "이름", kind: "manualOptional" },
      { name: "amount", label: "금액", kind: "manualOptional" },
      { name: "memo", label: "메모", kind: "manualOptional" },
    ],
    attachments: [],
    requiresContext: "none",
    editable: true,
    defaultValue: "매출 드오디네 보고",
  }),
  defineTemplate({
    id: "report-airport-van",
    category: "WORK_TEMPLATE",
    audience: "internal",
    title: "공항밴 예약보고",
    branchScope: ALL_BRANCHES,
    languages: {
      KO: `* 예약 받은 날짜\t탑승일자\t체크인 날짜\t탑승시각\t객실번호 (없으면 공란)
* {receivedDate}\t{rideDate}\t{checkInDate}\t{rideTime}\t{roomNo}`,
    },
    variables: [
      { name: "receivedDate", label: "예약 받은 날짜", kind: "manualOptional" },
      { name: "rideDate", label: "탑승일자", kind: "manualOptional" },
      { name: "checkInDate", label: "체크인 날짜", kind: "manualOptional" },
      { name: "rideTime", label: "탑승시각", kind: "manualOptional" },
      { name: "roomNo", label: "객실번호", kind: "manualOptional" },
    ],
    attachments: [],
    requiresContext: "none",
    editable: true,
    defaultValue: "공항밴 예약보고",
  }),
]);

export function getWorkflowTemplatesByCategory(category: TemplateDefinition["category"]) {
  return WORKFLOW_TEMPLATE_CATALOG.filter((template) => template.category === category);
}

export function getWorkflowTemplate(templateId: string): TemplateDefinition | null {
  return WORKFLOW_TEMPLATE_CATALOG.find((template) => template.id === templateId) || null;
}

export function applyStoredTemplateState(
  state: StoredExtensionState,
  baseCatalog: readonly TemplateDefinition[] = WORKFLOW_TEMPLATE_CATALOG,
): TemplateDefinition[] {
  const builtInTemplates = baseCatalog.map((template) => {
    const override = state.templateOverrides[template.id];
    if (!override) return template;

    return {
      ...template,
      ...override,
      languages: override.languages
        ? { ...template.languages, ...override.languages }
        : template.languages,
      branchScope: override.branchScope || template.branchScope,
      variables: override.variables || template.variables,
      attachments: override.attachments || template.attachments,
      defaultValue: override.defaultValue || template.defaultValue,
    };
  });

  return [...builtInTemplates, ...state.customTemplates];
}

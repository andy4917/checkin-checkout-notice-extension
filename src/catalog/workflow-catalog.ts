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

const hotelName: TemplateVariable = {
  name: "hotelName",
  label: "호텔명",
  kind: "manualOptional",
};

const roomType: TemplateVariable = {
  name: "roomType",
  label: "객실 타입",
  kind: "manualOptional",
};

const rentalItemName: TemplateVariable = {
  name: "rentalItemName",
  label: "대여 물품명",
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

const airportVanRequestVariables: TemplateVariable[] = [
  { name: "airportName1", label: "공항명 1", kind: "manualOptional" },
  { name: "cashRate1", label: "현금가 1", kind: "manualOptional" },
  { name: "cardRate1", label: "카드가 1", kind: "manualOptional" },
  { name: "airportName2", label: "공항명 2", kind: "manualOptional" },
  { name: "cashRate2", label: "현금가 2", kind: "manualOptional" },
  { name: "cardRate2", label: "카드가 2", kind: "manualOptional" },
  { name: "cashRate3", label: "현금가 3", kind: "manualOptional" },
  { name: "cardRate3", label: "카드가 3", kind: "manualOptional" },
  { name: "cashRate4", label: "현금가 4", kind: "manualOptional" },
  { name: "cardRate4", label: "카드가 4", kind: "manualOptional" },
  { name: "maxPassengers", label: "최대 탑승 인원", kind: "manualOptional" },
  { name: "maxLuggage", label: "최대 수하물 수량", kind: "manualOptional" },
  { name: "receptionHours", label: "리셉션 운영시간", kind: "manualOptional" },
  { name: "rideDirection", label: "이용 구분", kind: "manualOptional" },
  { name: "rideDate", label: "이용 날짜", kind: "manualOptional" },
  { name: "pickupTime", label: "픽업 희망 시간", kind: "manualOptional" },
  { name: "departurePoint", label: "출발지", kind: "manualOptional" },
  { name: "destination", label: "도착지", kind: "manualOptional" },
  { name: "airportName", label: "공항명", kind: "manualOptional" },
  { name: "terminal", label: "터미널", kind: "manualOptional" },
  { name: "flightNo", label: "항공편명", kind: "manualOptional" },
  { name: "flightTime", label: "항공 시간", kind: "manualOptional" },
  { name: "guestName", label: "고객명", kind: "manualOptional" },
  { name: "guestContact", label: "고객 연락처", kind: "manualOptional" },
  { name: "passengerCount", label: "인원수", kind: "manualOptional" },
  { name: "largeLuggageCount", label: "대형 수하물 수", kind: "manualOptional" },
  { name: "smallLuggageCount", label: "소형 수하물 수", kind: "manualOptional" },
  { name: "paymentMethod", label: "결제 수단", kind: "manualOptional" },
  { name: "requestNote", label: "요청사항", kind: "manualOptional" },
];

const airportVanDispatchVariables: TemplateVariable[] = [
  { name: "guestName", label: "고객명", kind: "manualOptional" },
  { name: "reservationTime", label: "예약 시간", kind: "manualOptional" },
  { name: "terminal", label: "터미널", kind: "manualOptional" },
  { name: "exitNo", label: "출구 번호", kind: "manualOptional" },
  { name: "vehicleNo", label: "차량번호", kind: "manualOptional" },
  { name: "boardingLocation", label: "탑승 위치", kind: "manualOptional" },
  { name: "hotelBoardingLocation", label: "호텔 탑승 위치", kind: "manualOptional" },
  { name: "emergencyContact", label: "비상 연락처", kind: "manualOptional" },
];

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
      KO: "{guestName} 님, {hotelName}에서 {roomType} 객실 업그레이드 가능 여부를 확인해드리겠습니다.",
      EN: "Dear {guestName}, we will check {roomType} room upgrade availability at {hotelName}.",
      JP: "{guestName} 様、{hotelName} にて {roomType} 客室アップグレードの可否を確認いたします。",
      CN: "{guestName} 您好，我们将为您确认 {hotelName} 的 {roomType} 客房升级可用情况。",
    },
    variables: [manualGuestName, hotelName, roomType],
    attachments: [],
    requiresContext: "none",
    editable: true,
    defaultValue:
      "{guestName} 님, {hotelName}에서 {roomType} 객실 업그레이드 가능 여부를 확인해드리겠습니다.",
  }),
  defineTemplate({
    id: "quick-rental-item-inquiry",
    category: "QUICK_REPLY",
    audience: "guest",
    title: "물품 대여 문의",
    branchScope: ALL_BRANCHES,
    languages: {
      KO: "문의주신 {rentalItemName}은 프론트에서 대여하실 수 있습니다.",
      EN: "The {rentalItemName} you inquired about is available to borrow at the front desk.",
      JP: "お問い合わせいただいた{rentalItemName}は、フロントにて貸出可能でございます。",
      CN: "您咨询的{rentalItemName}可在前台借用。",
    },
    variables: [rentalItemName],
    attachments: [],
    requiresContext: "none",
    editable: true,
    defaultValue: "문의주신 {rentalItemName}은 프론트에서 대여하실 수 있습니다.",
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
    variables: [manualGuestName],
    attachments: [],
    requiresContext: "none",
    editable: true,
    defaultValue: "{guestName} 님, 맡겨주신 세탁물이 완료되어 프론트에서 수령 가능합니다.",
  }),
  defineTemplate({
    id: "airport-van-request-guide",
    category: "GUEST_NOTICE",
    audience: "guest",
    title: "공항밴 예약 요청 및 요금 안내",
    branchScope: ALL_BRANCHES,
    languages: {
      KO: `안녕하세요, 고객님.

공항밴 서비스 안내드립니다.

## 요금 안내

- {airportName1} -> 호텔: {cashRate1} / {cardRate1}
- {airportName2} -> 호텔: {cashRate2} / {cardRate2}
- 호텔 -> {airportName1}: {cashRate3} / {cardRate3}
- 호텔 -> {airportName2}: {cashRate4} / {cardRate4}

## 이용 안내

- 예약이 확정되면 기사님이 지정된 장소에서 고객님을 픽업합니다.
- 차량은 수하물을 포함하여 최대 {maxPassengers}까지 탑승 가능합니다.
- 최대 수하물 기준은 {maxLuggage}입니다.
- 사전 공유되지 않은 인원 또는 수하물이 추가될 경우, 추가 요금이 발생할 수 있습니다.
- 리셉션 운영 시간은 {receptionHours}입니다. 해당 시간 외 체크인 예정인 경우 미리 알려주세요.

## 공항밴 예약 요청 양식

예약을 원하실 경우 아래 정보를 보내주시기 바랍니다.

- 이용 구분: {rideDirection}
- 이용 날짜: {rideDate}
- 픽업 희망 시간: {pickupTime}
- 출발지: {departurePoint}
- 도착지: {destination}
- 공항명: {airportName}
- 터미널: {terminal}
- 항공편명: {flightNo}
- 항공 도착/출발 시간: {flightTime}
- 예약자명: {guestName}
- 연락처: {guestContact}
- 탑승 인원: {passengerCount}
- 수하물: 대형 {largeLuggageCount} / 소형 {smallLuggageCount}
- 결제 수단: {paymentMethod}
- 요청사항: {requestNote}

요청 정보를 확인한 뒤 가능 여부 및 최종 요금을 안내드리겠습니다.

감사합니다.`,
      EN: `Hello,

Please find the airport van service information below.

## Rates

- {airportName1} -> Hotel: {cashRate1} / {cardRate1}
- {airportName2} -> Hotel: {cashRate2} / {cardRate2}
- Hotel -> {airportName1}: {cashRate3} / {cardRate3}
- Hotel -> {airportName2}: {cashRate4} / {cardRate4}

## Service Notice

- Once the reservation is confirmed, the driver will pick you up at the designated location.
- The vehicle can accommodate up to {maxPassengers}, including luggage.
- The maximum luggage allowance is {maxLuggage}.
- Additional charges may apply if passengers or luggage not shared in advance are added.
- Reception hours are {receptionHours}. If you plan to check in outside these hours, please let us know in advance.

## Airport Van Reservation Request Form

If you would like to make a reservation, please send us the information below.

- Service Type: {rideDirection}
- Service Date: {rideDate}
- Preferred Pick-up Time: {pickupTime}
- Departure Point: {departurePoint}
- Destination: {destination}
- Airport: {airportName}
- Terminal: {terminal}
- Flight Number: {flightNo}
- Flight Arrival/Departure Time: {flightTime}
- Guest Name: {guestName}
- Contact Number: {guestContact}
- Number of Passengers: {passengerCount}
- Luggage: Large {largeLuggageCount} / Small {smallLuggageCount}
- Payment Method: {paymentMethod}
- Requests: {requestNote}

After checking the details, we will inform you of availability and the final rate.

Thank you.`,
      JP: `こんにちは。

空港バンサービスについてご案内いたします。

## 料金案内

- {airportName1} -> ホテル: {cashRate1} / {cardRate1}
- {airportName2} -> ホテル: {cashRate2} / {cardRate2}
- ホテル -> {airportName1}: {cashRate3} / {cardRate3}
- ホテル -> {airportName2}: {cashRate4} / {cardRate4}

## ご利用案内

- ご予約が確定しましたら、ドライバーが指定場所にてお迎えいたします。
- 車両はお荷物を含めて最大{maxPassengers}までご利用いただけます。
- 最大お荷物数の目安は{maxLuggage}です。
- 事前に共有されていない人数またはお荷物が追加される場合、追加料金が発生する場合がございます。
- レセプション営業時間は{receptionHours}です。営業時間外にチェックイン予定の場合は、事前にお知らせください。

## 空港バン予約リクエストフォーム

ご予約をご希望の場合は、下記情報をお送りください。

- 利用区分: {rideDirection}
- 利用日: {rideDate}
- 希望ピックアップ時間: {pickupTime}
- 出発地: {departurePoint}
- 到着地: {destination}
- 空港名: {airportName}
- ターミナル: {terminal}
- 便名: {flightNo}
- 航空便の到着/出発時間: {flightTime}
- 予約者名: {guestName}
- 連絡先: {guestContact}
- 乗車人数: {passengerCount}
- 荷物: 大型 {largeLuggageCount} / 小型 {smallLuggageCount}
- 支払い方法: {paymentMethod}
- ご要望: {requestNote}

内容を確認後、手配可否および最終料金をご案内いたします。

ありがとうございます。`,
      CN: `您好。

以下为机场接送车服务说明。

## 费用说明

- {airportName1} -> 酒店：{cashRate1} / {cardRate1}
- {airportName2} -> 酒店：{cashRate2} / {cardRate2}
- 酒店 -> {airportName1}：{cashRate3} / {cardRate3}
- 酒店 -> {airportName2}：{cashRate4} / {cardRate4}

## 使用说明

- 预约确认后，司机将在指定地点接您。
- 车辆包含行李在内最多可乘坐{maxPassengers}。
- 最大行李数量标准为{maxLuggage}。
- 如增加未提前告知的乘客或行李，可能会产生额外费用。
- 前台营业时间为{receptionHours}。如您预计在该时间以外办理入住，请提前告知我们。

## 机场接送车预约申请表

如需预约，请发送以下信息。

- 使用区分：{rideDirection}
- 使用日期：{rideDate}
- 希望接送时间：{pickupTime}
- 出发地：{departurePoint}
- 目的地：{destination}
- 机场名称：{airportName}
- 航站楼：{terminal}
- 航班号：{flightNo}
- 航班到达/出发时间：{flightTime}
- 预约人姓名：{guestName}
- 联系电话：{guestContact}
- 乘车人数：{passengerCount}
- 行李：大型 {largeLuggageCount} / 小型 {smallLuggageCount}
- 支付方式：{paymentMethod}
- 其他需求：{requestNote}

我们确认信息后，将再次告知您是否可预约及最终费用。

谢谢。`,
    },
    variables: airportVanRequestVariables,
    attachments: [],
    requiresContext: "none",
    editable: true,
    defaultValue: "공항밴 예약 요청 및 요금 안내",
  }),
  defineTemplate({
    id: "airport-van-dispatch-confirmed",
    category: "GUEST_NOTICE",
    audience: "guest",
    title: "공항밴 배차 완료 안내",
    branchScope: ALL_BRANCHES,
    languages: {
      KO: `## A. 공항 픽업

{guestName}님,

{reservationTime} 공항밴 예약이 확정되었습니다.

기사님은 {terminal} {exitNo}에서 고객님 성함이 적힌 피켓을 들고 대기할 예정입니다.

차량번호: {vehicleNo}
탑승 위치: {boardingLocation}
비상 연락처: {emergencyContact}

탑승 중 문제가 발생할 경우 위 연락처로 연락 부탁드립니다.

감사합니다.

---

## B. 호텔 샌딩

{guestName}님,

{reservationTime} 공항밴 예약이 확정되었습니다.

기사님은 예약 시간에 {hotelBoardingLocation}에서 대기할 예정입니다.

차량번호: {vehicleNo}
비상 연락처: {emergencyContact}

탑승 중 문제가 발생할 경우 위 연락처로 연락 부탁드립니다.

감사합니다.`,
      EN: `## A. Airport Pick-up

Dear {guestName},

Your airport van reservation for {reservationTime} has been confirmed.

The driver will be waiting at {terminal} {exitNo}, holding a sign with your name.

Vehicle Number: {vehicleNo}
Boarding Location: {boardingLocation}
Emergency Contact: {emergencyContact}

If you encounter any issues during boarding, please contact the number above for assistance.

Thank you.

---

## B. Hotel Sending

Dear {guestName},

Your airport van reservation for {reservationTime} has been confirmed.

The driver will be waiting at {hotelBoardingLocation} at the scheduled time.

Vehicle Number: {vehicleNo}
Emergency Contact: {emergencyContact}

If you encounter any issues during boarding, please contact the number above for assistance.

Thank you.`,
      JP: `## A. 空港ピックアップ

{guestName} 様

{reservationTime}の空港バン予約が確定いたしました。

ドライバーは{terminal} {exitNo}にて、お客様のお名前が記載されたサインを持ってお待ちしております。

車両番号: {vehicleNo}
乗車場所: {boardingLocation}
緊急連絡先: {emergencyContact}

ご乗車時に問題が発生した場合は、上記連絡先までご連絡くださいませ。

ありがとうございます。

---

## B. ホテルから空港への送迎

{guestName} 様

{reservationTime}の空港バン予約が確定いたしました。

ドライバーは予約時間に{hotelBoardingLocation}でお待ちしております。

車両番号: {vehicleNo}
緊急連絡先: {emergencyContact}

ご乗車時に問題が発生した場合は、上記連絡先までご連絡くださいませ。

ありがとうございます。`,
      CN: `## A. 机场接机

尊敬的 {guestName}，您好。

您{reservationTime}的机场接送车预约已确认。

司机将在{terminal} {exitNo}举着写有您姓名的接机牌等候。

车辆号码：{vehicleNo}
上车地点：{boardingLocation}
紧急联系方式：{emergencyContact}

如上车过程中遇到问题，请联系以上号码寻求协助。

谢谢。

---

## B. 酒店送机

尊敬的 {guestName}，您好。

您{reservationTime}的机场接送车预约已确认。

司机将在预约时间于{hotelBoardingLocation}等候。

车辆号码：{vehicleNo}
紧急联系方式：{emergencyContact}

如上车过程中遇到问题，请联系以上号码寻求协助。

谢谢。`,
    },
    variables: airportVanDispatchVariables,
    attachments: [],
    requiresContext: "none",
    editable: true,
    defaultValue: "공항밴 배차 완료 안내",
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
    title: "매지출 보고",
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
    defaultValue: "매지출 보고",
  }),
  defineTemplate({
    id: "report-dodine-sales",
    category: "WORK_TEMPLATE",
    audience: "internal",
    title: "매지출 드오디네 보고",
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
    defaultValue: "매지출 드오디네 보고",
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

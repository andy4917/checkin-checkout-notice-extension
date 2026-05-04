import test from "node:test";
import assert from "node:assert/strict";

import { guardRequiredContext } from "../src/application/context-guard.js";
import {
  ManualRequiredValueMissingError,
  PmsRequiredValueMissingError,
  TemplateLanguageUnavailableError,
  UnsupportedLanguageError,
  getAvailableTemplateLanguages,
  hasTemplateLanguage,
  renderTemplate,
} from "../src/catalog/template-renderer.js";
import { createCustomTemplateDefinition } from "../src/catalog/template-schema.js";
import {
  WORKFLOW_TEMPLATE_CATALOG,
  getWorkflowTemplate,
  getWorkflowTemplatesByCategory,
} from "../src/catalog/workflow-catalog.js";
import {
  resolveDefaultLanguageFromNationality,
  resolveDefaultLanguageFromNationalityFields,
  resolveLanguageFromNationality,
} from "../src/domain/language.js";
import {
  createRemarkLine,
  getBuiltInRemarkType,
  upsertRemarkLine,
} from "../src/domain/remarks.js";

test("template catalog covers each real work family without non-product categories", () => {
  const categories = new Set(WORKFLOW_TEMPLATE_CATALOG.map((template) => template.category));
  assert.deepEqual([...categories].sort(), [
    "CUSTOMER_RECORDS",
    "GUEST_NOTICE",
    "QUICK_REPLY",
    "WORK_TEMPLATE",
  ]);

  assert.deepEqual(
    getWorkflowTemplatesByCategory("WORK_TEMPLATE")
      .map((template) => template.id)
      .sort(),
    [
      "report-airport-van",
      "report-coex-daily",
      "report-day-night",
      "report-dodine-sales",
      "report-sales",
    ],
  );
});

test("guest notices and quick replies render through the same catalog renderer", () => {
  const notice = getWorkflowTemplate("guest-arrival-notice");
  const reply = getWorkflowTemplate("quick-room-upgrade");
  const rentalReply = getWorkflowTemplate("quick-rental-item-inquiry");
  const lostItemReply = getWorkflowTemplate("quick-lost-item-inquiry");
  const roomVisitReply = getWorkflowTemplate("quick-room-visit-notice");
  const selfCheckinGuide = getWorkflowTemplate("self-checkin-guide");
  const roomUpgradeOffer = getWorkflowTemplate("room-upgrade-offer");
  const airportVanRequest = getWorkflowTemplate("airport-van-request-guide");

  assert.ok(notice);
  assert.ok(reply);
  assert.ok(rentalReply);
  assert.ok(lostItemReply);
  assert.ok(roomVisitReply);
  assert.ok(selfCheckinGuide);
  assert.ok(roomUpgradeOffer);
  assert.ok(airportVanRequest);

  assert.equal(notice.requiresContext, "pmsPage");
  assert.equal(reply.requiresContext, "none");
  assert.deepEqual(getAvailableTemplateLanguages(airportVanRequest), ["KO", "EN", "JP", "CN"]);
  assert.match(
    renderTemplate(reply, "KO", {
      guestName: "Kim",
      hotelName: "The Coex",
      roomType: "Suite",
    }),
    /The Coex.*Suite 객실 업그레이드/,
  );
  assert.match(renderTemplate(rentalReply, "KO", { rentalItemName: "다리미" }), /다리미/);
  assert.match(renderTemplate(lostItemReply, "KO", { lostItemName: "충전기" }), /충전기/);
  assert.match(renderTemplate(roomVisitReply, "KO", { visitTime: "15분" }), /15분 이내/);
  assert.match(
    renderTemplate(selfCheckinGuide, "KO", {
      guestName: "Kim",
      hotelName: "UH Suite",
      selfCheckinTime: "22:00",
      keyStorageLocation: "프론트 보관함",
      roomNumberCheckMethod: "문자 안내",
      checkOutTime: "11:00",
      receptionHours: "09:00-22:00",
      representativePhone: "대표 연락처",
      emergencyContact: "비상 연락처",
      entranceLockTime: "22:00",
      entrancePassword: "1234",
    }),
    /프론트 보관함.*1234/s,
  );
  assert.match(
    renderTemplate(roomUpgradeOffer, "KO", {
      guestName: "Kim",
      hotelName: "UH Suite",
      currentRoomType: "스튜디오",
      currentBaseOccupancy: "2인",
      upgradeCondition: "무료",
      upgradeRoomType: "스위트",
      upgradeBaseOccupancy: "4인",
      roomFeature1: "침실",
      roomFeature2: "거실",
      roomFeature3: "욕실",
      upgradeNotice: "층수 차이",
      replyDeadlineCondition: "18시까지 회신",
    }),
    /무료.*스위트.*18시까지 회신/s,
  );
});

test("renderer preserves required PMS failure while allowing intentional manual blanks", () => {
  const workTemplate = getWorkflowTemplate("report-airport-van");
  const guestNotice = getWorkflowTemplate("guest-arrival-notice");
  assert.ok(workTemplate);
  assert.ok(guestNotice);

  assert.match(renderTemplate(workTemplate, "KO", { rideDate: "2026. 04. 27" }), /2026\. 04\. 27/);
  assert.match(renderTemplate(workTemplate, "KO", { rideDate: "2026. 04. 27" }), /\t$/);
  assert.throws(
    () => renderTemplate(guestNotice, "KO", { guestName: "Kim" }),
    PmsRequiredValueMissingError,
  );

  const requiredTemplate = createCustomTemplateDefinition({
    id: "custom-required-variable",
    category: "QUICK_REPLY",
    audience: "guest",
    title: "필수값",
    branchScope: ["coex"],
    languages: { KO: "{requiredValue}" },
    variables: [{ name: "requiredValue", label: "필수값", kind: "manualRequired" }],
    requiresContext: "none",
    defaultValue: "{requiredValue}",
  });
  assert.throws(() => renderTemplate(requiredTemplate, "KO", {}), ManualRequiredValueMissingError);
});

test("renderer maps Korean bracket variables without string routing heuristics", () => {
  const bracketTemplate = createCustomTemplateDefinition({
    id: "custom-bracket-variable",
    category: "QUICK_REPLY",
    audience: "guest",
    title: "대괄호 변수",
    branchScope: ["coex"],
    languages: { KO: "[호텔명] [객실 타입] [대여 물품명] {unknownValue}" },
    variables: [
      { name: "hotelName", label: "호텔명", kind: "manualOptional" },
      { name: "roomType", label: "객실 타입", kind: "manualOptional" },
      { name: "rentalItemName", label: "대여 물품명", kind: "manualOptional" },
    ],
    requiresContext: "none",
    defaultValue: "[호텔명] [객실 타입] [대여 물품명]",
  });

  assert.equal(
    renderTemplate(bracketTemplate, "KO", {
      hotelName: "The Coex",
      roomType: "Suite",
      rentalItemName: "다리미",
    }),
    "The Coex Suite 다리미 {unknownValue}",
  );
});

test("language availability disables unsupported render paths explicitly", () => {
  const salesReport = getWorkflowTemplate("report-sales");
  assert.ok(salesReport);

  assert.deepEqual(getAvailableTemplateLanguages(salesReport), ["KO"]);
  assert.equal(hasTemplateLanguage(salesReport, "EN"), false);
  assert.throws(
    () => renderTemplate(salesReport, "EN", { salesDate: "2026. 04. 29" }),
    TemplateLanguageUnavailableError,
  );
  assert.throws(() => renderTemplate(salesReport, "ES"), UnsupportedLanguageError);
});

test("context guard blocks PMS-only and guest-record actions with operator messages", () => {
  assert.deepEqual(guardRequiredContext("pmsPage", { isPmsPage: false, isGuestRecord: false }), {
    ok: false,
    message: "로그인된 WINGS 페이지를 열어주십시오",
  });
  assert.deepEqual(guardRequiredContext("guestRecord", { isPmsPage: true, isGuestRecord: false }), {
    ok: false,
    message: "고객정보를 열어주십시오",
  });
  assert.deepEqual(guardRequiredContext("none", { isPmsPage: false, isGuestRecord: false }), {
    ok: true,
  });
});

test("remark rendering keeps formatting centralized outside Svelte components", () => {
  assert.equal(getBuiltInRemarkType("remark-card-keys"), "cardKeys");
  assert.equal(getBuiltInRemarkType("remark-airport-van"), null);
  assert.equal(createRemarkLine("cardKeys", { count: 2 }), "- 제공 카드키 : 2장");

  const existing = "기존 메모입니다.\n- 대여물품 : 변환기 1개";
  assert.equal(
    upsertRemarkLine(existing, "rentals", { items: "변환기 1개 / 충전기 1개" }),
    "기존 메모입니다.\n- 대여물품 : 변환기 1개 / 충전기 1개",
  );
});

test("nationality mapping returns only supported template languages", () => {
  assert.equal(resolveLanguageFromNationality("KOR"), "KO");
  assert.equal(resolveLanguageFromNationality("United States"), "EN");
  assert.equal(resolveLanguageFromNationality("Japan"), "JP");
  assert.equal(resolveLanguageFromNationality("China"), "CN");
  assert.equal(resolveLanguageFromNationality("Brazil"), null);
  assert.equal(resolveDefaultLanguageFromNationality("Brazil"), "EN");
  assert.equal(resolveDefaultLanguageFromNationalityFields({ NATL_CODE: "JPN" }), "JP");
  assert.equal(resolveDefaultLanguageFromNationalityFields({ COUNTRY: "Unknown" }), "EN");
});

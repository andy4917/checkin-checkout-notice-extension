import test from "node:test";
import assert from "node:assert/strict";

import { normalizeStoredExtensionState } from "../src/platform/storage-schema.js";
import { homeBottomNavigationItems, homeNavigationGroups } from "../src/catalog/menu-routing.js";
import type { SidePanelNavigationControllerDependencies } from "../src/ui/side-panel-navigation-controller.svelte.js";
import type { StoredExtensionState } from "../src/catalog/template-types.js";

async function createControllerHarness(
  initial: unknown,
  pmsRows: Array<Record<string, string>> = [
    {
      GUEST_NAME: "Kim",
      ROOM_NO: "1302",
      DEPT_DATE: "2026-05-25",
      RSVN_STATUS_CODE: "RR",
      NAT_CODE: "KOR",
    },
  ],
  options: { recovered?: boolean } = {},
) {
  Object.assign(globalThis, {
    $state: <T>(value: T) => value,
  });
  const { createSidePanelNavigationController } = await import(
    "../src/ui/side-panel-navigation-controller.svelte.js"
  );
  let state = normalizeStoredExtensionState(initial);
  const laundryStore: Record<string, unknown> = {};
  const writes: string[] = [];
  const pmsCalls: Array<{ input: string; body: URLSearchParams }> = [];

  const dependencies: SidePanelNavigationControllerDependencies = {
    extensionState: {
      async readWithRecovery() {
        return { state, recovered: Boolean(options.recovered) };
      },
      async setLastBranchId(branchId) {
        state = { ...state, lastBranchId: branchId };
      },
      async writeState(nextState: StoredExtensionState) {
        state = normalizeStoredExtensionState(nextState);
      },
    },
    clipboard: {
      async writeText(text) {
        writes.push(text);
      },
    },
    laundryStorage: {
      async get(keys) {
        return Object.fromEntries(keys.map((key) => [key, laundryStore[key]]));
      },
      async set(values) {
        Object.assign(laundryStore, values);
      },
    },
    otaReservation: {
      async fetchPayload() {
        throw new Error("not used");
      },
      async fillForm() {
        throw new Error("not used");
      },
    },
    pmsGuests: {
      async fetchImpl(input, init) {
        pmsCalls.push({ input, body: init.body });
        return {
          ok: true,
          json: async () => ({
            rows: pmsRows,
          }),
        };
      },
    },
    dateSource: {
      today() {
        return new Date("2026-05-25T09:00:00+09:00");
      },
    },
  };

  return {
    controller: createSidePanelNavigationController(dependencies),
    getState: () => state,
    getLaundryStore: () => laundryStore,
    writes,
    pmsCalls,
  };
}

test("quick reply manual values are saved in settings state and used for copy output", async () => {
  const { controller, getState, writes } = await createControllerHarness({
    schemaVersion: 1,
    lastBranchId: "coex",
    templateOverrides: {},
    customTemplates: [],
    ui: {},
  });

  await controller.mount();
  await controller.openMenu("QUICK_REPLY");

  assert.ok(controller.requiredManualVariables.some((variable) => variable.name === "rentalItemName"));
  await controller.setTemplateVariableValue("rentalItemName", "충전기");
  assert.equal(getState().ui.templateVariableValues?.rentalItemName, "충전기");

  await controller.copyTemplate("quick-rental-item-inquiry");

  assert.equal(controller.statusMessage, "");
  assert.equal(controller.statusTone, "neutral");
  assert.match(writes.at(-1) || "", /충전기/);
  assert.doesNotMatch(writes.at(-1) || "", /\{rentalItemName\}|\[대여 물품명\]/);
});

test("manual required quick replies fail visibly until the required input is present", async () => {
  const { controller, writes } = await createControllerHarness({
    schemaVersion: 1,
    lastBranchId: "coex",
    templateOverrides: {},
    customTemplates: [],
    ui: {},
  });

  await controller.mount();
  await controller.openMenu("QUICK_REPLY");
  await controller.copyTemplate("quick-rental-item-inquiry");

  assert.equal(writes.length, 0);
  assert.equal(controller.statusTone, "error");
  assert.equal(controller.statusMessage, "비어있는 필수 입력란을 확인 후 다시 시도해주십시오.");
});

test("home accordion templates copy without opening a work menu", async () => {
  const { controller, writes } = await createControllerHarness({
    schemaVersion: 1,
    lastBranchId: "coex",
    templateOverrides: {},
    customTemplates: [],
    ui: {
      templateVariableValues: {
        rentalItemName: "가습기",
      },
    },
  });

  await controller.mount();
  const quickRental = homeNavigationGroups[1]?.items.find((item) => item.id === "quick-rental");
  assert.ok(quickRental);
  assert.equal(controller.homeInlineTemplatesByItemId["quick-rental"]?.some((template) => template.id === "quick-rental-item-inquiry"), true);

  await controller.copyHomeTemplate(quickRental, "quick-rental-item-inquiry");

  assert.equal(controller.activeMenuId, null);
  assert.equal(controller.statusMessage, "");
  assert.equal(controller.statusTone, "neutral");
  assert.match(writes.at(-1) || "", /가습기/);
});

test("home accordion PMS page templates copy without requiring WINGS values", async () => {
  const { controller, writes } = await createControllerHarness({
    schemaVersion: 1,
    lastBranchId: "coex",
    templateOverrides: {},
    customTemplates: [],
    ui: {},
  });

  await controller.mount();
  const checkinNotice = homeNavigationGroups[0]?.items.find((item) => item.id === "customer-checkin");
  assert.ok(checkinNotice);
  assert.equal(
    controller.homeInlineTemplatesByItemId["customer-checkin"]?.some((template) => template.id === "guest-arrival-notice"),
    true,
  );

  await controller.copyHomeTemplate(checkinNotice, "guest-arrival-notice");

  assert.equal(controller.activeMenuId, null);
  assert.equal(writes.length, 1);
  assert.equal(controller.copiedTemplateId, "guest-arrival-notice");
  assert.equal(controller.statusTone, "neutral");
  assert.equal(controller.statusMessage, "");
  assert.doesNotMatch(writes.at(-1) || "", /\{|\}|\[|\]/);
});

test("language selection briefly enters a dedicated loading state", async () => {
  const { controller } = await createControllerHarness({
    schemaVersion: 1,
    lastBranchId: "coex",
    templateOverrides: {},
    customTemplates: [],
    ui: {},
  });

  await controller.mount();
  assert.equal(controller.selectedLanguage, "KO");
  assert.equal(controller.languageChanging, false);

  controller.selectLanguage("EN");

  assert.equal(controller.selectedLanguage, "EN");
  assert.equal(controller.languageChanging, true);

  await new Promise((resolve) => setTimeout(resolve, 220));
  assert.equal(controller.languageChanging, false);
});

test("recovered extension storage is visible to the operator", async () => {
  const { controller } = await createControllerHarness(
    {
      schemaVersion: 1,
      lastBranchId: "coex",
      templateOverrides: {},
      customTemplates: [],
      ui: {},
    },
    undefined,
    { recovered: true },
  );

  await controller.mount();

  assert.equal(
    controller.statusMessage,
    "저장된 데이터 손상이 발견되었습니다. 복구를 시도하여 이전 데이터를 불러와주십시오.",
  );
  assert.equal(controller.statusTone, "error");
});

test("initial storage dependency failure is normalized instead of escaping mount", async () => {
  Object.assign(globalThis, {
    $state: <T>(value: T) => value,
  });
  const { createSidePanelNavigationController } = await import(
    "../src/ui/side-panel-navigation-controller.svelte.js"
  );
  const dependencies: SidePanelNavigationControllerDependencies = {
    extensionState: {
      async readWithRecovery() {
        throw new Error("Chrome storage dependency is not available.");
      },
      async setLastBranchId() {},
      async writeState() {},
    },
    clipboard: {
      async writeText() {},
    },
    laundryStorage: {
      async get() {
        return {};
      },
      async set() {},
    },
    otaReservation: {
      async fetchPayload() {
        throw new Error("not used");
      },
      async fillForm() {
        throw new Error("not used");
      },
    },
    pmsGuests: {
      async fetchImpl() {
        throw new Error("not used");
      },
    },
    dateSource: {
      today() {
        return new Date("2026-05-25T09:00:00+09:00");
      },
    },
  };
  const controller = createSidePanelNavigationController(dependencies);

  await controller.mount();

  assert.equal(controller.statusTone, "error");
  assert.equal(
    controller.statusMessage,
    "저장된 데이터 손상이 발견되었습니다. 복구를 시도하여 이전 데이터를 불러와주십시오.",
  );
});

test("bottom PMS navigation loads branch-scoped records and selected room values feed templates", async () => {
  const { controller, writes, pmsCalls } = await createControllerHarness({
    schemaVersion: 1,
    lastBranchId: "coex",
    templateOverrides: {},
    customTemplates: [],
    ui: {},
  });
  const checkinItem = homeBottomNavigationItems.find((item) => item.id === "checkin-list");
  assert.ok(checkinItem);

  await controller.mount();
  await controller.openMenu("QUICK_REPLY");
  await controller.copyTemplate("quick-rental-item-inquiry");
  assert.equal(controller.statusTone, "error");

  await controller.openBottomNavigation(checkinItem);

  assert.equal(controller.activeBottomPanel?.title, "체크인 목록");
  assert.equal(controller.statusMessage, "");
  assert.equal(controller.statusTone, "neutral");
  assert.equal(pmsCalls[0]?.body.get("filter[filters][0][value]"), "13");
  assert.equal(pmsCalls[0]?.body.get("filter[filters][6][value]"), "20260525");
  assert.equal(controller.pmsVisibleRecords.length, 1);

  controller.selectPmsGuestRecord(controller.pmsVisibleRecords[0].id);
  assert.equal(controller.workRoomContext.selected, true);
  assert.equal(controller.selectedLanguage, "KO");

  controller.goHome();
  assert.equal(controller.workRoomContext.selected, true);

  await controller.openMenu("CUSTOMER_NOTICE");
  await controller.copyTemplate("guest-arrival-notice");
  assert.equal(controller.statusMessage, "");
  assert.equal(controller.statusTone, "neutral");
  assert.match(writes.at(-1) || "", /Kim/);
  assert.match(writes.at(-1) || "", /1302/);

  await controller.openMenu("ROOM_REMARK_MEMO");
  assert.equal(controller.workRoomContext.selected, true);
  await controller.copyTemplate("remark-card-keys");

  assert.equal(controller.statusMessage, "");
  assert.equal(controller.statusTone, "neutral");
  assert.match(writes.at(-1) || "", /제공 카드키/);
});

test("template copy fails visibly when the selected language is not registered", async () => {
  const { controller, writes } = await createControllerHarness({
    schemaVersion: 1,
    lastBranchId: "coex",
    templateOverrides: {},
    customTemplates: [],
    ui: {},
  });

  await controller.mount();
  await controller.openMenu("WORK_REPORT");
  controller.selectLanguage("EN");
  await controller.copyTemplate("report-day-night");

  assert.equal(writes.length, 0);
  assert.equal(controller.statusTone, "error");
  assert.equal(controller.statusMessage, "해당 언어는 등록되어있지 않습니다. 등록 후 다시 시도해주십시오.");
});

test("selected PMS room context is cleared when branch-scoped PMS data changes", async () => {
  const { controller, pmsCalls } = await createControllerHarness({
    schemaVersion: 1,
    lastBranchId: "coex",
    templateOverrides: {},
    customTemplates: [],
    ui: {},
  });
  const checkinItem = homeBottomNavigationItems.find((item) => item.id === "checkin-list");
  assert.ok(checkinItem);

  await controller.mount();
  await controller.openBottomNavigation(checkinItem);
  controller.selectPmsGuestRecord(controller.pmsVisibleRecords[0].id);
  assert.equal(controller.workRoomContext.selected, true);

  await controller.handleBranchChange({ target: { value: "gangnam" } } as unknown as Event);

  assert.equal(controller.selectedPmsRecord, null);
  assert.equal(controller.workRoomContext.selected, false);
  assert.equal(pmsCalls[1]?.body.get("filter[filters][0][value]"), "91");
});

test("selected PMS room context is cleared when search hides the selected record", async () => {
  const { controller } = await createControllerHarness(
    {
      schemaVersion: 1,
      lastBranchId: "coex",
      templateOverrides: {},
      customTemplates: [],
      ui: {},
    },
    [
      {
        GUEST_NAME: "Kim",
        ROOM_NO: "1302",
        DEPT_DATE: "2026-05-25",
        RSVN_STATUS_CODE: "RR",
        NAT_CODE: "KOR",
      },
      {
        GUEST_NAME: "Lee",
        ROOM_NO: "1401",
        DEPT_DATE: "2026-05-25",
        RSVN_STATUS_CODE: "RR",
        NAT_CODE: "USA",
      },
    ],
  );
  const checkinItem = homeBottomNavigationItems.find((item) => item.id === "checkin-list");
  assert.ok(checkinItem);

  await controller.mount();
  await controller.openBottomNavigation(checkinItem);
  controller.selectPmsGuestRecord(controller.pmsVisibleRecords[0].id);
  assert.equal(controller.selectedPmsRecord?.roomNo, "1302");

  controller.setPmsSearchTerm("1401");

  assert.deepEqual(controller.pmsVisibleRecords.map((record) => record.roomNo), ["1401"]);
  assert.equal(controller.selectedPmsRecord, null);
  assert.equal(controller.workRoomContext.selected, false);
});

test("bottom PMS navigation stays disabled by state when branch is missing and direct action fails visibly", async () => {
  const { controller, pmsCalls } = await createControllerHarness({
    schemaVersion: 1,
    templateOverrides: {},
    customTemplates: [],
    ui: {},
  });
  const checkoutItem = homeBottomNavigationItems.find((item) => item.id === "checkout-list");
  assert.ok(checkoutItem?.action);

  await controller.mount();
  await controller.openBottomNavigation(checkoutItem);

  assert.equal(controller.activeBottomPanel, null);
  assert.equal(controller.statusTone, "error");
  assert.equal(controller.statusMessage, "지점을 선택하여주십시오.");
  assert.equal(pmsCalls.length, 0);
});

test("laundry manual block creation and allowed movement update visible progress", async () => {
  const { controller } = await createControllerHarness({
    schemaVersion: 1,
    lastBranchId: "coex",
    templateOverrides: {},
    customTemplates: [],
    ui: {},
  });

  await controller.mount();
  await controller.openMenu("LAUNDRY_MANAGEMENT");
  await controller.createManualLaundryRecord("직접 입력 세탁물");

  assert.equal(controller.statusTone, "success");
  assert.equal(controller.laundryRecords.length, 1);
  assert.equal(controller.laundryRecords[0]?.itemSummary, "직접 입력 세탁물");
  assert.equal(controller.laundryRecords[0]?.status, "RECEIVED");

  await controller.moveLaundryRecordTo(controller.laundryRecords[0].id, "READY");
  assert.equal(controller.statusTone, "error");
  assert.equal(controller.statusMessage, "잘못된 절차입니다.");

  await controller.moveLaundryRecordTo(controller.laundryRecords[0].id, "WASHER");
  assert.equal(controller.statusTone, "success");
  assert.equal(controller.laundryRecords[0]?.status, "IN_PROGRESS");
  assert.equal(controller.laundryRecords[0]?.machineType, "WASHER");
  assert.ok(controller.laundryProgressLog.some((entry) => /세탁중/.test(entry.message)));

  const progressId = controller.laundryProgressLog.find((entry) => /세탁중/.test(entry.message))?.id;
  assert.ok(progressId);
  await controller.hideLaundryProgressEntryById(progressId);
  assert.equal(controller.statusMessage, "진행 기록을 숨겼습니다.");
  assert.equal(controller.laundryProgressLog.some((entry) => entry.id === progressId), false);

  await controller.removeLaundryRecordById(controller.laundryRecords[0].id);
  assert.equal(controller.statusMessage, "세탁 블록을 제거했습니다.");
  assert.equal(controller.laundryRecords.length, 0);
});

test("OTA setup failures show confirmed copy and collapse after a repeated failure", async () => {
  Object.assign(globalThis, {
    $state: <T>(value: T) => value,
  });
  const { createSidePanelNavigationController } = await import(
    "../src/ui/side-panel-navigation-controller.svelte.js"
  );
  const state = normalizeStoredExtensionState({
    schemaVersion: 1,
    lastBranchId: "coex",
    templateOverrides: {},
    customTemplates: [],
    ui: {},
  });
  const dependencies: SidePanelNavigationControllerDependencies = {
    extensionState: {
      async readWithRecovery() {
        return { state, recovered: false };
      },
      async setLastBranchId() {},
      async writeState() {},
    },
    clipboard: {
      async writeText() {},
    },
    laundryStorage: {
      async get() {
        return {};
      },
      async set() {},
    },
    otaReservation: {
      async fetchPayload() {
        throw new Error("네이버 또는 스테이션 예약 상세 페이지에서 실행해주세요.");
      },
      async fillForm() {
        throw new Error("not used");
      },
    },
    pmsGuests: {
      async fetchImpl() {
        throw new Error("not used");
      },
    },
    dateSource: {
      today() {
        return new Date("2026-05-25T09:00:00+09:00");
      },
    },
  };
  const controller = createSidePanelNavigationController(dependencies);

  await controller.mount();
  await controller.openMenu("OTA_RESERVATION_INPUT");
  await controller.loadOtaPreview();
  assert.equal(controller.statusMessage, "올바른 지점 선택 또는 기존 탭을 새로고침 하십시오.");

  await controller.loadOtaPreview();
  assert.equal(controller.statusMessage, "오류가 발생하였습니다. 잠시 후 다시 시도해주십시오.");
});

test("airport van form values persist and copy separate work and guest outputs", async () => {
  const { controller, getState, writes } = await createControllerHarness({
    schemaVersion: 1,
    lastBranchId: "coex",
    templateOverrides: {},
    customTemplates: [],
    ui: {},
  });

  await controller.mount();
  await controller.openMenu("AIRPORT_VAN_MANAGEMENT");
  await controller.setAirportVanFormValue("rideDirection", "PICKUP");
  await controller.setAirportVanFormValue("rideDate", "2026. 05. 25");
  await controller.setAirportVanFormValue("rideTime", "06:35");
  await controller.setAirportVanFormValue("roomNo", "A302");
  await controller.setAirportVanFormValue("guestName", "Kim");
  await controller.setAirportVanFormValue("guestContact", "010-1111-2222");
  await controller.setAirportVanFormValue("airportName", "인천공항");
  await controller.setAirportVanFormValue("terminal", "T1");
  await controller.setAirportVanFormValue("flightNo", "KE001");
  await controller.setAirportVanFormValue("flightTime", "09:10");
  await controller.setAirportVanFormValue("passengerCount", "4");
  await controller.setAirportVanFormValue("largeLuggageCount", "2");
  await controller.setAirportVanFormValue("smallLuggageCount", "1");
  await controller.setAirportVanFormValue("paymentMethod", "CARD");

  assert.equal(getState().ui.airportVanFormValues?.roomNo, "A302");
  assert.equal(getState().ui.airportVanFormValues?.paymentMethod, "CARD");

  await controller.copyAirportVanText("workLog");
  assert.equal(controller.statusMessage, "");
  assert.match(writes.at(-1) || "", /\* 공항밴 예약보고/);
  assert.match(writes.at(-1) || "", /\* 예약 받은 날짜 : 2026\. 05\. 25/);
  assert.match(writes.at(-1) || "", /객실번호 : A302/);

  await controller.copyAirportVanText("guestMessage");
  assert.equal(controller.statusMessage, "");
  assert.match(writes.at(-1) || "", /공항밴 예약 요청 정보 확인 부탁드립니다/);
  assert.match(writes.at(-1) || "", /항공편: 인천공항 T1 KE001/);
});

test("airport van copy fails visibly until required form values are present", async () => {
  const { controller, writes } = await createControllerHarness({
    lastBranchId: "coex",
  });

  await controller.mount();
  await controller.openMenu("AIRPORT_VAN_MANAGEMENT");
  await controller.setAirportVanFormValue("rideDirection", "PICKUP");
  await controller.copyAirportVanText("workLog");

  assert.equal(writes.length, 0);
  assert.equal(controller.statusTone, "error");
  assert.equal(controller.statusMessage, "비어있는 필수 입력란을 확인 후 다시 시도해주십시오.");
});

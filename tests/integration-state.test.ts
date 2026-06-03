import test from "node:test";
import assert from "node:assert/strict";

import { homeBottomNavigationItems, homeNavigationGroups } from "../src/catalog/menu-routing.js";
import { normalizeStoredExtensionState } from "../src/platform/storage-schema.js";
import type { StoredExtensionState } from "../src/catalog/template-types.js";
import type { SidePanelNavigationControllerDependencies } from "../src/ui/side-panel-navigation-controller.svelte.js";

async function createControllerHarness(
  initial: unknown,
  options: {
    recovered?: boolean;
    readError?: Error;
    branchStorageError?: Error;
    pmsOk?: boolean;
  } = {},
) {
  Object.assign(globalThis, { $state: <T>(value: T) => value });
  const { createSidePanelNavigationController } = await import("../src/ui/side-panel-navigation-controller.svelte.js");
  let state = normalizeStoredExtensionState(initial);
  const writes: string[] = [];
  const pmsCalls: Array<{ input: string; body: URLSearchParams }> = [];
  const laundryStore: Record<string, unknown> = {};

  const dependencies: SidePanelNavigationControllerDependencies = {
    extensionState: {
      async readWithRecovery() {
        if (options.readError) throw options.readError;
        return { state, recovered: Boolean(options.recovered) };
      },
      async setLastBranchId(branchId) {
        if (options.branchStorageError) throw options.branchStorageError;
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
        throw new Error("네이버 또는 스테이션 예약 상세 페이지에서 실행해주세요.");
      },
      async fillForm() {
        throw new Error("not used");
      },
    },
    wingsRemark: {
      async readRemark() {
        return "기존 메모";
      },
      async writeRemark() {},
    },
    pmsGuests: {
      async fetchImpl(input, init) {
        pmsCalls.push({ input, body: init.body });
        if (options.pmsOk === false) {
          return { ok: false, status: 401, statusText: "Unauthorized", json: async () => ({ rows: [] }) };
        }
        return {
          ok: true,
          json: async () => ({
            rows: [
              {
                GUEST_NAME: "Kim",
                ROOM_NO: "1302",
                DEPT_DATE: "2026-06-04",
                RSVN_STATUS_CODE: "RR",
                NAT_CODE: "KOR",
              },
            ],
          }),
        };
      },
    },
    dateSource: {
      today() {
        return new Date("2026-06-04T09:00:00+09:00");
      },
    },
  };

  return {
    controller: createSidePanelNavigationController(dependencies),
    getState: () => state,
    writes,
    pmsCalls,
  };
}

test("recoverable storage normalization is silent, while real storage failure is actionable", async () => {
  const recovered = await createControllerHarness({ lastBranchId: "coex" }, { recovered: true });
  await recovered.controller.mount();
  assert.equal(recovered.controller.statusMessage, "");
  assert.equal(recovered.controller.statusTone, "neutral");

  const failed = await createControllerHarness({}, { readError: new Error("Chrome storage dependency is not available.") });
  await failed.controller.mount();
  assert.equal(failed.controller.statusTone, "error");
  assert.equal(
    failed.controller.statusMessage,
    "저장소 작업에 실패했습니다. 확장 프로그램 저장 권한과 Chrome 상태를 확인 후 다시 시도해주십시오.",
  );
});

test("home template copy calls clipboard only after required application values exist", async () => {
  const { controller, writes, getState } = await createControllerHarness({
    schemaVersion: 1,
    lastBranchId: "coex",
    templateOverrides: {},
    customTemplates: [],
    ui: {},
  });
  await controller.mount();
  const quickRental = homeNavigationGroups[1]?.items.find((item) => item.id === "quick-rental");
  assert.ok(quickRental);

  await controller.copyHomeTemplate(quickRental, "quick-rental-item-inquiry");
  assert.equal(writes.length, 0);
  assert.equal(controller.statusTone, "error");

  await controller.setTemplateVariableValue("rentalItemName", "가습기");
  assert.equal(getState().ui.templateVariableValues?.rentalItemName, "가습기");
  await controller.copyHomeTemplate(quickRental, "quick-rental-item-inquiry");
  assert.equal(controller.statusMessage, "");
  assert.match(writes.at(-1) || "", /가습기/);
});

test("PMS bottom navigation proves backend failure and success states without fake records", async () => {
  const checkinItem = homeBottomNavigationItems.find((item) => item.id === "checkin-list");
  assert.ok(checkinItem);

  const failure = await createControllerHarness({ lastBranchId: "coex" }, { pmsOk: false });
  await failure.controller.mount();
  await failure.controller.openBottomNavigation(checkinItem);
  assert.equal(failure.controller.statusTone, "error");
  assert.equal(failure.controller.statusMessage, "PMS 조회에 실패했습니다. 로그인 상태와 네트워크를 확인 후 다시 시도해주십시오.");
  assert.deepEqual(failure.controller.pmsRecords, []);

  const success = await createControllerHarness({ lastBranchId: "coex" });
  await success.controller.mount();
  await success.controller.openBottomNavigation(checkinItem);
  assert.equal(success.controller.statusMessage, "");
  assert.equal(success.controller.pmsVisibleRecords[0]?.roomNo, "1302");
  success.controller.selectPmsGuestRecord(success.controller.pmsVisibleRecords[0].id);
  assert.equal(success.controller.workRoomContext.selected, true);
});

test("branch change clears stale PMS and OTA state and writes through storage owner", async () => {
  const checkinItem = homeBottomNavigationItems.find((item) => item.id === "checkin-list");
  assert.ok(checkinItem);
  const { controller, getState, pmsCalls } = await createControllerHarness({ lastBranchId: "coex" });

  await controller.mount();
  await controller.openBottomNavigation(checkinItem);
  controller.selectPmsGuestRecord(controller.pmsVisibleRecords[0].id);
  await controller.handleBranchChange("gangnam");

  assert.equal(getState().lastBranchId, "gangnam");
  assert.equal(controller.selectedPmsRecord, null);
  assert.equal(controller.workRoomContext.selected, false);
  assert.equal(pmsCalls.at(-1)?.body.get("filter[filters][0][value]"), "91");
});

test("airport van and laundry UI actions update application state through owners", async () => {
  const { controller, getState, writes } = await createControllerHarness({ lastBranchId: "coex" });
  await controller.mount();
  await controller.openMenu("AIRPORT_VAN_MANAGEMENT");
  await controller.setAirportVanFormValue("rideDirection", "PICKUP");
  await controller.setAirportVanFormValue("rideDate", "2026. 06. 04");
  await controller.setAirportVanFormValue("rideTime", "14:30");
  await controller.setAirportVanFormValue("roomNo", "A302");
  await controller.setAirportVanFormValue("guestName", "Kim");
  await controller.setAirportVanFormValue("guestContact", "010-1111-2222");
  await controller.setAirportVanFormValue("airportName", "인천공항");
  await controller.setAirportVanFormValue("terminal", "T1");
  await controller.setAirportVanFormValue("flightNo", "KE082");
  await controller.setAirportVanFormValue("flightTime", "18:00");
  await controller.setAirportVanFormValue("passengerCount", "2");
  await controller.setAirportVanFormValue("largeLuggageCount", "1");
  await controller.setAirportVanFormValue("smallLuggageCount", "0");
  await controller.setAirportVanFormValue("paymentMethod", "CARD");
  assert.equal(getState().ui.airportVanFormValues?.roomNo, "A302");

  await controller.copyAirportVanText("workLog");
  assert.match(writes.at(-1) || "", /\* 공항밴 예약보고/);

  await controller.openMenu("LAUNDRY_MANAGEMENT");
  await controller.createManualLaundryRecord("직접 입력 세탁물");
  assert.equal(controller.laundryRecords[0]?.status, "RECEIVED");
  await controller.moveLaundryRecordTo(controller.laundryRecords[0].id, "WASHER");
  assert.equal(controller.laundryRecords[0]?.machineType, "WASHER");
});

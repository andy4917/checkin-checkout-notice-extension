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
    writeStateError?: Error;
    withoutWingsRemark?: boolean;
    pmsOk?: boolean;
    pmsHtmlResponse?: boolean;
  } = {},
) {
  Object.assign(globalThis, { $state: <T>(value: T) => value });
  const { createSidePanelNavigationController } = await import("../src/ui/side-panel-navigation-controller.svelte.js");
  let state = normalizeStoredExtensionState(initial);
  const writes: string[] = [];
  const wingsRemarkWrites: string[] = [];
  const pmsCalls: Array<{ input: string; body: URLSearchParams; hasCredentials: boolean }> = [];
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
        if (options.writeStateError) throw options.writeStateError;
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
    wingsRemark: options.withoutWingsRemark
      ? undefined
      : {
          async readRemark() {
            return wingsRemarkWrites.at(-1) || "기존 메모";
          },
          async writeRemark(nextRemark) {
            wingsRemarkWrites.push(nextRemark);
          },
        },
    pmsGuests: {
      async fetchImpl(input, init) {
        pmsCalls.push({ input, body: init.body, hasCredentials: init.credentials === "include" });
        if (options.pmsHtmlResponse) {
          return {
            ok: true,
            headers: { get: (name: string) => (name.toLowerCase() === "content-type" ? "text/html" : null) },
            text: async () => "<html><body>PMS SAML redirect idp.sanhait.com identity/samlsso</body></html>",
            json: async () => ({ rows: [{ GUEST_NAME: "Fake" }] }),
          };
        }
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
    wingsRemarkWrites,
    pmsCalls,
  };
}

test("recoverable storage normalization and generic storage failures do not show shell feedback text", async () => {
  const recovered = await createControllerHarness({ lastBranchId: "coex" }, { recovered: true });
  await recovered.controller.mount();
  assert.equal(recovered.controller.statusMessage, "");
  assert.equal(recovered.controller.statusTone, "neutral");
  assert.equal(recovered.controller.hiddenFailureEvidence, null);

  const failed = await createControllerHarness({}, { readError: new Error("Chrome storage dependency is not available.") });
  await failed.controller.mount();
  assert.equal(failed.controller.statusTone, "neutral");
  assert.equal(failed.controller.statusMessage, "");
  assert.deepEqual(failed.controller.hiddenFailureEvidence, {
    kind: "storageCorruption",
    message: "저장소 작업에 실패했습니다. 확장 프로그램 저장 권한과 Chrome 상태를 확인 후 다시 시도해주십시오.",
    source: "non-text-status-error",
    visibleStatus: false,
  });
});

test("storage write failures stay hidden from shell text but remain structured evidence", async () => {
  const storageError = new Error("chrome storage write failed");
  const templateFailure = await createControllerHarness({ lastBranchId: "coex" }, { writeStateError: storageError });
  await templateFailure.controller.mount();
  await templateFailure.controller.setTemplateVariableValue("rentalItemName", "가습기");
  assert.equal(templateFailure.controller.statusMessage, "");
  assert.equal(templateFailure.controller.statusTone, "neutral");
  assert.equal(templateFailure.controller.hiddenFailureEvidence?.kind, "storageCorruption");
  assert.equal(templateFailure.controller.hiddenFailureEvidence?.source, "template-variable-storage-write");
  assert.equal(templateFailure.controller.hiddenFailureEvidence?.visibleStatus, false);

  const airportFailure = await createControllerHarness({ lastBranchId: "coex" }, { writeStateError: storageError });
  await airportFailure.controller.mount();
  await airportFailure.controller.setAirportVanFormValue("roomNo", "A302");
  assert.equal(airportFailure.controller.statusMessage, "");
  assert.equal(airportFailure.controller.statusTone, "neutral");
  assert.equal(airportFailure.controller.hiddenFailureEvidence?.kind, "storageCorruption");
  assert.equal(airportFailure.controller.hiddenFailureEvidence?.source, "airport-van-form-storage-write");
  assert.equal(airportFailure.controller.hiddenFailureEvidence?.visibleStatus, false);
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
  assert.equal(controller.statusTone, "neutral");
  assert.equal(controller.statusMessage, "");

  await controller.setTemplateVariableValue("rentalItemName", "가습기");
  assert.equal(getState().ui.branchFormValues?.coex?.templateVariableValues?.rentalItemName, "가습기");
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
  assert.equal(
    failure.controller.statusMessage,
    "PMS 조회에 실패했습니다. PMS 응답 형식 또는 네트워크 상태를 확인 후 다시 시도해주십시오.",
  );
  assert.deepEqual(failure.controller.pmsRecords, []);

  const htmlFailure = await createControllerHarness({ lastBranchId: "coex" }, { pmsHtmlResponse: true });
  await htmlFailure.controller.mount();
  await htmlFailure.controller.openBottomNavigation(checkinItem);
  assert.equal(htmlFailure.controller.statusTone, "error");
  assert.equal(
    htmlFailure.controller.statusMessage,
    "PMS 조회에 실패했습니다. PMS 응답 형식 또는 네트워크 상태를 확인 후 다시 시도해주십시오.",
  );
  assert.deepEqual(htmlFailure.controller.pmsRecords, []);

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
  assert.equal(pmsCalls.at(-1)?.hasCredentials, true);
});

test("room remark WINGS upsert requires selected PMS context and keeps WINGS dependency failure visible", async () => {
  const checkinItem = homeBottomNavigationItems.find((item) => item.id === "checkin-list");
  assert.ok(checkinItem);

  const noRecord = await createControllerHarness({ lastBranchId: "coex" });
  await noRecord.controller.mount();
  await noRecord.controller.openMenu("ROOM_REMARK_MEMO");
  await noRecord.controller.setTemplateVariableValue("count", "2");
  await noRecord.controller.upsertRoomRemark("remark-card-keys");
  assert.deepEqual(noRecord.wingsRemarkWrites, []);
  assert.equal(noRecord.controller.statusMessage, "");

  const success = await createControllerHarness({ lastBranchId: "coex" });
  await success.controller.mount();
  await success.controller.openBottomNavigation(checkinItem);
  success.controller.selectPmsGuestRecord(success.controller.pmsVisibleRecords[0].id);
  await success.controller.openMenu("ROOM_REMARK_MEMO");
  await success.controller.setTemplateVariableValue("count", "2");
  await success.controller.upsertRoomRemark("remark-card-keys");
  assert.equal(success.controller.statusMessage, "");
  assert.equal(success.wingsRemarkWrites.at(-1), "기존 메모\n\n- 제공 카드키 : 2장");

  await success.controller.setTemplateVariableValue("items", "가습기");
  await success.controller.upsertRoomRemark("remark-rentals");
  assert.equal(success.wingsRemarkWrites.at(-1), "기존 메모\n\n- 제공 카드키 : 2장\n\n- 대여물품 : 가습기");

  const dependencyFailure = await createControllerHarness({ lastBranchId: "coex" }, { withoutWingsRemark: true });
  await dependencyFailure.controller.mount();
  await dependencyFailure.controller.openBottomNavigation(checkinItem);
  dependencyFailure.controller.selectPmsGuestRecord(dependencyFailure.controller.pmsVisibleRecords[0].id);
  await dependencyFailure.controller.openMenu("ROOM_REMARK_MEMO");
  await dependencyFailure.controller.upsertRoomRemark("remark-card-keys");
  assert.equal(dependencyFailure.controller.statusTone, "error");
  assert.equal(dependencyFailure.controller.statusMessage, "WINGS 예약정보창을 연 뒤 다시 실행해주세요.");
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
  assert.equal(getState().ui.branchFormValues?.coex?.airportVanFormValues?.roomNo, "A302");

  await controller.copyAirportVanText("workLog");
  assert.match(writes.at(-1) || "", /\* 공항밴 예약보고/);

  await controller.openMenu("LAUNDRY_MANAGEMENT");
  await controller.createManualLaundryRecord("직접 입력 세탁물");
  assert.equal(controller.laundryRecords[0]?.status, "RECEIVED");
  await controller.moveLaundryRecordTo(controller.laundryRecords[0].id, "WASHER");
  assert.equal(controller.laundryRecords[0]?.machineType, "WASHER");
});

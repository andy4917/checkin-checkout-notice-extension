import test from "node:test";
import assert from "node:assert/strict";

import {
  ActiveTabAutomationError,
  WINGS_REMARK_WINDOW_REQUIRED_MESSAGE,
  WINGS_RESERVATION_WINDOW_REQUIRED_MESSAGE,
  fetchActiveOtaPayload,
  fillActiveWingsReservationForm,
  readActiveWingsRemark,
  writeActiveWingsRemark,
} from "../src/platform/active-tab-automation.js";

const originalChrome = globalThis.chrome;

test.afterEach(() => {
  globalThis.chrome = originalChrome;
});

test("active OTA payload fetch executes in the active tab main world", async () => {
  const executeScriptCalls: Array<{ target: { tabId?: number }; world?: string; args?: unknown[] }> = [];
  globalThis.chrome = {
    tabs: {
      query: async () => [
        {
          id: 7,
          url: "https://partner.booking.naver.com/bizes/1217752/booking-list-view/bookings/1219592381",
        },
      ],
    },
    scripting: {
      executeScript: async (injection: chrome.scripting.ScriptInjection<unknown[], unknown>) => {
        executeScriptCalls.push(injection);
        return [{ result: { ok: true, payload: { reserverName: "Kim" } } }];
      },
    },
  } as unknown as typeof chrome;

  const result = await fetchActiveOtaPayload();

  assert.equal(result.locator.source, "naver");
  assert.deepEqual(result.payload, { reserverName: "Kim" });
  assert.equal(executeScriptCalls[0].target.tabId, 7);
  assert.equal(executeScriptCalls[0].world, "MAIN");
  assert.deepEqual(executeScriptCalls[0].args, [
    "https://partner.booking.naver.com/api/businesses/1217752/bookings/1219592381",
    "naver",
  ]);
});

test("active WINGS fill fails before scripting when reservation window is absent", async () => {
  let executeScriptCalled = false;
  globalThis.chrome = {
    tabs: {
      query: async () => [{ id: 8, url: "https://example.com/not-wings" }],
    },
    scripting: {
      executeScript: async () => {
        executeScriptCalled = true;
        return [];
      },
    },
  } as unknown as typeof chrome;

  await assert.rejects(
    () => fillActiveWingsReservationForm({ ARRV_DATE: "20260511" }),
    (error) =>
      error instanceof ActiveTabAutomationError &&
      error.message === WINGS_RESERVATION_WINDOW_REQUIRED_MESSAGE,
  );
  assert.equal(executeScriptCalled, false);
});

test("active WINGS remark read fails before scripting when reservation info window is absent", async () => {
  let executeScriptCalled = false;
  globalThis.chrome = {
    tabs: {
      query: async () => [{ id: 9, url: "https://example.com/not-wings" }],
    },
    scripting: {
      executeScript: async () => {
        executeScriptCalled = true;
        return [];
      },
    },
  } as unknown as typeof chrome;

  await assert.rejects(
    () => readActiveWingsRemark(),
    (error) =>
      error instanceof ActiveTabAutomationError &&
      error.message === WINGS_REMARK_WINDOW_REQUIRED_MESSAGE,
  );
  assert.equal(executeScriptCalled, false);
});

test("active WINGS remark write executes in the active tab main world", async () => {
  const executeScriptCalls: Array<{ target: { tabId?: number }; world?: string; args?: unknown[] }> = [];
  globalThis.chrome = {
    tabs: {
      query: async () => [
        {
          id: 10,
          url: "https://pms.sanhait.com/pms/biz/ir04_0100X/detail.do?RSVN_NO=1",
        },
      ],
    },
    scripting: {
      executeScript: async (injection: chrome.scripting.ScriptInjection<unknown[], unknown>) => {
        executeScriptCalls.push(injection);
        return [{ result: { ok: true } }];
      },
    },
  } as unknown as typeof chrome;

  await writeActiveWingsRemark("next remark");

  assert.equal(executeScriptCalls[0].target.tabId, 10);
  assert.equal(executeScriptCalls[0].world, "MAIN");
  assert.deepEqual(executeScriptCalls[0].args, ["next remark"]);
});

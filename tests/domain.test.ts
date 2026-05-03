import test from "node:test";
import assert from "node:assert/strict";

import { formatDateForLang, getBusinessDateParts } from "../src/domain/dates.js";
import { filterGuests, getGuestStatus, sortGuestsByRoom } from "../src/domain/guests.js";
import { convertRoomNo, getFullRoomInfo } from "../src/domain/rooms.js";

test("business date exposes PMS API and display formats", () => {
  const date = new Date("2026-04-26T09:30:00+09:00");
  assert.deepEqual(getBusinessDateParts(date), {
    apiDate: "20260426",
    displayDate: "2026 / 04 / 26",
  });
});

test("localized date formatting preserves existing behavior", () => {
  assert.equal(formatDateForLang("20260426", "KO"), "2026년 4월 26일");
  assert.equal(formatDateForLang("20260426", "EN"), "April 26, 2026");
  assert.equal(formatDateForLang("20260426", "JP"), "2026/4/26");
  assert.equal(formatDateForLang("20260426", "CN"), "2026/4/26");
  assert.equal(formatDateForLang("", "KO"), "");
});

test("room formatting maps PMS raw rooms to display and full message labels", () => {
  assert.equal(convertRoomNo("0101,1302"), "B101, A302");
  assert.equal(convertRoomNo(""), "배정전");
  assert.equal(getFullRoomInfo("0101,1302", "KO"), "B타워 / 101호, A타워 / 302호");
  assert.equal(
    getFullRoomInfo("0101,1302", "EN"),
    "B Tower / Room 101, A Tower / Room 302",
  );
});

test("guest filtering, sorting, and status mapping are pure domain behavior", () => {
  const guests = [
    { GUEST_NAME: "Kim", ROOM_NO: "1302", RSVN_STATUS_CODE: "CI" },
    { GUEST_NAME: "Lee", ROOM_NO: "0101", RSVN_STATUS_CODE: "RR" },
  ];

  assert.deepEqual(filterGuests(guests, "b101"), [guests[1]]);
  assert.deepEqual(sortGuestsByRoom(guests), [guests[1], guests[0]]);
  assert.deepEqual(getGuestStatus("CO"), {
    text: "체크아웃 완료",
    tagClass: "tag-co",
  });
});

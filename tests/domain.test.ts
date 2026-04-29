import test from "node:test";
import assert from "node:assert/strict";

import { formatDateForLang, getBusinessDateParts } from "../src/domain/dates.js";
import { filterGuests, getGuestStatus, sortGuestsByRoom } from "../src/domain/guests.js";
import { convertRoomNo, getFullRoomInfo } from "../src/domain/rooms.js";
import { createGuestMessage, UnsupportedLanguageError } from "../src/messages/message-service.js";
import { copyToClipboard } from "../src/sidepanel/clipboard.js";
import { renderGuestList } from "../src/sidepanel/render.js";

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

test("message service maps arrival and departure templates and rejects unknown languages", () => {
  const arrival = createGuestMessage({
    action: "arrival",
    lang: "KO",
    name: "홍길동",
    room: "B타워 / 101호",
    departureDate: "2026년 4월 27일",
    branchId: "coex",
  });
  assert.match(arrival, /홍길동 님/);
  assert.match(arrival, /B타워 \/ 101호/);
  assert.doesNotMatch(arrival, /비밀번호 입력 가이드 영상/);

  const gangnamArrival = createGuestMessage({
    action: "arrival",
    lang: "KO",
    name: "홍길동",
    room: "B타워 / 101호",
    departureDate: "2026년 4월 27일",
    branchId: "gangnam",
  });
  assert.doesNotMatch(gangnamArrival, /비밀번호 입력 가이드 영상/);

  assert.throws(
    () =>
      createGuestMessage({
        action: "departure",
        lang: "UNKNOWN",
        type: "BEFORE_30",
        name: "Kim",
        room: "B Tower / Room 101",
      }),
    UnsupportedLanguageError,
  );

  const departure = createGuestMessage({
    action: "departure",
    lang: "EN",
    type: "BEFORE_30",
    name: "Kim",
    room: "B Tower / Room 101",
  });
  assert.match(departure, /Good morning, Kim/);
});

test("side panel renderer emits expected action buttons and empty state", () => {
  assert.equal(
    renderGuestList([], "ARRIVAL", "coex"),
    "<div class=\"empty-state\">결과가 없습니다.</div>",
  );

  const html = renderGuestList(
    [{ GUEST_NAME: "Kim", ROOM_NO: "0101", DEPT_DATE: "20260427", RSVN_STATUS_CODE: "RR" }],
    "ARRIVAL",
    "coex",
  );

  assert.match(html, /guest-card ARRIVAL-card/);
  assert.match(html, /data-action="arrival"/);
  assert.match(html, /data-lang="KO"/);
  assert.match(html, /B101/);
  assert.doesNotMatch(html, /coex-door-password-guide-video/);

  const gangnamHtml = renderGuestList(
    [{ GUEST_NAME: "Kim", ROOM_NO: "0101", DEPT_DATE: "20260427", RSVN_STATUS_CODE: "RR" }],
    "ARRIVAL",
    "gangnam",
  );
  assert.doesNotMatch(gangnamHtml, /coex-door-password-guide-video/);
  assert.throws(
    () =>
      renderGuestList(
        [{ GUEST_NAME: "Kim", ROOM_NO: "0101", DEPT_DATE: "20260427", RSVN_STATUS_CODE: "RR" }],
        "ARRIVAL",
        "" as never,
      ),
    /지점을 선택해주세요/,
  );
});

test("clipboard helper writes text and restores button label", async () => {
  const writes: string[] = [];
  const button = { innerText: "KO" };
  const originalSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = ((callback: TimerHandler) => {
    if (typeof callback === "function") callback();
    return 0;
  }) as typeof globalThis.setTimeout;

  try {
    await copyToClipboard("hello", button, {
      writeText: async (text) => {
        writes.push(text);
      },
    });
  } finally {
    globalThis.setTimeout = originalSetTimeout;
  }

  assert.deepEqual(writes, ["hello"]);
  assert.equal(button.innerText, "KO");
});

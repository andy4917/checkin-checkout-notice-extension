import test from "node:test";
import assert from "node:assert/strict";

import { resolveRoomsSettingsActions } from "../src/ui/rooms-settings-actions.js";
import type { PmsGuestRecord } from "../src/types.js";

const selectedRecord: PmsGuestRecord = {
  id: "guest-1",
  raw: {},
  guestName: "Kim",
  roomNo: "1302",
  displayRoom: "A302",
  departureDate: "",
  statusCode: "",
  statusLabel: "",
  statusTagClass: "",
  templateValues: {},
};

test("rooms settings command appears only after a room remark template is selected", () => {
  const base = {
    activeMenu: "ROOM_REMARK_MEMO" as const,
    navigationLocked: false,
    selectedBranchId: "coex" as const,
    selectedPmsRecord: selectedRecord,
    tabContext: {
      url: "https://pms.sanhait.com/pms/biz/ir04_0100X/detail.do?RSVN_NO=1",
      isPmsPage: true,
      isGuestRecord: true,
    },
  };

  assert.deepEqual(
    resolveRoomsSettingsActions({ ...base, selectedRoomRemarkTemplateId: "" }).map(
      (action) => action.id,
    ),
    ["settings"],
  );
  assert.deepEqual(
    resolveRoomsSettingsActions({
      ...base,
      selectedRoomRemarkTemplateId: "remark-card-keys",
    }).map((action) => action.id),
    ["settings", "upsert-wings-remark"],
  );
});

test("rooms settings command exposes disabled reason for missing WINGS record window", () => {
  const actions = resolveRoomsSettingsActions({
    activeMenu: "ROOM_REMARK_MEMO",
    navigationLocked: false,
    selectedBranchId: "coex",
    selectedPmsRecord: selectedRecord,
    selectedRoomRemarkTemplateId: "remark-card-keys",
    tabContext: {
      url: "https://example.com",
      isPmsPage: false,
      isGuestRecord: false,
    },
  });

  const command = actions.find((action) => action.id === "upsert-wings-remark");
  assert.equal(command?.enabled, false);
  assert.equal(command?.disabledReason, "WINGS 예약정보창을 연 뒤 다시 실행해주세요.");
});

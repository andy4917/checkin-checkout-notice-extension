import test from "node:test";
import assert from "node:assert/strict";

import { isRoomsSettingsCommandId } from "../src/catalog/menu-routing.js";
import type { TemplateDefinition } from "../src/catalog/template-types.js";
import {
  UNSUPPORTED_ROOMS_SETTINGS_COMMAND_MESSAGE,
  resolveRoomsSettingsActions,
} from "../src/ui/rooms-settings-actions.js";
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

const pmsRemarkTemplate: TemplateDefinition = {
  id: "remark-card-keys",
  category: "CUSTOMER_RECORDS",
  audience: "pmsRemark",
  title: "카드키",
  branchScope: ["coex", "gangnam", "seolleung"],
  languages: { KO: "카드키" },
  variables: [],
  attachments: [],
  requiresContext: "guestRecord",
  editable: false,
  defaultValue: "카드키",
};

const guestTemplate: TemplateDefinition = {
  ...pmsRemarkTemplate,
  id: "guest-arrival-notice",
  category: "GUEST_NOTICE",
  audience: "guest",
  requiresContext: "pmsPage",
};

test("Rooms & Settings exposes WINGS remark command only for selected PMS remark templates", () => {
  const base = {
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
    resolveRoomsSettingsActions({ ...base, selectedCommandTemplate: null }).map((action) => action.id),
    ["settings"],
  );
  assert.deepEqual(
    resolveRoomsSettingsActions({ ...base, selectedCommandTemplate: guestTemplate }).map((action) => action.id),
    ["settings"],
  );
  assert.deepEqual(
    resolveRoomsSettingsActions({ ...base, selectedCommandTemplate: pmsRemarkTemplate }).map((action) => action.id),
    ["settings", "upsert-wings-remark"],
  );
});

test("Rooms & Settings command disabled reasons reflect the current WINGS and room context", () => {
  const [settingsAction, commandAction] = resolveRoomsSettingsActions({
    navigationLocked: false,
    selectedBranchId: "coex",
    selectedPmsRecord: null,
    selectedCommandTemplate: pmsRemarkTemplate,
    tabContext: {
      url: "https://example.com",
      isPmsPage: false,
      isGuestRecord: false,
    },
  });

  assert.equal(settingsAction?.enabled, true);
  assert.equal(commandAction?.enabled, false);
  assert.equal(commandAction?.disabledReason, "객실을 선택해주세요.");

  const commandWithoutWings = resolveRoomsSettingsActions({
    navigationLocked: false,
    selectedBranchId: "coex",
    selectedPmsRecord: selectedRecord,
    selectedCommandTemplate: pmsRemarkTemplate,
    tabContext: {
      url: "https://example.com",
      isPmsPage: false,
      isGuestRecord: false,
    },
  }).find((action) => action.id === "upsert-wings-remark");

  assert.equal(commandWithoutWings?.enabled, false);
  assert.equal(commandWithoutWings?.disabledReason, "WINGS 예약정보창을 연 뒤 다시 실행해주세요.");
});

test("unsupported Rooms & Settings commands are rejected before dispatch with the current message contract", () => {
  assert.equal(isRoomsSettingsCommandId("UPSERT_WINGS_REMARK"), true);
  assert.equal(isRoomsSettingsCommandId("UNSUPPORTED_COMMAND"), false);
  assert.equal(UNSUPPORTED_ROOMS_SETTINGS_COMMAND_MESSAGE, "지원하지 않는 실행 명령입니다.");
});

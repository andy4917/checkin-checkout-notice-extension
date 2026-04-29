import test from "node:test";
import assert from "node:assert/strict";

import {
  addLaundryRecord,
  createLaundryRecordFromGuest,
  queryLaundryRecords,
  updateLaundryStatus,
} from "../src/application/laundry-records.js";
import { normalizePmsGuestRow } from "../src/pms/normalizer.js";
import {
  LAUNDRY_STORAGE_KEY,
  LaundryStorageError,
  normalizeLaundryRecords,
} from "../src/laundry/storage.js";

function createMemoryStorage(initial: Record<string, unknown> = {}) {
  const state = { ...initial };
  return {
    state,
    async get(keys: string[]) {
      return Object.fromEntries(keys.map((key) => [key, state[key]]));
    },
    async set(values: Record<string, unknown>) {
      Object.assign(state, values);
    },
  };
}

test("laundry records are stored, queried, and updated as local status records", async () => {
  const storage = createMemoryStorage();
  const now = new Date("2026-04-29T10:00:00+09:00");

  const record = await addLaundryRecord(
    {
      branchId: "coex",
      guestName: "Kim",
      roomNo: "0101",
      displayRoom: "B101",
      itemSummary: "셔츠 2장",
      note: "프론트 보관",
    },
    storage,
    now,
  );

  assert.equal(record.status, "RECEIVED");
  const storedRecords = storage.state[LAUNDRY_STORAGE_KEY] as Array<{ itemSummary: string }>;
  assert.equal(storedRecords[0].itemSummary, "셔츠 2장");

  const ready = await updateLaundryStatus(
    record.id,
    "READY",
    storage,
    new Date("2026-04-29T12:00:00+09:00"),
  );

  assert.equal(ready.status, "READY");
  assert.equal(ready.completedAt, "2026-04-29T03:00:00.000Z");

  const results = await queryLaundryRecords({ branchId: "coex", searchTerm: "셔츠" }, storage);
  assert.deepEqual(results.map((item) => item.id), [record.id]);
});

test("laundry record can be created from a normalized PMS guest without templates", () => {
  const guest = normalizePmsGuestRow(
    {
      GUEST_NAME: "Lee",
      ROOM_NO: "1302",
      RSVN_STATUS_CODE: "RR",
      RSVN_NO: "R2",
    },
    { branchId: "gangnam", mode: "ARRIVAL", queryDate: "20260429" },
  );

  const record = createLaundryRecordFromGuest(
    guest,
    { itemSummary: "수건 3장", note: "건조 요청" },
    new Date("2026-04-29T11:00:00+09:00"),
  );

  assert.equal(record.branchId, "gangnam");
  assert.equal(record.guestName, "Lee");
  assert.equal(record.displayRoom, "A302");
  assert.equal(record.sourcePmsGuestId, "gangnam-arrival-20260429-R2");
});

test("laundry storage only defaults missing storage key and rejects corrupt payloads", () => {
  assert.deepEqual(normalizeLaundryRecords(undefined), []);
  assert.throws(() => normalizeLaundryRecords({}), LaundryStorageError);
});

import test from "node:test";
import assert from "node:assert/strict";

import { upsertWingsRemarkLine } from "../src/application/wings-remark.js";

test("WINGS remark workflow replaces an existing remark line", async () => {
  let writtenRemark = "";
  const result = await upsertWingsRemarkLine(
    { type: "rentals", values: { items: "변환기 1개 / 충전기 1개" } },
    {
      readRemark: async () => "기존 메모입니다.\n- 대여물품 : 변환기 1개",
      writeRemark: async (nextRemark) => {
        writtenRemark = nextRemark;
      },
    },
  );

  assert.equal(result.line, "- 대여물품 : 변환기 1개 / 충전기 1개");
  assert.equal(writtenRemark, "기존 메모입니다.\n- 대여물품 : 변환기 1개 / 충전기 1개");
});

test("WINGS remark workflow appends a missing remark line", async () => {
  let writtenRemark = "";
  await upsertWingsRemarkLine(
    { type: "cardKeys", values: { count: 2 } },
    {
      readRemark: async () => "기존 메모입니다.",
      writeRemark: async (nextRemark) => {
        writtenRemark = nextRemark;
      },
    },
  );

  assert.equal(writtenRemark, "기존 메모입니다.\n\n- 제공 카드키 : 2장");
});

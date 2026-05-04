import { createRemarkLine, upsertRemarkLine, type RemarkType } from "../domain/remarks.js";

export type WingsRemarkDependencies = {
  readRemark(): Promise<string>;
  writeRemark(nextRemark: string): Promise<void>;
};

export type WingsRemarkInput = {
  type: RemarkType;
  values: Record<string, string | number | null | undefined>;
};

export class WingsRemarkDependencyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WingsRemarkDependencyError";
  }
}

export async function upsertWingsRemarkLine(
  input: WingsRemarkInput,
  dependencies: WingsRemarkDependencies | undefined,
): Promise<{ line: string; remark: string }> {
  const readRemark = requireReadRemark(dependencies);
  const writeRemark = requireWriteRemark(dependencies);
  const currentRemark = await readRemark();
  const remark = upsertRemarkLine(currentRemark, input.type, input.values);
  await writeRemark(remark);
  return {
    line: createRemarkLine(input.type, input.values),
    remark,
  };
}

function requireReadRemark(
  dependencies: WingsRemarkDependencies | undefined,
): WingsRemarkDependencies["readRemark"] {
  if (typeof dependencies?.readRemark !== "function") {
    throw new WingsRemarkDependencyError("WINGS 리마크 읽기 의존성이 연결되지 않았습니다.");
  }
  return dependencies.readRemark;
}

function requireWriteRemark(
  dependencies: WingsRemarkDependencies | undefined,
): WingsRemarkDependencies["writeRemark"] {
  if (typeof dependencies?.writeRemark !== "function") {
    throw new WingsRemarkDependencyError("WINGS 리마크 입력 의존성이 연결되지 않았습니다.");
  }
  return dependencies.writeRemark;
}

import {
  fillWingsReservationFromPreview,
  loadOtaReservationPreview,
  type OtaReservationInputDependencies,
  type OtaReservationInputPreview,
} from "../application/ota-reservation-input.js";
import type { BranchId } from "../types.js";

export type OtaWorkflowDependencies = OtaReservationInputDependencies;

export function loadOtaPreview(
  branchId: BranchId,
  dependencies: OtaWorkflowDependencies,
): Promise<OtaReservationInputPreview> {
  return loadOtaReservationPreview(branchId, dependencies);
}

export async function fillWingsFromOtaPreview(
  preview: OtaReservationInputPreview,
  dependencies: OtaWorkflowDependencies,
): Promise<string> {
  const result = await fillWingsReservationFromPreview(preview, dependencies);
  return `WINGS 입력 완료: ${result.filled.length}개 입력, ${result.missing.length}개 미발견. 저장은 직접 확인 후 진행해주세요.`;
}

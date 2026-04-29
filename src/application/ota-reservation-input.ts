import { normalizeOtaReservation, requireOtaDraftMinimum } from "../ota/normalizer.js";
import type { OtaReservationDraft, WingsReservationFieldMap } from "../ota/types.js";
import { buildWingsReservationFieldMap } from "../wings/reservation-draft.js";
import {
  fetchActiveOtaPayload,
  fillActiveWingsReservationForm,
} from "../platform/active-tab-automation.js";
import type { BranchId } from "../types.js";

export type OtaReservationInputPreview = {
  draft: OtaReservationDraft;
  fields: WingsReservationFieldMap;
};

export type OtaReservationInputDependencies = {
  fetchPayload?: typeof fetchActiveOtaPayload;
  fillForm?: typeof fillActiveWingsReservationForm;
};

export async function loadOtaReservationPreview(
  selectedBranchId: BranchId | "" | null,
  dependencies: OtaReservationInputDependencies = {},
): Promise<OtaReservationInputPreview> {
  const fetchPayload = dependencies.fetchPayload || fetchActiveOtaPayload;
  const { locator, payload } = await fetchPayload();
  const draft = normalizeOtaReservation(locator, payload);
  requireOtaDraftMinimum(draft);
  return {
    draft,
    fields: buildWingsReservationFieldMap(draft, selectedBranchId),
  };
}

export async function fillWingsReservationFromPreview(
  preview: OtaReservationInputPreview,
  dependencies: OtaReservationInputDependencies = {},
): Promise<{ filled: string[]; missing: string[] }> {
  const fillForm = dependencies.fillForm || fillActiveWingsReservationForm;
  return fillForm(preview.fields);
}

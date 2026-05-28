import { normalizeOtaReservation, requireOtaDraftMinimum } from "../ota/normalizer.js";
import type {
  OtaReservationDraft,
  OtaReservationLocator,
  OtaSource,
  WingsReservationFieldMap,
} from "../ota/types.js";
import { buildWingsReservationFieldMap } from "../wings/reservation-draft.js";
import type { BranchId } from "../types.js";

export type OtaReservationInputPreview = {
  draft: OtaReservationDraft;
  fields: WingsReservationFieldMap;
};

export type OtaSourcePresentation = Readonly<{
  source: OtaSource;
  label: string;
}>;

export const OTA_SOURCE_PRESENTATIONS = Object.freeze([
  { source: "naver", label: "NAVER" },
  { source: "station", label: "STATION" },
] satisfies readonly OtaSourcePresentation[]);

export function getOtaSourceLabel(source: OtaSource): string {
  return OTA_SOURCE_PRESENTATIONS.find((item) => item.source === source)?.label || source.toUpperCase();
}

export type OtaPayloadFetcher = () => Promise<{
  locator: OtaReservationLocator;
  payload: unknown;
}>;

export type WingsReservationFormFiller = (
  fields: WingsReservationFieldMap,
) => Promise<{ filled: string[]; missing: string[] }>;

export type OtaReservationInputDependencies = {
  fetchPayload: OtaPayloadFetcher;
  fillForm: WingsReservationFormFiller;
};

export class OtaReservationDependencyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OtaReservationDependencyError";
  }
}

export async function loadOtaReservationPreview(
  selectedBranchId: BranchId | "" | null,
  dependencies: Pick<OtaReservationInputDependencies, "fetchPayload">,
): Promise<OtaReservationInputPreview> {
  const fetchPayload = requireOtaPayloadFetcher(dependencies);
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
  dependencies: Pick<OtaReservationInputDependencies, "fillForm">,
): Promise<{ filled: string[]; missing: string[] }> {
  const fillForm = requireWingsReservationFormFiller(dependencies);
  return fillForm(preview.fields);
}

function requireOtaPayloadFetcher(
  dependencies: Pick<OtaReservationInputDependencies, "fetchPayload"> | undefined,
): OtaPayloadFetcher {
  if (typeof dependencies?.fetchPayload !== "function") {
    throw new OtaReservationDependencyError(
      "OTA 예약정보 가져오기 의존성이 연결되지 않았습니다.",
    );
  }
  return dependencies.fetchPayload;
}

function requireWingsReservationFormFiller(
  dependencies: Pick<OtaReservationInputDependencies, "fillForm"> | undefined,
): WingsReservationFormFiller {
  if (typeof dependencies?.fillForm !== "function") {
    throw new OtaReservationDependencyError(
      "WINGS 예약 입력 의존성이 연결되지 않았습니다.",
    );
  }
  return dependencies.fillForm;
}

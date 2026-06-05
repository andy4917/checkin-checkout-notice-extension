export const OTA_ACTIVE_TAB_REFRESH_MESSAGE =
  "올바른 지점 선택 또는 기존 탭을 새로고침 하십시오.";
export const WINGS_RESERVATION_WINDOW_MESSAGE =
  "WINGS 이동 후 화면에 Reservation 창을 클릭하여 열어주십시오.";
export const OPERATION_REPEATED_ERROR_MESSAGE =
  "오류가 발생하였습니다. 잠시 후 다시 시도해주십시오.";
export const OTA_BRANCH_MISMATCH_MESSAGE =
  "불러온 예약정보가 지점과 일치하지 않습니다. 지점 또는 탭을 확인 후 다시 시도해주십시오.";
export const WINGS_BROWSER_TAB_MESSAGE = "WINGS 브라우저 탭에서 진행하여주십시오.";
export const WINGS_ROOM_INFO_WINDOW_MESSAGE = "WINGS 예약정보창을 연 뒤 다시 실행해주세요.";
export const STORAGE_CORRUPTION_MESSAGE =
  "저장소 작업에 실패했습니다. 확장 프로그램 저장 권한과 Chrome 상태를 확인 후 다시 시도해주십시오.";
export const TEMPLATE_LANGUAGE_MISSING_MESSAGE =
  "해당 언어는 등록되어있지 않습니다. 등록 후 다시 시도해주십시오.";
export const REQUIRED_VARIABLE_MISSING_MESSAGE =
  "비어있는 필수 입력란을 확인 후 다시 시도해주십시오.";
export const PMS_REQUIRED_VALUE_MISSING_MESSAGE =
  "비어있는 PMS 값을 확인 후 다시 시도해주십시오.";
export const PMS_REQUEST_FAILED_MESSAGE =
  "PMS 조회에 실패했습니다. PMS 응답 형식 또는 네트워크 상태를 확인 후 다시 시도해주십시오.";
export const INVALID_WORKFLOW_STEP_MESSAGE = "잘못된 절차입니다.";

export type OperatorErrorKind =
  | "otaActiveTab"
  | "wingsReservationWindow"
  | "otaBranchMismatch"
  | "wingsBrowserTab"
  | "wingsRoomInfoWindow"
  | "storageCorruption"
  | "templateLanguageMissing"
  | "pmsRequiredValueMissing"
  | "pmsRequestFailed"
  | "requiredVariableMissing"
  | "invalidWorkflowStep"
  | "raw";

export type OperatorErrorMessage = {
  kind: OperatorErrorKind;
  message: string;
  repeatable: boolean;
};

export function createOperatorErrorMessageTracker() {
  let lastRepeatableKind: OperatorErrorKind | null = null;
  let consecutiveRepeatableCount = 0;

  return {
    format(error: unknown): string {
      const resolved = resolveOperatorErrorMessage(error);
      if (!resolved.repeatable) {
        lastRepeatableKind = null;
        consecutiveRepeatableCount = 0;
        return resolved.message;
      }

      consecutiveRepeatableCount =
        lastRepeatableKind === resolved.kind ? consecutiveRepeatableCount + 1 : 1;
      lastRepeatableKind = resolved.kind;

      return consecutiveRepeatableCount >= 2
        ? OPERATION_REPEATED_ERROR_MESSAGE
        : resolved.message;
    },
    reset() {
      lastRepeatableKind = null;
      consecutiveRepeatableCount = 0;
    },
  };
}

export function resolveOperatorErrorMessage(error: unknown): OperatorErrorMessage {
  const message = error instanceof Error ? error.message : String(error);

  if (/필수 입력값/.test(message)) {
    return { kind: "requiredVariableMissing", message: REQUIRED_VARIABLE_MISSING_MESSAGE, repeatable: false };
  }
  if (/PMS 핵심 정보를 가져오지 못했습니다/.test(message)) {
    return { kind: "pmsRequiredValueMissing", message: PMS_REQUIRED_VALUE_MISSING_MESSAGE, repeatable: false };
  }
  if (/PMS 요청 실패|PMS 응답/.test(message)) {
    return { kind: "pmsRequestFailed", message: PMS_REQUEST_FAILED_MESSAGE, repeatable: false };
  }
  if (/잘못된 절차/.test(message)) {
    return { kind: "invalidWorkflowStep", message: INVALID_WORKFLOW_STEP_MESSAGE, repeatable: false };
  }
  if (/번역본이 없어|언어는 등록/.test(message)) {
    return { kind: "templateLanguageMissing", message: TEMPLATE_LANGUAGE_MISSING_MESSAGE, repeatable: false };
  }
  if (/저장소|저장된 데이터|storage/i.test(message)) {
    return { kind: "storageCorruption", message: STORAGE_CORRUPTION_MESSAGE, repeatable: false };
  }
  if (/올바른 지점이 아닙니다|지점과 일치/.test(message)) {
    return { kind: "otaBranchMismatch", message: OTA_BRANCH_MISMATCH_MESSAGE, repeatable: false };
  }
  if (/예약생성창|Reservation 창|WINGS 예약 입력 의존성/.test(message)) {
    return {
      kind: "wingsReservationWindow",
      message: WINGS_RESERVATION_WINDOW_MESSAGE,
      repeatable: true,
    };
  }
  if (/리마크|예약정보창|객실 정보창/.test(message)) {
    return {
      kind: "wingsRoomInfoWindow",
      message: WINGS_ROOM_INFO_WINDOW_MESSAGE,
      repeatable: false,
    };
  }
  if (/로그인된 WINGS|WINGS 페이지|WINGS 브라우저/.test(message)) {
    return { kind: "wingsBrowserTab", message: WINGS_BROWSER_TAB_MESSAGE, repeatable: false };
  }
  if (
    /네이버|스테이션|OTA|Chrome 탭|활성 탭|예약정보를 가져오지|권한|API|fetch|잠시 후/.test(
      message,
    )
  ) {
    return { kind: "otaActiveTab", message: OTA_ACTIVE_TAB_REFRESH_MESSAGE, repeatable: true };
  }

  return { kind: "raw", message: OPERATION_REPEATED_ERROR_MESSAGE, repeatable: false };
}

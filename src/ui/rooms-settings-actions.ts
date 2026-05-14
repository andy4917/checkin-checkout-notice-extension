import {
  roomsSettingsActions,
  type RoomsSettingsAction,
} from "../catalog/menu-routing.js";
import type { TabContext } from "../platform/tab-context.js";
import type { BranchId, PmsGuestRecord } from "../types.js";
import type { TemplateDefinition } from "../catalog/template-types.js";

export const UNSUPPORTED_ROOMS_SETTINGS_COMMAND_MESSAGE = "지원하지 않는 실행 명령입니다.";

export type ResolvedRoomsSettingsAction = RoomsSettingsAction & {
  enabled: boolean;
  disabledReason?: string;
};

export type ResolveRoomsSettingsActionsInput = {
  navigationLocked: boolean;
  selectedBranchId: BranchId | "";
  selectedPmsRecord: PmsGuestRecord | null;
  selectedCommandTemplate: TemplateDefinition | null;
  tabContext: TabContext;
};

export function resolveRoomsSettingsActions({
  navigationLocked,
  selectedBranchId,
  selectedPmsRecord,
  selectedCommandTemplate,
  tabContext,
}: ResolveRoomsSettingsActionsInput): ResolvedRoomsSettingsAction[] {
  return roomsSettingsActions
    .filter((action) => {
      if (action.kind === "menu") return true;
      if (action.visibleWhenSelectedTemplateAudience) {
        return selectedCommandTemplate?.audience === action.visibleWhenSelectedTemplateAudience;
      }
      return true;
    })
    .map((action) => ({
      ...action,
      ...resolveActionState(action, {
        navigationLocked,
        selectedBranchId,
        selectedPmsRecord,
        tabContext,
      }),
    }));
}

function resolveActionState(
  action: RoomsSettingsAction,
  state: Pick<
    ResolveRoomsSettingsActionsInput,
    "navigationLocked" | "selectedBranchId" | "selectedPmsRecord" | "tabContext"
  >,
): Pick<ResolvedRoomsSettingsAction, "enabled" | "disabledReason"> {
  if (state.navigationLocked) {
    return { enabled: false, disabledReason: "작성을 완료하고 이동해주세요." };
  }
  if (action.kind === "command") {
    if (action.requiresBranch && !state.selectedBranchId) {
      return { enabled: false, disabledReason: "지점을 선택해주세요." };
    }
    if (action.requiresPmsRecord && !state.selectedPmsRecord) {
      return { enabled: false, disabledReason: "객실을 선택해주세요." };
    }
    if (action.requiresWingsReservationWindow && !state.tabContext.isGuestRecord) {
      return { enabled: false, disabledReason: "WINGS 예약정보창을 연 뒤 다시 실행해주세요." };
    }
  }
  return { enabled: true };
}

import {
  roomsSettingsActions,
  type MenuId,
  type RoomsSettingsAction,
} from "../catalog/menu-routing.js";
import type { TabContext } from "../platform/tab-context.js";
import type { BranchId, PmsGuestRecord } from "../types.js";

export type ResolvedRoomsSettingsAction = RoomsSettingsAction & {
  enabled: boolean;
  disabledReason?: string;
};

export type ResolveRoomsSettingsActionsInput = {
  activeMenu: MenuId | null;
  navigationLocked: boolean;
  selectedBranchId: BranchId | "";
  selectedPmsRecord: PmsGuestRecord | null;
  selectedRoomRemarkTemplateId: string;
  tabContext: TabContext;
};

export function resolveRoomsSettingsActions({
  activeMenu,
  navigationLocked,
  selectedBranchId,
  selectedPmsRecord,
  selectedRoomRemarkTemplateId,
  tabContext,
}: ResolveRoomsSettingsActionsInput): ResolvedRoomsSettingsAction[] {
  return roomsSettingsActions
    .filter((action) => {
      if (action.kind === "menu") return true;
      if (action.commandId === "UPSERT_WINGS_REMARK") {
        return activeMenu === "ROOM_REMARK_MEMO" && Boolean(selectedRoomRemarkTemplateId);
      }
      return false;
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
    return { enabled: false, disabledReason: "작성 또는 설정 중에는 이동할 수 없습니다." };
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

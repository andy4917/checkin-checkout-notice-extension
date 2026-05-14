import type { PmsGuestRecord } from "../types.js";
import { readNationalityFromFields } from "./language.js";

const NO_SELECTED_ROOM_STATUS = "Room not selected";

export type WorkRoomContext =
  | {
      selected: true;
      roomLabel: string;
      metaLabel: string;
    }
  | {
      selected: false;
      statusMessage: string;
    };

export function resolveWorkRoomContext(record: PmsGuestRecord | null): WorkRoomContext {
  const roomLabel = record?.displayRoom || record?.roomNo || "";
  if (!record || !roomLabel) {
    return {
      selected: false,
      statusMessage: NO_SELECTED_ROOM_STATUS,
    };
  }

  const metaLabel = [record.guestName, readNationalityFromFields(record.raw)]
    .filter(Boolean)
    .join(" · ");

  return {
    selected: true,
    roomLabel,
    metaLabel,
  };
}

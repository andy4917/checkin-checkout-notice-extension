import { HOTEL_CONFIG, UI_CONFIG } from "../config/app-config.js";
import type { Language } from "../types.js";

export function convertRoomNo(roomNoStr?: string): string {
  if (!roomNoStr) return UI_CONFIG.noAssignedRoomLabel;

  return roomNoStr
    .split(",")
    .map((room) => {
      const rawRoom = room.trim();
      const numericRoom = Number.parseInt(rawRoom, 10);

      if (numericRoom >= HOTEL_CONFIG.roomTowerCutover) {
        return `A${numericRoom - HOTEL_CONFIG.roomTowerOffset}`;
      }

      return rawRoom.startsWith("0") ? `B${rawRoom.substring(1)}` : `B${rawRoom}`;
    })
    .join(", ");
}

export function getFullRoomInfo(roomRaw: string, lang: Language | string): string {
  if (!roomRaw || roomRaw === UI_CONFIG.noAssignedRoomLabel) return roomRaw;

  return roomRaw
    .split(",")
    .map((room) => formatSingleRoom(room, lang))
    .join(", ");
}

function formatSingleRoom(room: string, lang: Language | string): string {
  const roomNumberText = room.trim().replace(/\D/g, "");
  const roomNumber = Number.parseInt(roomNumberText, 10);
  const isTowerA = roomNumber >= HOTEL_CONFIG.roomTowerCutover;
  const tower = getTowerLabel(isTowerA, lang);
  const displayRoomNumber = isTowerA
    ? roomNumber - HOTEL_CONFIG.roomTowerOffset
    : roomNumber;

  if (lang === "KO") return `${tower} / ${displayRoomNumber}호`;
  if (lang === "EN") return `${tower} / Room ${displayRoomNumber}`;
  if (lang === "JP") return `${tower} / ${displayRoomNumber}号室`;
  if (lang === "CN") return `${tower} / ${displayRoomNumber}号房`;

  return `${tower} ${displayRoomNumber}`;
}

function getTowerLabel(isTowerA: boolean, lang: Language | string): string {
  if (lang === "KO") return isTowerA ? "A타워" : "B타워";
  if (lang === "JP") return isTowerA ? "Aタワー" : "Bタワー";
  if (lang === "CN") return isTowerA ? "A塔" : "B塔";
  return isTowerA ? "A Tower" : "B Tower";
}

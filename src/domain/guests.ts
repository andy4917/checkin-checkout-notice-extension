import { convertRoomNo } from "./rooms.js";
import { HOTEL_CONFIG } from "../config/app-config.js";
import type { Guest, PmsGuestRecord } from "../types.js";

export function filterGuests(guests: Guest[], searchTerm: string): Guest[] {
  const normalizedTerm = searchTerm.toLowerCase();

  return guests.filter((guest) => {
    const name = (guest.GUEST_NAME || "").toLowerCase();
    const displayRoom = convertRoomNo(guest.ROOM_NO).toLowerCase();
    return name.includes(normalizedTerm) || displayRoom.includes(normalizedTerm);
  });
}

export function sortGuestsByRoom(guests: Guest[]): Guest[] {
  return [...guests].sort((a, b) => {
    const roomA = Number.parseInt(a.ROOM_NO || "9999", 10);
    const roomB = Number.parseInt(b.ROOM_NO || "9999", 10);
    const zoneA = roomA >= HOTEL_CONFIG.roomTowerCutover ? 2 : 1;
    const zoneB = roomB >= HOTEL_CONFIG.roomTowerCutover ? 2 : 1;
    return zoneA !== zoneB ? zoneA - zoneB : roomA - roomB;
  });
}

export function filterPmsGuestRecords(
  records: PmsGuestRecord[],
  searchTerm: string,
): PmsGuestRecord[] {
  const normalizedTerm = searchTerm.toLowerCase();
  if (!normalizedTerm) return records;

  return records.filter((record) => {
    return (
      record.guestName.toLowerCase().includes(normalizedTerm) ||
      record.roomNo.toLowerCase().includes(normalizedTerm) ||
      record.displayRoom.toLowerCase().includes(normalizedTerm) ||
      record.statusLabel.toLowerCase().includes(normalizedTerm)
    );
  });
}

export function sortPmsGuestRecords(records: PmsGuestRecord[]): PmsGuestRecord[] {
  return [...records].sort((a, b) => {
    const roomA = Number.parseInt(a.roomNo || "9999", 10);
    const roomB = Number.parseInt(b.roomNo || "9999", 10);
    const zoneA = roomA >= HOTEL_CONFIG.roomTowerCutover ? 2 : 1;
    const zoneB = roomB >= HOTEL_CONFIG.roomTowerCutover ? 2 : 1;
    return zoneA !== zoneB ? zoneA - zoneB : roomA - roomB;
  });
}

export function getGuestStatus(statusCode: string | undefined) {
  const statusMap: Record<string, { text: string; tagClass: string }> = {
    RR: { text: "입실 예정", tagClass: "tag-rr" },
    CI: { text: "재실 중", tagClass: "tag-ci" },
    CO: { text: "체크아웃 완료", tagClass: "tag-co" },
  };

  return statusMap[statusCode || ""] || { text: statusCode || "", tagClass: "" };
}

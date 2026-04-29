import { UI_CONFIG } from "../config/app-config.js";
import { requireBranch } from "../config/branches.js";
import { getAssetsForBranch } from "../assets/asset-catalog.js";
import { getGuestStatus, sortGuestsByRoom } from "../domain/guests.js";
import { convertRoomNo } from "../domain/rooms.js";
import type { BranchId, DepartureMessageType, Guest, Language, MessageAction, TabMode } from "../types.js";

export function renderGuestList(
  guests: Guest[],
  currentTab: TabMode,
  branchId: BranchId,
): string {
  if (guests.length === 0) {
    return "<div class=\"empty-state\">결과가 없습니다.</div>";
  }
  const branch = requireBranch(branchId);

  return sortGuestsByRoom(guests)
    .map((guest) => renderGuestCard(guest, currentTab, branch.id))
    .join("");
}

function renderGuestCard(guest: Guest, currentTab: TabMode, branchId: BranchId): string {
  const cardClass =
    guest.RSVN_STATUS_CODE === "CI" ? "INHOUSE-card" : `${currentTab}-card`;
  const status = getGuestStatus(guest.RSVN_STATUS_CODE);
  const displayRoomNo = convertRoomNo(guest.ROOM_NO);

  return `
      <div class="guest-card ${cardClass}">
        <div class="guest-info">
          <div><span class="room-no">${escapeHtml(displayRoomNo)}</span> <strong>${escapeHtml(guest.GUEST_NAME || "")}</strong></div>
          <span class="status-tag ${status.tagClass}">${escapeHtml(status.text)}</span>
        </div>
        ${currentTab === "ARRIVAL" ? renderArrivalActions(guest, branchId) : renderDepartureActions(guest)}
      </div>`;
}

function renderArrivalActions(guest: Guest, branchId: BranchId): string {
  return `
    <div class="btn-group-row">
      <div class="btn-group-title">입실 직후 안내 (웰컴 메시지)</div>
      <div class="btn-grid-4">
        ${UI_CONFIG.supportedLanguages.map((lang) => renderMessageButton({
          action: "arrival",
          lang,
          guest,
        })).join("")}
      </div>
    </div>
    ${renderArrivalAssets(branchId)}`;
}

function renderDepartureActions(guest: Guest): string {
  return (
    renderDepartureActionRow(guest, "30분 전 리마인더 (10:30)", "BEFORE_30") +
    renderDepartureActionRow(guest, "15분 경과 (11:15)", "AFTER_15", true) +
    renderDepartureActionRow(guest, "12LCO (12:00)", "LATE_12")
  );
}

function renderDepartureActionRow(
  guest: Guest,
  title: string,
  type: DepartureMessageType,
  isUrgent = false,
): string {
  return `
    <div class="btn-group-row">
      <div class="btn-group-title">${title}</div>
      <div class="btn-grid-4">
        ${UI_CONFIG.supportedLanguages.map((lang) => renderMessageButton({
          action: "departure",
          lang,
          guest,
          type,
          isUrgent,
        })).join("")}
      </div>
    </div>`;
}

function renderMessageButton({
  action,
  lang,
  guest,
  type = "",
  isUrgent = false,
}: {
  action: MessageAction;
  lang: Language;
  guest: Guest;
  type?: DepartureMessageType | "";
  isUrgent?: boolean;
}): string {
  const typeAttribute = type ? ` data-type="${escapeAttribute(type)}"` : "";
  return `<button class="msg-btn ${isUrgent ? "btn-reminder" : ""}" data-action="${action}" data-lang="${lang}"${typeAttribute} data-name="${escapeAttribute(guest.GUEST_NAME || "")}" data-room="${escapeAttribute(guest.ROOM_NO || "")}" data-deptdate="${escapeAttribute(guest.DEPT_DATE || "")}">${lang}</button>`;
}

function renderArrivalAssets(branchId: BranchId): string {
  const assets = getAssetsForBranch(branchId);
  if (assets.length === 0) return "";

  return `
    <div class="btn-group-row">
      <div class="btn-group-title">첨부 안내</div>
      <div class="asset-list">
        ${assets.map((asset) => `<span class="asset-pill" data-asset-id="${escapeAttribute(asset.id)}">${escapeHtml(asset.title)}</span>`).join("")}
      </div>
    </div>`;
}

function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value: unknown): string {
  return escapeHtml(value);
}

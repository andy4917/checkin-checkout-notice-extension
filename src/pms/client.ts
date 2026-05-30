import { EXTENSION_CONFIG, PMS_CONFIG } from "../config/app-config.js";
import { requireBranch } from "../config/branches.js";
import { buildPmsSearchParams } from "./filter-builder.js";
import type { BranchId, Guest, PmsFetch, TabMode } from "../types.js";

export class PmsRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PmsRequestError";
  }
}

export async function fetchPmsGuests(
  date: string,
  mode: TabMode,
  branchId: BranchId | "" | null,
  fetchImpl: PmsFetch,
): Promise<Guest[]> {
  const branch = requireBranch(branchId);
  const endpoint = `${EXTENSION_CONFIG.allowedPmsOrigins[0]}${PMS_CONFIG.endpointPath}`;
  const response = await fetchImpl(endpoint, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: buildPmsSearchParams(date, mode, branch.id),
  });
  if (!response.ok) {
    const status = response.status ? ` ${response.status}` : "";
    const statusText = response.statusText ? ` ${response.statusText}` : "";
    throw new PmsRequestError(`PMS 요청 실패:${status}${statusText}`.trim());
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new PmsRequestError(`PMS 응답 JSON을 읽지 못했습니다: ${message}`);
  }

  if (!isRecord(data)) {
    throw new PmsRequestError("PMS 응답 형식이 올바르지 않습니다: object expected.");
  }
  if (!("rows" in data)) {
    throw new PmsRequestError("PMS 응답 형식이 올바르지 않습니다: rows is required.");
  }
  if (!Array.isArray(data.rows)) {
    throw new PmsRequestError("PMS 응답 형식이 올바르지 않습니다: rows must be an array.");
  }

  return data.rows.map(normalizeGuestRow);
}

function normalizeGuestRow(row: unknown): Guest {
  if (!isRecord(row)) {
    throw new PmsRequestError("PMS 응답 형식이 올바르지 않습니다: row must be an object.");
  }

  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, value == null ? "" : String(value)]),
  ) as Guest;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

import type { BranchId } from "../types.js";

export const DEFAULT_BRANCH_ID = null;

export const BRANCHES = Object.freeze({
  coex: Object.freeze({
    id: "coex",
    label: "코엑스",
    headerLabel: "The Coex",
    locationLabel: "Seoul, Gangnam-gu",
    pms: Object.freeze({
      bsnsCode: "13",
      propertyNo: "13",
      ppBsnsCode: "13",
    }),
    doorPasswordGuideEnabled: true,
  }),
  gangnam: Object.freeze({
    id: "gangnam",
    label: "강남",
    headerLabel: "The Gangnam",
    locationLabel: "Seoul, Seocho-gu",
    pms: Object.freeze({
      bsnsCode: "91",
      propertyNo: "91",
      ppBsnsCode: "91",
    }),
    doorPasswordGuideEnabled: false,
  }),
  seolleung: Object.freeze({
    id: "seolleung",
    label: "선릉",
    headerLabel: "The Seolleung",
    locationLabel: "Seoul, Gangnam-gu",
    pms: Object.freeze({
      bsnsCode: "14",
      propertyNo: "14",
      ppBsnsCode: "14",
    }),
    doorPasswordGuideEnabled: false,
  }),
} satisfies Record<
  BranchId,
  {
    id: BranchId;
    label: string;
    headerLabel: string;
    locationLabel: string;
    pms: {
      bsnsCode: string;
      propertyNo: string;
      ppBsnsCode: string;
    };
    doorPasswordGuideEnabled: boolean;
  }
>);

export type Branch = (typeof BRANCHES)[BranchId];

export function getBranch(branchId: string | null | undefined): Branch | null {
  if (!branchId || !isBranchId(branchId)) return null;
  return BRANCHES[branchId] || null;
}

export function getBranchOptions() {
  return Object.values(BRANCHES).map(({ id, label, headerLabel, locationLabel }) => ({
    id,
    label,
    headerLabel,
    locationLabel,
  }));
}

export function requireBranch(branchId: string | null | undefined): Branch {
  const branch = getBranch(branchId);
  if (!branch) {
    throw new Error("지점을 선택해주세요.");
  }
  return branch;
}

export function isBranchId(branchId: string): branchId is BranchId {
  return Object.hasOwn(BRANCHES, branchId);
}

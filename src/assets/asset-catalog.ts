import type { BranchId } from "../types.js";

type ExtensionAsset = {
  id: string;
  title: string;
  type: "video";
  path: string;
  branchScope: BranchId[];
  sourcePaths: string[];
  duplicateGroupId: string;
};

const defineAsset = (asset: ExtensionAsset): Readonly<ExtensionAsset> => Object.freeze(asset);

export const ASSET_CATALOG: readonly ExtensionAsset[] = Object.freeze([
  // COEX door-password video is intentionally excluded from the extension package.
]);

export function getAssetsForBranch(branchId: BranchId): ExtensionAsset[] {
  return ASSET_CATALOG.filter((asset) => asset.branchScope.includes(branchId));
}

export function hasDoorPasswordGuideAsset(branchId: BranchId): boolean {
  return getAssetsForBranch(branchId).some(
    (asset) => asset.id === "coex-door-password-guide-video",
  );
}

export function filterAttachmentIdsForBranch(
  attachmentIds: readonly string[],
  branchId: BranchId,
): string[] {
  const branchAssetIds = new Set(getAssetsForBranch(branchId).map((asset) => asset.id));
  return attachmentIds.filter((attachmentId) => branchAssetIds.has(attachmentId));
}

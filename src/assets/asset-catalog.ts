import type { BranchId } from "../types.js";

const baseLogoUrl = new URL("./logo.png", import.meta.url).href;
const branchLogoUrls: Record<BranchId, string> = Object.freeze({
  coex: new URL("./logo-coex.png", import.meta.url).href,
  gangnam: new URL("./logo-gangnam.png", import.meta.url).href,
  seolleung: new URL("./logo-seolleung.png", import.meta.url).href,
});

type ExtensionAsset = {
  id: string;
  title: string;
  type: "video";
  path: string;
  branchScope: BranchId[];
  sourcePaths: string[];
  duplicateGroupId: string;
};

export const ASSET_CATALOG: readonly ExtensionAsset[] = Object.freeze([
  // COEX door-password video is intentionally excluded from the extension package.
]);

export function getAssetsForBranch(branchId: BranchId): ExtensionAsset[] {
  return ASSET_CATALOG.filter((asset) => asset.branchScope.includes(branchId));
}

export function filterAttachmentIdsForBranch(
  attachmentIds: readonly string[],
  branchId: BranchId,
): string[] {
  const branchAssetIds = new Set(getAssetsForBranch(branchId).map((asset) => asset.id));
  return attachmentIds.filter((attachmentId) => branchAssetIds.has(attachmentId));
}

export function getHeaderLogoUrl(branchId: BranchId | ""): string {
  return branchId ? branchLogoUrls[branchId] : baseLogoUrl;
}

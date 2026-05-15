import { getBranchOptions } from "../config/branches.js";
import {
  getHomeMenuSections,
  homeBottomNavigationItems,
  homeNavigationGroups,
} from "../catalog/menu-routing.js";
import type { Language } from "../types.js";
import type {
  TemplateAudience,
  TemplateCategory,
  TemplateContextRequirement,
} from "../catalog/template-types.js";

export const homeMenuSections = getHomeMenuSections();
export const homeNavigation = homeNavigationGroups;
export const homeBottomNavigation = homeBottomNavigationItems;
export const branchOptions = getBranchOptions();

export const languageOptions: Array<{ id: Language; label: string }> = [
  { id: "KO", label: "KR" },
  { id: "EN", label: "EN" },
  { id: "JP", label: "JP" },
  { id: "CN", label: "CH" },
];

export const categoryOptions: Array<{ id: TemplateCategory; label: string }> = [
  { id: "CUSTOMER_RECORDS", label: "객실 정보 메모" },
  { id: "GUEST_NOTICE", label: "고객 안내문" },
  { id: "QUICK_REPLY", label: "빠른 문의 답변" },
  { id: "WORK_TEMPLATE", label: "업무 관리" },
];

export const audienceOptions: Array<{ id: TemplateAudience; label: string }> = [
  { id: "guest", label: "고객" },
  { id: "internal", label: "내부" },
  { id: "pmsRemark", label: "객실 메모" },
];

export const contextOptions: Array<{ id: TemplateContextRequirement; label: string }> = [
  { id: "none", label: "없음" },
  { id: "pmsPage", label: "WINGS" },
  { id: "guestRecord", label: "고객정보" },
];

import { PMS_CONFIG } from "../config/app-config.js";
import { requireBranch } from "../config/branches.js";
import { EMPTY_PMS_FILTERS } from "../config/pms-filter-schema.js";
import type { BranchId, TabMode } from "../types.js";

export function buildPmsSearchParams(date: string, mode: TabMode, branchId: BranchId): URLSearchParams {
  const params = new URLSearchParams();
  const { requestDefaults, status } = PMS_CONFIG;
  const branch = requireBranch(branchId);

  params.append("take", requestDefaults.take);
  params.append("skip", requestDefaults.skip);
  params.append("page", requestDefaults.page);
  params.append("pageSize", requestDefaults.pageSize);
  appendFilter(params, 0, "BSNS_CODE", branch.pms.bsnsCode);
  appendFilter(params, 1, "PROPERTY_NO", branch.pms.propertyNo);
  appendFilter(params, 2, "GUEST_NAME", "");
  appendFilter(params, 3, "RSVN_FOLIO_NO", "");
  appendFilter(params, 4, "ROOM_NO", "");
  appendFilter(params, 5, "SEARCH_KEY", "");

  appendModeDateFilters(params, date, mode);
  appendEmptyFilters(params, 12, EMPTY_PMS_FILTERS.slice(6));
  appendFilter(params, 37, "RSVN_STATUS_CODE", status.reservationStatusCode);
  appendArrayFilter(params, 38, "RSVN_STATUS_CODE_ARRAY", status.reservationStatusGroups);
  appendFilter(params, 39, "TYPE_CODE", status.typeCode);
  appendArrayFilter(params, 40, "TYPE_CODE_ARRAY", status.typeCodeGroups);
  appendFilter(params, 41, "IND_GROUP_CODE", status.individualGroupCode);
  appendArrayFilter(params, 42, "IND_GROUP_CODE_ARRAY", status.individualGroupGroups);
  appendFilter(params, 43, "DISPLAY_OPTION", status.displayOption);
  appendFilter(params, 44, "PP_BSNS_CODE", branch.pms.ppBsnsCode);
  params.append("PAGE_ID", requestDefaults.pageId);
  params.append("AUTH_PASS_YN", requestDefaults.authPassYn);
  params.set("filter[PAGE_ID]", requestDefaults.pageId);
  params.set("filter[AUTH_PASS_YN]", requestDefaults.authPassYn);

  return params;
}

function appendModeDateFilters(params: URLSearchParams, date: string, mode: TabMode): void {
  const isArrival = mode === "ARRIVAL";
  appendFilter(params, 6, "ARRV_DATE_F", isArrival ? date : "");
  appendFilter(params, 7, "ARRV_DATE_T", isArrival ? date : "");
  appendFilter(params, 8, "STAY_DATE_F", "");
  appendFilter(params, 9, "STAY_DATE_T", "");
  appendFilter(params, 10, "DEPT_DATE_F", isArrival ? "" : date);
  appendFilter(params, 11, "DEPT_DATE_T", isArrival ? "" : date);
}

function appendEmptyFilters(
  params: URLSearchParams,
  startIndex: number,
  filterNames: readonly string[],
): void {
  filterNames.forEach((field, offset) => {
    appendFilter(params, startIndex + offset, field, "");
  });
}

function appendFilter(
  params: URLSearchParams,
  index: number,
  field: string,
  value: string,
): void {
  params.append(`filter[filters][${index}][field]`, field);
  params.append(`filter[filters][${index}][value]`, value);
}

function appendArrayFilter(
  params: URLSearchParams,
  index: number,
  field: string,
  values: readonly string[],
): void {
  params.append(`filter[filters][${index}][field]`, field);
  values.forEach((value) => {
    params.append(`filter[filters][${index}][value][]`, value);
  });
}

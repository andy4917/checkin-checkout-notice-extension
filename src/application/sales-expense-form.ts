export type SalesExpenseCategoryId = "SUPPLIES" | "REPAIRS" | "FOOD" | "OTHER";

export type SalesExpenseCategory = Readonly<{
  id: SalesExpenseCategoryId;
  label: string;
  itemValue: string;
}>;

export const SALES_EXPENSE_CATEGORIES = Object.freeze([
  { id: "SUPPLIES", label: "소모품", itemValue: "소모품" },
  { id: "REPAIRS", label: "수리", itemValue: "수리" },
  { id: "FOOD", label: "식음료", itemValue: "식음료" },
  { id: "OTHER", label: "기타", itemValue: "기타" },
] satisfies readonly SalesExpenseCategory[]);

export function formatSalesExpenseAmount(input: string | undefined): string {
  const rawValue = input?.trim();
  if (!rawValue) return "0";
  const numeric = Number(rawValue.replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(numeric)) return rawValue;
  return new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: 0,
  }).format(numeric);
}

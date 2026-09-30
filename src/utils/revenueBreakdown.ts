import type {
  FnbRevenueCategory,
  IBill,
  RevenueBreakdown,
  RevenueCategory,
} from "@/@types/Bill";

export const EMPTY_REVENUE_BREAKDOWN: RevenueBreakdown = {
  SERVICE_ROOM: 0,
  FNB_RETAIL: 0,
  FNB_PREPARED: 0,
  OTHER: 0,
};

export const FNB_REVENUE_CATEGORIES: readonly FnbRevenueCategory[] = [
  "FNB_RETAIL",
  "FNB_PREPARED",
];

export const REVENUE_CATEGORY_LABELS: Record<RevenueCategory, string> = {
  SERVICE_ROOM: "Phí thu âm",
  FNB_RETAIL: "Bán sẵn",
  FNB_PREPARED: "Pha chế",
  OTHER: "Khác",
};

export const FNB_REVENUE_CATEGORY_HINTS: Record<FnbRevenueCategory, string> = {
  FNB_RETAIL: "Đồ đóng gói / bán sẵn (snack, lon, chai)",
  FNB_PREPARED: "Pha chế / làm tại quán",
};

const REVENUE_CATEGORIES: RevenueCategory[] = [
  "SERVICE_ROOM",
  "FNB_RETAIL",
  "FNB_PREPARED",
  "OTHER",
];

export const isFnbRevenueCategory = (
  value: unknown,
): value is FnbRevenueCategory =>
  value === "FNB_RETAIL" || value === "FNB_PREPARED";

export const normalizeRevenueBreakdown = (
  input?: Partial<RevenueBreakdown> | null,
): RevenueBreakdown => {
  const next = { ...EMPTY_REVENUE_BREAKDOWN };
  if (!input) return next;

  REVENUE_CATEGORIES.forEach((key) => {
    const value = input[key];
    next[key] = typeof value === "number" && Number.isFinite(value) ? value : 0;
  });

  return next;
};

export const getFnbRevenue = (breakdown: RevenueBreakdown): number =>
  breakdown.FNB_RETAIL + breakdown.FNB_PREPARED;

type BillRevenueSource = Pick<
  Partial<IBill>,
  "revenueBreakdown" | "roomTotal" | "fnbTotal"
>;

export const resolveBillRevenueBreakdown = (
  bill: BillRevenueSource,
): RevenueBreakdown => {
  if (bill.revenueBreakdown) {
    return normalizeRevenueBreakdown(bill.revenueBreakdown);
  }

  return {
    SERVICE_ROOM: bill.roomTotal ?? 0,
    FNB_RETAIL: bill.fnbTotal ?? 0,
    FNB_PREPARED: 0,
    OTHER: 0,
  };
};

export const sumBillRevenueBreakdowns = (
  bills: BillRevenueSource[],
): RevenueBreakdown =>
  bills.reduce((acc, bill) => {
    const breakdown = resolveBillRevenueBreakdown(bill);
    return {
      SERVICE_ROOM: acc.SERVICE_ROOM + breakdown.SERVICE_ROOM,
      FNB_RETAIL: acc.FNB_RETAIL + breakdown.FNB_RETAIL,
      FNB_PREPARED: acc.FNB_PREPARED + breakdown.FNB_PREPARED,
      OTHER: acc.OTHER + breakdown.OTHER,
    };
  }, { ...EMPTY_REVENUE_BREAKDOWN });

export const resolveMenuItemRevenueCategory = (
  value?: string | null,
): FnbRevenueCategory =>
  isFnbRevenueCategory(value) ? value : "FNB_RETAIL";

export const shouldRequireRevenueCategoryReason = (
  original?: string | null,
  next?: string | null,
): boolean => {
  if (!next || !isFnbRevenueCategory(next)) return false;
  const previous = resolveMenuItemRevenueCategory(original);
  return previous !== next;
};

export type RevenueCategoryUpdateFields =
  | { kind: "omit" }
  | { kind: "error"; message: string }
  | {
      kind: "include";
      revenueCategory: FnbRevenueCategory;
      reason: string;
    };

const REVENUE_CATEGORY_REASON_ERROR =
  "Thay đổi revenueCategory yêu cầu Admin và lý do";

/**
 * Edit payload: only send revenueCategory when it actually changed.
 * Always sending the current/defaulted value makes PUT /fnb-menu-item treat a
 * quantity-only update as a category change and return 400.
 */
export const getRevenueCategoryUpdateFields = (
  original?: string | null,
  next?: string | null,
  reason?: string | null,
): RevenueCategoryUpdateFields => {
  if (!shouldRequireRevenueCategoryReason(original, next)) {
    return { kind: "omit" };
  }

  const trimmedReason = reason?.trim() || "";
  if (!trimmedReason) {
    return { kind: "error", message: REVENUE_CATEGORY_REASON_ERROR };
  }

  return {
    kind: "include",
    revenueCategory: next as FnbRevenueCategory,
    reason: trimmedReason,
  };
};

export type GiftAppliedSource = "all" | "membership" | "gift" | "streak";
export type GiftAppliedKind = "all" | "fnb" | "discount";

export type GiftAppliedBillItem = {
  _id: string;
  invoiceCode: string;
  roomName: string;
  customerName: string;
  customerPhone: string;
  memberTier?: string;
  appliedKind: "fnb" | "discount";
  appliedSource: Exclude<GiftAppliedSource, "all">;
  appliedReason: string;
  streakGifts?: Array<{
    streakCount: number;
    items: Array<{ name: string; quantity: number }>;
  }>;
  giftName: string;
  giftValue?: number;
  giftDiscountAmount: number;
  membershipDiscountAmount: number;
  totalAmount: number;
  endTime: string;
  completedBy?: string;
};

export type GiftAppliedBillsSummary = {
  totalBills: number;
  fnbBills: number;
  discountBills: number;
  membershipBills: number;
  giftBills: number;
  streakBills: number;
  totalGiftDiscountAmount: number;
  totalMembershipDiscountAmount: number;
};

export type GiftAppliedBillsFilters = {
  startDate: string;
  endDate: string;
  kind: GiftAppliedKind;
  source: GiftAppliedSource;
  search: string;
};

export const SOURCE_META: Record<
  Exclude<GiftAppliedSource, "all">,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  membership: { label: "Membership", variant: "default" },
  gift: { label: "Quà tặng", variant: "secondary" },
  streak: { label: "Streak", variant: "outline" },
};

export const DEFAULT_GIFT_APPLIED_FILTERS: GiftAppliedBillsFilters = {
  startDate: "",
  endDate: "",
  kind: "all",
  source: "all",
  search: "",
};

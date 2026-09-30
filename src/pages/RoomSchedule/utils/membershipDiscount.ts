import type { IBillMembership, IBillMembershipDiscount } from "@/@types/Bill";
import type { ITierDiscount } from "@/@types/Membership";

export type MembershipDiscountDisplay = {
  tier?: string;
  name?: string;
  discountPercentage?: number;
  discountAmount?: number;
  note?: string;
  /** Số tiền BE đã trừ trên bill */
  appliedAmount?: number;
};

const formatVnd = (amount: number) =>
  `${amount.toLocaleString("vi-VN")} VNĐ`;

/** Nhãn ngắn cho 1 benefit: "Giảm 10%" | "Giảm 50.000 VNĐ" */
export const formatTierDiscountLabel = (
  discount?: Pick<
    ITierDiscount,
    "discountPercentage" | "discountAmount"
  > | null,
): string | null => {
  if (!discount) return null;

  if (
    discount.discountPercentage !== undefined &&
    discount.discountPercentage !== null &&
    !Number.isNaN(discount.discountPercentage)
  ) {
    return `Giảm ${discount.discountPercentage}%`;
  }

  if (
    discount.discountAmount !== undefined &&
    discount.discountAmount !== null &&
    !Number.isNaN(discount.discountAmount)
  ) {
    return `Giảm ${formatVnd(discount.discountAmount)}`;
  }

  return null;
};

export const formatTierDiscountList = (
  discounts?: ITierDiscount[] | null,
): string[] => {
  if (!discounts?.length) return [];
  return discounts
    .map((item) => {
      const label = formatTierDiscountLabel(item);
      if (!label) return null;
      return item.note?.trim() ? `${label} — ${item.note.trim()}` : label;
    })
    .filter((label): label is string => Boolean(label));
};

/**
 * Checkout: chỉ đọc từ bill.membership (+ membershipDiscountAmount nếu có).
 * Không fallback / không tự tính phía FE.
 */
export const resolveBillMembershipDiscount = (options: {
  membership?: IBillMembership | null;
  membershipDiscount?: IBillMembershipDiscount | null;
  membershipDiscountAmount?: number | null;
}): MembershipDiscountDisplay | null => {
  const { membership, membershipDiscount, membershipDiscountAmount } = options;
  if (!membership && membershipDiscountAmount == null && !membershipDiscount) {
    return null;
  }

  const firstTierDiscount = membership?.tierDiscount?.[0];

  const discountPercentage =
    membership?.discountPercentage ??
    membershipDiscount?.discountPercentage ??
    firstTierDiscount?.discountPercentage;
  const discountAmount =
    membership?.discountAmount ??
    membershipDiscount?.discountAmount ??
    firstTierDiscount?.discountAmount;
  const note =
    membership?.note ?? membershipDiscount?.note ?? firstTierDiscount?.note;
  const appliedAmount =
    membershipDiscountAmount ??
    membership?.discountAppliedAmount ??
    membershipDiscount?.appliedAmount ??
    undefined;

  const hasAny =
    Boolean(membership?.tier || membership?.name || membership?.full_name) ||
    discountPercentage !== undefined ||
    discountAmount !== undefined ||
    (appliedAmount !== undefined && appliedAmount > 0);

  if (!hasAny) return null;

  return {
    tier: membership?.tier ?? membershipDiscount?.tier,
    name: membership?.full_name || membership?.name,
    discountPercentage,
    discountAmount,
    note,
    appliedAmount,
  };
};

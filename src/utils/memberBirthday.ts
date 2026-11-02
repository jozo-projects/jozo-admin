import { z } from "zod";

export interface BirthdayPolicy {
  enabled: boolean;
  discountPercentage: number;
  itemCount: number;
  itemIds: string[];
}
export interface BirthdaySelection {
  items: Array<{ itemId: string; quantity: number }>;
}
export interface ScheduleBirthdayDraft {
  userId: string;
  selection: BirthdaySelection;
}
export interface BirthdaySnapshot {
  usageKey: string;
  userId: string;
  year: number;
  appliedAt: string;
  confirmedBy: string;
  discountPercentage: number;
  discountAmount: number;
  itemCount: number;
  items: Array<{
    itemId: string;
    name: string;
    quantity: number;
    inventoryTracked: boolean;
  }>;
}
export interface MemberBirthday {
  eligible: boolean;
  year: number;
  reason?:
    | "disabled"
    | "member_not_found"
    | "outside_birthday_month"
    | "already_used"
    | "no_available_items";
  policy?: BirthdayPolicy;
  items: Array<{
    itemId: string;
    name: string;
    availableQuantity: number | null;
  }>;
  usedBill?: { billId: string; invoiceCode: string; appliedAt: string };
}
export interface BirthdayHistory {
  page: number;
  limit: number;
  totalCount: number;
  items: Array<{
    billId: string;
    invoiceCode: string;
    roomId: string;
    scheduleId: string;
    totalAmount: number;
    birthday: BirthdaySnapshot;
  }>;
}
export interface BirthdayCheckoutDraft {
  scope: string;
  checked: boolean;
  selection: BirthdaySelection;
}
export function restoreBirthdayDraft(scope: string, memberId: string, saved?: { userId: string; selection: BirthdaySelection } | null): BirthdayCheckoutDraft {
  return { scope, checked: !!memberId && saved?.userId === memberId, selection: memberId && saved?.userId === memberId ? saved.selection : { items: [] } };
}
export function birthdayDraftForScope(scope: string, enabled: boolean, draft: BirthdayCheckoutDraft): BirthdayCheckoutDraft {
  return draft.scope === scope && enabled ? draft : { scope, checked: false, selection: { items: [] } };
}

export const birthdayPolicySchema = z
  .object({
    enabled: z.boolean(),
    discountPercentage: z.coerce.number().finite().min(0).max(100),
    itemCount: z.coerce.number().int().min(1).max(100),
    itemIds: z
      .array(z.string().min(1))
      .refine(
        (ids) => new Set(ids).size === ids.length,
        "Không được chọn trùng món",
      ),
  })
  .refine((policy) => !policy.enabled || policy.itemIds.length > 0, {
    message: "Chọn ít nhất một đồ uống",
    path: ["itemIds"],
  });
export function birthdaySelectionPayload(
  checked: boolean,
  selection: BirthdaySelection,
): { birthdaySelection?: BirthdaySelection } {
  return checked ? { birthdaySelection: selection } : {};
}
export function isBirthdaySelectionValid(
  offer: MemberBirthday | undefined,
  selection: BirthdaySelection,
): boolean {
  if (!offer?.eligible || !offer.policy?.enabled || !selection.items.length)
    return false;
  const seen = new Set<string>();
  let total = 0;
  for (const { itemId, quantity } of selection.items) {
    const item = offer.items.find((item) => item.itemId === itemId);
    if (
      !item ||
      seen.has(itemId) ||
      !Number.isSafeInteger(quantity) ||
      quantity <= 0 ||
      (item.availableQuantity !== null && quantity > item.availableQuantity)
    )
      return false;
    seen.add(itemId);
    total += quantity;
  }
  return total === offer.policy.itemCount;
}

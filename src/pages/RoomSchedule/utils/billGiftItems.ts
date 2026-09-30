import { BillGift } from "@/@types/Gift";
import { IServedStreakGift } from "@/@types/Membership";

export type InvoiceGiftLine = {
  key: string;
  itemId: string;
  name: string;
  category?: string;
  quantity: number;
  streakCount: number;
  remainingQuota: number;
  canEdit: boolean;
};

const normalizeName = (value?: string) => value?.trim().toLowerCase() ?? "";

export const isSameGiftProduct = (
  item: { itemId?: string; description: string },
  line: Pick<InvoiceGiftLine, "itemId" | "name">,
): boolean => {
  if (item.itemId && line.itemId && item.itemId === line.itemId) return true;
  const itemName = normalizeName(item.description);
  const giftName = normalizeName(line.name);
  if (!itemName || !giftName) return false;
  if (itemName === giftName) return true;
  return (
    giftName.length >= 3 &&
    (itemName.includes(giftName) || giftName.includes(itemName))
  );
};

const giftQuantityForBillItem = (
  item: { itemId?: string; description: string },
  giftLines: InvoiceGiftLine[],
): number =>
  giftLines.reduce(
    (sum, line) => (isSameGiftProduct(item, line) ? sum + line.quantity : sum),
    0,
  );

/** Dòng món tặng trên hóa đơn — ưu tiên servedGifts (có streakCount để gọi API). */
export function buildInvoiceGiftLines(
  servedGifts: IServedStreakGift[] = [],
  billGift?: Pick<BillGift, "items"> | null,
): InvoiceGiftLine[] {
  const lines: InvoiceGiftLine[] = [];
  let usedBillGiftFallback = false;

  for (const served of servedGifts) {
    const useBillItems =
      !served.items?.length && !usedBillGiftFallback && !!billGift?.items?.length;
    const sourceItems = served.items?.length
      ? served.items
      : useBillItems
        ? (billGift?.items ?? [])
        : [];

    if (useBillItems) {
      usedBillGiftFallback = true;
    }

    for (const item of sourceItems) {
      if (!item.itemId) continue;
      const quantity = item.quantity ?? 1;
      if (quantity <= 0) continue;

      lines.push({
        key: `${served.streakCount}-${item.itemId}`,
        itemId: item.itemId,
        name: item.name || "Món tặng",
        category: item.category,
        quantity,
        streakCount: served.streakCount,
        remainingQuota: served.remainingQuantity ?? 0,
        canEdit: true,
      });
    }
  }

  if (lines.length === 0 && billGift?.items?.length) {
    for (const item of billGift.items) {
      const quantity = item.quantity ?? 1;
      if (quantity <= 0) continue;
      const itemId = item.itemId || "";
      const name = item.name || "Món tặng";
      lines.push({
        key: `bill-gift-${itemId || name}`,
        itemId,
        name,
        category: item.category,
        quantity,
        streakCount: 0,
        remainingQuota: 0,
        canEdit: false,
      });
    }
  }

  return lines;
}

/** Trừ SL tặng khỏi dòng bill để không gộp món mua + món tặng. */
export function toPaidBillItems<
  T extends { itemId?: string; description: string; quantity: number },
>(billItems: T[], giftLines: InvoiceGiftLine[]): T[] {
  if (!giftLines.length) return billItems;

  return billItems.flatMap((item) => {
    const giftQty = giftQuantityForBillItem(item, giftLines);
    if (giftQty <= 0) return [item];

    const price = "price" in item ? Number(item.price) : undefined;
    if (price === 0 || item.quantity <= giftQty) return [];

    return [{ ...item, quantity: item.quantity - giftQty }];
  });
}

export function getServedGiftRemainingQuota(
  servedGifts: IServedStreakGift[] = [],
): number {
  return servedGifts.reduce(
    (sum, gift) => sum + Math.max(0, gift.remainingQuantity ?? 0),
    0,
  );
}

import {
  IAvailableStreakGift,
  IPendingGiftsResponse,
  ISelectableStreakGiftItem,
  IServedStreakGift,
  IServedStreakGiftItem,
  IStreakGiftsResponse,
  IStreakRewardProgress,
} from "@/@types/Membership";

type RawStreakReward = {
  streakCount: number;
  bonusPoints?: number;
  itemCount?: number;
  usedQuantity?: number;
  remainingQuantity?: number;
  isClaimed?: boolean;
  isReached?: boolean;
  claimed?: boolean;
  isNext?: boolean;
};

type RawAvailableGift = {
  streakCount: number;
  itemCount?: number;
  usedQuantity?: number;
  remainingQuantity?: number;
  bonusPoints?: number;
};

type RawServedGift = {
  streakCount: number;
  itemCount?: number;
  usedQuantity?: number;
  remainingQuantity?: number;
  bonusPoints?: number;
  items?: IServedStreakGiftItem[];
};

type RawStreakGiftsResponse = Omit<
  IStreakGiftsResponse,
  "streakRewards" | "availableGifts" | "selectableItems" | "servedGifts"
> & {
  availableGifts?: RawAvailableGift[];
  streakRewards?: RawStreakReward[];
  selectableItems?: ISelectableStreakGiftItem[];
  servedGifts?: RawServedGift[];
};

const normalizeStreakReward = (raw: RawStreakReward): IStreakRewardProgress => ({
  streakCount: raw.streakCount,
  bonusPoints: raw.bonusPoints,
  itemCount: raw.itemCount,
  usedQuantity: raw.usedQuantity,
  remainingQuantity: raw.remainingQuantity,
  isReached: raw.isReached,
  isClaimed: raw.isClaimed ?? raw.claimed,
  claimed: raw.isClaimed ?? raw.claimed ?? false,
  isNext: raw.isNext,
});

const normalizeAvailableGift = (
  raw: RawAvailableGift,
): IAvailableStreakGift => ({
  streakCount: raw.streakCount,
  itemCount: raw.itemCount ?? 1,
  usedQuantity: raw.usedQuantity,
  remainingQuantity: raw.remainingQuantity,
  bonusPoints: raw.bonusPoints,
});

const normalizeServedGift = (raw: RawServedGift): IServedStreakGift => {
  const itemCount = raw.itemCount ?? 0;
  const items = (raw.items ?? []).map((item) => ({
    ...item,
    quantity: item.quantity ?? 1,
  }));
  const usedQuantity =
    raw.usedQuantity ??
    items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const remainingQuantity =
    raw.remainingQuantity ?? Math.max(0, itemCount - usedQuantity);

  return {
    streakCount: raw.streakCount,
    itemCount,
    usedQuantity,
    remainingQuantity,
    bonusPoints: raw.bonusPoints,
    items,
  };
};

export const normalizeStreakGiftsResponse = (
  data: RawStreakGiftsResponse | undefined,
): IPendingGiftsResponse | undefined => {
  if (!data) return undefined;

  const rawRewards = data.streakRewards ?? [];
  const streakRewards = rawRewards.map(normalizeStreakReward);
  const availableGifts = (data.availableGifts ?? []).map(normalizeAvailableGift);
  const servedGifts = (data.servedGifts ?? []).map(normalizeServedGift);
  const nextMilestone = rawRewards
    .filter((raw) => !(raw.isClaimed ?? raw.claimed) && raw.isReached === false)
    .sort((a, b) => a.streakCount - b.streakCount)[0]?.streakCount;

  return {
    ...data,
    availableGifts,
    selectableItems: data.selectableItems ?? [],
    servedGifts,
    streakRewards: streakRewards.map((reward) => ({
      ...reward,
      isNext:
        reward.isNext ??
        (!reward.claimed &&
          nextMilestone !== undefined &&
          reward.streakCount === nextMilestone),
    })),
  };
};

const FNB_CATEGORY_LABELS: Record<string, string> = {
  drink: "Đồ uống",
  drinks: "Đồ uống",
  snack: "Đồ ăn",
  snacks: "Đồ ăn",
};

export const formatFnBCategory = (category?: string) => {
  if (!category) return null;
  return FNB_CATEGORY_LABELS[category.toLowerCase()] ?? category;
};

/** Chỉ món còn tồn kho để staff chọn khi phát quà */
export const getSelectableInStockItems = (
  items: ISelectableStreakGiftItem[] = [],
) => items.filter((item) => item.quantity > 0);

export const sumSelectedItemQty = (
  selected: Record<string, number>,
): number =>
  Object.values(selected).reduce((sum, qty) => sum + (qty > 0 ? qty : 0), 0);

export const selectedItemsToPayload = (
  selected: Record<string, number>,
): { itemId: string; quantity: number }[] =>
  Object.entries(selected)
    .filter(([, quantity]) => quantity > 0)
    .map(([itemId, quantity]) => ({ itemId, quantity }));

/** Mốc đã phát trên schedule này không hiện lại ở list "chọn quà". */
export function getClaimableAvailableGifts(
  availableGifts: IAvailableStreakGift[] = [],
  servedGifts: IServedStreakGift[] = [],
  previouslyServedStreaks: Iterable<number> = [],
): IAvailableStreakGift[] {
  const blocked = new Set<number>([
    ...servedGifts.map((gift) => gift.streakCount),
    ...previouslyServedStreaks,
  ]);
  return availableGifts.filter((gift) => !blocked.has(gift.streakCount));
}

export function shouldShowGiftItemPicker({
  hasServedGift,
  remainingQuota,
  showAddPicker,
}: {
  hasServedGift: boolean;
  remainingQuota: number;
  showAddPicker: boolean;
}): boolean {
  if (!hasServedGift) return true;
  return remainingQuota > 0 && showAddPicker;
}

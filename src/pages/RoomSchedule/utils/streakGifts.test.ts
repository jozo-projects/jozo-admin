import { describe, expect, it } from "vitest";
import { IAvailableStreakGift, IServedStreakGift } from "@/@types/Membership";
import {
  getClaimableAvailableGifts,
  shouldShowGiftItemPicker,
} from "./streakGifts";

const available = (streakCount: number): IAvailableStreakGift => ({
  streakCount,
  itemCount: 2,
});

const served = (streakCount: number): IServedStreakGift => ({
  streakCount,
  itemCount: 2,
  usedQuantity: 1,
  remainingQuantity: 1,
  items: [{ itemId: "coca", name: "Coca", quantity: 1 }],
});

describe("getClaimableAvailableGifts", () => {
  it("hides streaks that are already served", () => {
    expect(
      getClaimableAvailableGifts(
        [available(3), available(5)],
        [served(3)],
      ).map((gift) => gift.streakCount),
    ).toEqual([5]);
  });

  it("keeps hiding a streak after its last item is removed", () => {
    expect(
      getClaimableAvailableGifts([available(3)], [], [3]),
    ).toEqual([]);
  });
});

describe("shouldShowGiftItemPicker", () => {
  it("shows picker when claiming a new gift", () => {
    expect(
      shouldShowGiftItemPicker({
        hasServedGift: false,
        remainingQuota: 2,
        showAddPicker: false,
      }),
    ).toBe(true);
  });

  it("hides picker after decrementing a served gift unless staff asks to add", () => {
    expect(
      shouldShowGiftItemPicker({
        hasServedGift: true,
        remainingQuota: 1,
        showAddPicker: false,
      }),
    ).toBe(false);
    expect(
      shouldShowGiftItemPicker({
        hasServedGift: true,
        remainingQuota: 1,
        showAddPicker: true,
      }),
    ).toBe(true);
  });
});

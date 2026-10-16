import { describe, expect, it } from "vitest";
import { IClaimedReward } from "@/@types/Membership";
import {
  claimedRewardKey,
  formatRunningStreak,
  historyClaimedRewards,
  rewardCycle,
  streakProgressRatio,
} from "./streakCycle";

const reward = (partial: Partial<IClaimedReward>): IClaimedReward => ({
  streakCount: 3,
  claimedAt: "2026-01-01T00:00:00.000Z",
  items: [{ itemId: "a", name: "Coca", quantity: 1 }],
  ...partial,
});

describe("streak cycle history", () => {
  it("treats a missing cycle as cycle 1 and keeps same streakCount on different bills", () => {
    const rows = [
      reward({ billId: "b1" }),
      reward({ cycle: 2, billId: "b2", streakCount: 3 }),
    ];
    expect(rows.map(rewardCycle)).toEqual([1, 2]);
    expect(new Set(rows.map(claimedRewardKey)).size).toBe(2);
    expect(historyClaimedRewards([...rows, reward({ items: [] })])).toHaveLength(2);
  });

  it("labels the running streak from count and cycle", () => {
    expect(formatRunningStreak(3, 2)).toBe("Vòng 2, lần 3");
    expect(streakProgressRatio(3, [{ count: 5, bonusPoints: 0, itemCount: 1 }])).toBe(0.6);
  });
});

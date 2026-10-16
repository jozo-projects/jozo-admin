import { IClaimedReward, IStreakReward } from "@/@types/Membership";

export const rewardCycle = (reward: Pick<IClaimedReward, "cycle">) =>
  reward.cycle && reward.cycle > 0 ? reward.cycle : 1;

export const claimedRewardKey = (reward: IClaimedReward) =>
  `${rewardCycle(reward)}-${reward.streakCount}-${reward.billId ?? reward.claimedAt}`;

/** Lịch sử: mọi bản ghi có món, không gộp theo streakCount. */
export const historyClaimedRewards = (rewards: IClaimedReward[] = []) =>
  rewards.filter((reward) => (reward.items?.length ?? 0) > 0);

export const formatRunningStreak = (count: number, cycle?: number) => {
  if (cycle && cycle > 0) return `Vòng ${cycle}, lần ${count}`;
  return `Lần ${count}`;
};

export const streakProgressRatio = (
  count: number,
  rewards: IStreakReward[] | undefined | null,
) => {
  const max = Math.max(0, ...(rewards ?? []).map((reward) => Number(reward.count) || 0));
  if (max <= 0) return 0;
  return Math.min(1, Math.max(0, count) / max);
};

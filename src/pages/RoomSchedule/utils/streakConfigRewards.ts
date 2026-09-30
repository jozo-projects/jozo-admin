import { IStreakReward } from "@/@types/Membership";

export type ResolvedStreakReward = IStreakReward & {
  /** streakCount hiện tại >= mốc config */
  isReached: boolean;
  /** Mốc gần nhất phía trên streak hiện tại */
  isNext: boolean;
};

export type ClaimableStreakRow = {
  streakCount: number;
  itemCount: number;
  bonusPoints: number;
};

export const formatStreakRewardLabel = (reward: {
  itemCount?: number;
  bonusPoints?: number;
}) => {
  const parts: string[] = [];
  if (reward.itemCount && reward.itemCount > 0) {
    parts.push(`${reward.itemCount} món`);
  }
  if (reward.bonusPoints && reward.bonusPoints > 0) {
    parts.push(`+${reward.bonusPoints} điểm`);
  }
  return parts.join(", ") || "Quà";
};

const toCount = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Đối chiếu streak hiện tại với config Membership (streak.rewards).
 */
export const resolveStreakRewardsFromConfig = (
  streakCount: number,
  rewards: IStreakReward[] | undefined | null,
): ResolvedStreakReward[] => {
  if (!rewards?.length) return [];

  const current = toCount(streakCount);
  const sorted = [...rewards]
    .map((r) => ({
      ...r,
      count: toCount(r.count),
      itemCount: toCount(r.itemCount),
      bonusPoints: toCount(r.bonusPoints),
    }))
    .filter((r) => r.count > 0)
    .sort((a, b) => a.count - b.count);

  const nextIndex = sorted.findIndex((r) => r.count > current);

  return sorted.map((reward, index) => ({
    ...reward,
    isReached: current >= reward.count,
    isNext: nextIndex === -1 ? false : index === nextIndex,
  }));
};

/**
 * Mốc staff cần báo khách nhận:
 * - Lấy từ config: đã đủ streak + chưa claim
 * - Enrich từ availableGifts API nếu có
 * Không phụ thuộc availableGifts (tránh sót mốc khi API trả []).
 */
export const getClaimableStreakRows = (options: {
  streakCount: number;
  configRewards?: IStreakReward[] | null;
  availableGifts?: Array<{
    streakCount: number;
    itemCount?: number;
    bonusPoints?: number;
  }>;
  claimedStreakCounts?: Iterable<number>;
}): ClaimableStreakRow[] => {
  const {
    streakCount,
    configRewards,
    availableGifts = [],
    claimedStreakCounts = [],
  } = options;

  const claimed = new Set(
    [...claimedStreakCounts].map(toCount).filter((n) => n > 0),
  );
  const byCount = new Map<number, ClaimableStreakRow>();

  // availableGifts từ API = còn nhận được → luôn hiện
  for (const gift of availableGifts) {
    const count = toCount(gift.streakCount);
    if (count <= 0 || claimed.has(count)) continue;
    const fromConfig = (configRewards ?? []).find(
      (r) => toCount(r.count) === count,
    );
    byCount.set(count, {
      streakCount: count,
      itemCount:
        toCount(gift.itemCount) || toCount(fromConfig?.itemCount),
      bonusPoints:
        toCount(gift.bonusPoints) || toCount(fromConfig?.bonusPoints),
    });
  }

  // Config: đã đủ streak, chưa claim, chưa có trong availableGifts
  for (const reward of resolveStreakRewardsFromConfig(
    streakCount,
    configRewards,
  )) {
    if (!reward.isReached || claimed.has(reward.count)) continue;
    if (byCount.has(reward.count)) continue;
    if (reward.itemCount <= 0 && reward.bonusPoints <= 0) continue;
    byCount.set(reward.count, {
      streakCount: reward.count,
      itemCount: reward.itemCount,
      bonusPoints: reward.bonusPoints,
    });
  }

  return [...byCount.values()].sort((a, b) => a.streakCount - b.streakCount);
};

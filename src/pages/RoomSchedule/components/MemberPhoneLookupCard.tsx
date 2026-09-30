import {
  IAvailableStreakGift,
  IStreakReward,
  IStreakRewardProgress,
} from "@/@types/Membership";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import React, { useMemo } from "react";
import {
  getMemberDisplayName,
  isValidMemberPhone,
} from "../utils/memberPhone";
import {
  formatStreakRewardLabel,
  getClaimableStreakRows,
  resolveStreakRewardsFromConfig,
} from "../utils/streakConfigRewards";

export interface MemberLookupUser {
  full_name?: string | null;
  name?: string | null;
  username?: string | null;
  email?: string | null;
  phone_number: string;
  tier?: string;
  availablePoint?: number;
  streakCount?: number;
}

interface MemberPhoneLookupCardProps {
  phone: string;
  isLoading?: boolean;
  isError?: boolean;
  isNotFound?: boolean;
  memberInfo?: MemberLookupUser | null;
  availableGifts?: IAvailableStreakGift[];
  streakRewards?: IStreakRewardProgress[];
  configStreakRewards?: IStreakReward[];
  className?: string;
}

/** Chỉ hiện quà còn nhận được khi nhập SĐT (modal tạo schedule). */
const MemberPhoneLookupCard: React.FC<MemberPhoneLookupCardProps> = ({
  phone,
  isLoading = false,
  isError = false,
  isNotFound = false,
  memberInfo,
  availableGifts = [],
  streakRewards = [],
  configStreakRewards = [],
  className,
}) => {
  const streakCount = Number(memberInfo?.streakCount ?? 0) || 0;

  const claimedCounts = useMemo(() => {
    const set = new Set<number>();
    for (const reward of streakRewards) {
      if (reward.claimed === true || reward.isClaimed === true) {
        set.add(Number(reward.streakCount));
      }
    }
    return set;
  }, [streakRewards]);

  const claimableRows = useMemo(
    () =>
      getClaimableStreakRows({
        streakCount,
        configRewards: configStreakRewards,
        availableGifts,
        claimedStreakCounts: claimedCounts,
      }),
    [streakCount, configStreakRewards, availableGifts, claimedCounts],
  );

  const nextReward = useMemo(() => {
    if (claimableRows.length > 0) return undefined;
    return resolveStreakRewardsFromConfig(
      streakCount,
      configStreakRewards,
    ).find((r) => r.isNext);
  }, [claimableRows.length, streakCount, configStreakRewards]);

  if (!isValidMemberPhone(phone)) return null;

  if (isLoading) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-muted-foreground",
          className,
        )}
      >
        <Loader2 className="size-4 animate-spin" />
        Đang tìm...
      </div>
    );
  }

  if (isError || isNotFound || !memberInfo) {
    return (
      <div
        className={cn(
          "rounded-md border px-3 py-2 text-sm text-muted-foreground",
          className,
        )}
      >
        Không tìm thấy member
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2 rounded-md border px-3 py-2.5", className)}>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">
          {getMemberDisplayName(memberInfo)}
          {memberInfo.tier ? (
            <span className="ml-1.5 font-normal text-muted-foreground">
              · {memberInfo.tier}
            </span>
          ) : null}
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Streak {streakCount}
          <span className="mx-1.5 text-border">·</span>
          {(memberInfo.availablePoint ?? 0).toLocaleString()} điểm
        </p>
      </div>

      {claimableRows.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-sm text-muted-foreground">Quà chưa nhận</p>
          {claimableRows.map((row) => (
            <div
              key={row.streakCount}
              className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-2.5 py-1.5 text-sm"
            >
              <span>Streak {row.streakCount}</span>
              <span className="font-medium">
                {formatStreakRewardLabel(row)}
              </span>
            </div>
          ))}
        </div>
      ) : nextReward ? (
        <p className="text-sm text-muted-foreground">
          Còn streak {nextReward.count} ({formatStreakRewardLabel(nextReward)})
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">Không còn quà</p>
      )}
    </div>
  );
};

export default MemberPhoneLookupCard;

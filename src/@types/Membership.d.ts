// Membership configuration types
import type { User } from "./user";

type ObjectId = string;

export interface ITierDiscount {
  discountPercentage?: number;
  discountAmount?: number;
  note?: string;
}

export type ITierBenefit = ITierDiscount;

export interface IMembershipConfig {
  _id?: ObjectId;
  currencyUnit: number;
  pointPerCurrency: number;
  tierThresholds: Record<string, number>;
  bonusRules?: IBonusRules;
  streak?: IStreakConfig;
  tierBenefits?: Record<string, ITierBenefit[]>;
  dailySelfClaimLimitPerPhone?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IBonusRules {
  bookingEarlyBonus?: number; // +points khi đặt trước
  offPeakBonus?: number; // +points khi đi giờ thấp điểm
  groupSizeBonus?: {
    sizeGte: number;
    points: number;
  };
  birthdayMultiplier?: number; // nhân điểm khi sinh nhật
}

export interface IStreakConfig {
  windowDays: number;
  rewards: IStreakReward[];
}

export interface IStreakReward {
  count: number;
  bonusPoints: number;
  /** Số món staff phải chọn khi phát quà */
  itemCount: number;
}

export type MembershipConfigResponse = HTTPResponse<IMembershipConfig>;

export type MembershipConfigPayload = Omit<
  IMembershipConfig,
  "_id" | "createdAt" | "updatedAt"
> & { _id?: string };

export interface IUserMembershipUser extends User {
  points?: number;
  availablePoint?: number;
  totalPoint?: number;
  lifetimePoint?: number;
  loyalty_points?: number;
  loyalty?: number;
  streak?: number;
  current_streak?: number;
  tier?: string;
}

export interface IUserMembershipProgressTier {
  tier: string;
  required?: number;
  points?: number;
}

export interface IUserMembershipProgress {
  currentTier?: IUserMembershipProgressTier | string | null;
  nextTier?: IUserMembershipProgressTier | null;
}

export interface IUserMembershipDetail {
  user: IUserMembershipUser;
  config?: IMembershipConfig;
  progress?: IUserMembershipProgress;
}

export type UserMembershipDetailResponse = HTTPResponse<IUserMembershipDetail>;

export type GrantUserPointsPayload = {
  points: number;
  reason?: string;
};

export type UpdateStreakPayload = {
  count?: number;
  reset?: boolean;
};

export interface IPendingGiftsUserProgress {
  currentTier: string;
  nextTier?: {
    tier: string;
    required: number;
  };
}

export interface IPendingGiftsUser {
  userId: string;
  full_name?: string | null;
  name?: string | null;
  username?: string | null;
  email?: string | null;
  phone_number: string;
  date_of_birth?: string | null;
  avatar?: string | null;
  tier: string;
  availablePoint: number;
  lifetimePoint?: number;
  totalPoint?: number;
  streakCount: number;
  progress?: IPendingGiftsUserProgress;
  /** Ưu đãi hạng — BE có thể trả kèm khi lookup theo phone */
  tierDiscount?: ITierDiscount[];
}

/** Món FNB staff có thể chọn khi phát quà streak */
export interface ISelectableStreakGiftItem {
  itemId: string;
  name: string;
  category: string;
  quantity: number;
  price: number;
  image?: string;
  parentId?: string | null;
}

/** Quà streak sẵn sàng phát — GET /pending-gifts */
export interface IAvailableStreakGift {
  streakCount: number;
  itemCount: number;
  bonusPoints?: number;
  usedQuantity?: number;
  remainingQuantity?: number;
}

/** Tiến độ mốc streak — GET /pending-gifts */
export interface IStreakRewardProgress {
  streakCount: number;
  bonusPoints?: number;
  itemCount?: number;
  usedQuantity?: number;
  remainingQuantity?: number;
  isReached?: boolean;
  isClaimed?: boolean;
  /** Normalized từ isClaimed */
  claimed: boolean;
  isNext?: boolean;
}

export interface IServedStreakGiftItem {
  itemId: string;
  name?: string;
  category?: string;
  quantity: number;
  image?: string;
  price?: number;
}

/** Quà đã phát trên schedule — GET /pending-gifts?scheduleId= */
export interface IServedStreakGift {
  streakCount: number;
  itemCount: number;
  usedQuantity: number;
  remainingQuantity: number;
  bonusPoints?: number;
  items: IServedStreakGiftItem[];
}

/** Response từ GET /membership/pending-gifts (và alias streak-gifts nếu còn) */
export interface IPendingGiftsResponse {
  user: IPendingGiftsUser;
  streakRewards: IStreakRewardProgress[];
  availableGifts: IAvailableStreakGift[];
  selectableItems: ISelectableStreakGiftItem[];
  servedGifts?: IServedStreakGift[];
  /** Fallback nếu BE trả discount ở root thay vì trong user */
  tierDiscount?: ITierDiscount[];
}

export type IStreakGiftsResponse = IPendingGiftsResponse;

export interface IClaimGiftItem {
  itemId: string;
  quantity?: number;
}

/** Payload cho POST /membership/claim-gift (alias serve-streak-gift) */
export interface IClaimGiftPayload {
  phone?: string;
  userId?: string;
  userIdOrPhone?: string;
  streakCount: number;
  scheduleId: string;
  /** Optional / [] — claim soft, có thể bổ sung món sau */
  items?: IClaimGiftItem[];
}

export type IServeStreakGiftPayload = IClaimGiftPayload;

export interface IStreakGiftQuotaResult {
  items: IServedStreakGiftItem[];
  itemCount: number;
  usedQuantity: number;
  remainingQuantity: number;
  bonusPointsAwarded?: number;
  user?: {
    userId: string;
    totalPoint?: number;
    availablePoint?: number;
    lifetimePoint?: number;
    tier?: string;
  };
  reward?: unknown;
}

export type IClaimGiftResult = IStreakGiftQuotaResult;

export interface IAddStreakGiftItemsPayload {
  scheduleId: string;
  streakCount: number;
  phone?: string;
  userId?: string;
  items: IClaimGiftItem[];
}

export interface IUpdateStreakGiftItemPayload {
  scheduleId: string;
  streakCount: number;
  itemId: string;
  /** 0 = xoá */
  quantity: number;
  phone?: string;
}

export interface IRemoveStreakGiftItemPayload {
  scheduleId: string;
  streakCount: number;
  itemId: string;
  phone?: string;
}

export interface IStreakGiftItemsResult {
  selectableItems: ISelectableStreakGiftItem[];
}

// Streak Info Response - GET /membership/members/:userId/streak
export interface IUserStreak {
  _id: string;
  userId: string;
  count: number;
  lastVisitAt: string;
  expiredAt: string;
  windowDays: number;
  createdAt: string;
  updatedAt: string;
  isExpired: boolean;
  isActive: boolean;
}

export interface IClaimedRewardGift {
  giftId?: string;
  giftName?: string;
  giftType?: string;
  items?: IServedStreakGiftItem[];
}

export interface IClaimedReward {
  streakCount: number;
  points?: number;
  bonusPoints?: number;
  itemCount?: number;
  gift?: IClaimedRewardGift;
  items?: IServedStreakGiftItem[];
  claimedAt: string;
}

export interface IUserStreakInfo {
  streak: IUserStreak;
  claimedRewards: IClaimedReward[];
}

export type UserStreakInfoResponse = HTTPResponse<IUserStreakInfo>;

/** Response từ GET /membership/lookup?phone=... */
export interface IMembershipLookup {
  userId?: string;
  full_name?: string | null;
  name?: string | null;
  username?: string | null;
  email?: string | null;
  phone_number: string;
  date_of_birth?: string | null;
  avatar?: string | null;
  tier?: string;
  availablePoint?: number;
  lifetimePoint?: number;
  totalPoint?: number;
  streakCount?: number;
  tierDiscount?: ITierDiscount[];
  progress?: IPendingGiftsUserProgress;
}

export type MembershipLookupResponse = HTTPResponse<IMembershipLookup>;

/** Response từ GET /membership/me — dùng cho checkout/bill ở phase sau */
export interface IMembershipMe {
  tier?: string;
  points?: number;
  tierDiscount?: ITierDiscount[];
}

export type MembershipMeResponse = HTTPResponse<IMembershipMe>;

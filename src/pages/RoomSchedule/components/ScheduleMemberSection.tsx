import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  IAvailableStreakGift,
  IClaimGiftItem,
  ISelectableStreakGiftItem,
  IServedStreakGift,
  IStreakRewardProgress,
} from "@/@types/Membership";
import {
  Loader2,
  Minus,
  Plus,
  Search,
  X,
} from "lucide-react";
import React, { memo, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  getMemberDisplayName,
  isValidMemberPhone,
} from "../utils/memberPhone";
import {
  formatFnBCategory,
  getClaimableAvailableGifts,
  getSelectableInStockItems,
  selectedItemsToPayload,
  shouldShowGiftItemPicker,
  sumSelectedItemQty,
} from "../utils/streakGifts";
import MemberPhoneCombobox from "./MemberPhoneCombobox";

export interface ScheduleGiftDetail {
  name?: string;
  status?: string;
  type?: string;
  discountPercentage?: number;
  items?: Array<{
    name?: string;
    quantity?: number;
    itemId?: string;
    category?: string;
  }>;
}

export interface ScheduleMemberInfo {
  full_name?: string | null;
  name?: string | null;
  username?: string | null;
  email?: string | null;
  phone_number: string;
  date_of_birth?: string | null;
  tier?: string;
  availablePoint?: number;
  streakCount?: number;
}

interface ScheduleMemberSectionProps {
  phone: string;
  savedPhone?: string;
  onPhoneChange: (phone: string) => void;
  isPhoneDirty?: boolean;
  hasSavedValidPhone?: boolean;
  isSavingPhone?: boolean;
  onSavePhone?: () => void;
  onClearPhone?: () => void;
  isGiftEnabled?: boolean;
  onGiftEnabledChange?: (enabled: boolean) => void;
  isUpdatingGiftEnabled?: boolean;
  showGiftToggle?: boolean;
  hasClaimedGift?: boolean;
  giftDetail?: ScheduleGiftDetail | null;
  customerName?: string;
  customerEmail?: string;
  memberInfo?: ScheduleMemberInfo | null;
  isLoadingMemberInfo?: boolean;
  isMemberInfoError?: boolean;
  isMemberNotFound?: boolean;
  availableGifts?: IAvailableStreakGift[];
  streakRewards?: IStreakRewardProgress[];
  selectableItems?: ISelectableStreakGiftItem[];
  servedGifts?: IServedStreakGift[];
  /** Claim soft — items có thể [] / partial */
  onClaimGift?: (
    streakCount: number,
    items?: IClaimGiftItem[],
  ) => void | Promise<void>;
  /** Alias cũ của onClaimGift */
  onServeGift?: (
    streakCount: number,
    items: IClaimGiftItem[],
  ) => void | Promise<void>;
  onAddGiftItems?: (
    streakCount: number,
    items: IClaimGiftItem[],
  ) => void | Promise<void>;
  onUpdateGiftItemQty?: (
    streakCount: number,
    itemId: string,
    quantity: number,
  ) => void | Promise<void>;
  onRemoveGiftItem?: (
    streakCount: number,
    itemId: string,
  ) => void | Promise<void>;
  isServingGift?: boolean;
  /** Mở sẵn danh sách chọn món tặng (vd. từ nút Thêm món tặng trên hóa đơn) */
  expandGiftPicker?: boolean;
  className?: string;
  inputId?: string;
}

const getGiftStatusLabel = (
  hasClaimedGift: boolean,
  isGiftEnabled: boolean,
) => {
  if (hasClaimedGift) return "Đã nhận quà";
  if (isGiftEnabled) return "Được phép nhận quà";
  return "Chưa bật quà tặng";
};

const formatDateOfBirth = (date?: string | null) => {
  if (!date) return null;
  const parsed = dayjs(date);
  return parsed.isValid() ? parsed.format("DD/MM/YYYY") : null;
};

const getRewardLabel = (reward: IStreakRewardProgress) => {
  const parts: string[] = [];
  if (reward.itemCount && reward.itemCount > 0) {
    parts.push(`${reward.itemCount} món`);
  }
  if (reward.bonusPoints) {
    parts.push(`+${reward.bonusPoints} điểm`);
  }
  return parts.length > 0
    ? parts.join(", ")
    : `Streak ${reward.streakCount}`;
};

const formatAvailableGiftLabel = (gift: IAvailableStreakGift) => {
  const parts = [`${gift.itemCount} món`];
  if (gift.bonusPoints) parts.push(`+${gift.bonusPoints} điểm`);
  return parts.join(", ");
};

const ScheduleMemberSection: React.FC<ScheduleMemberSectionProps> = ({
  phone,
  savedPhone = "",
  onPhoneChange,
  isPhoneDirty = false,
  hasSavedValidPhone = false,
  isSavingPhone = false,
  onSavePhone,
  onClearPhone,
  isGiftEnabled = false,
  onGiftEnabledChange,
  isUpdatingGiftEnabled = false,
  showGiftToggle = true,
  hasClaimedGift = false,
  giftDetail,
  customerName,
  customerEmail,
  memberInfo,
  isLoadingMemberInfo = false,
  isMemberInfoError = false,
  isMemberNotFound = false,
  availableGifts = [],
  streakRewards = [],
  selectableItems = [],
  servedGifts = [],
  onClaimGift,
  onServeGift,
  onAddGiftItems,
  onUpdateGiftItemQty,
  onRemoveGiftItem,
  isServingGift = false,
  expandGiftPicker = false,
  className,
  inputId = "schedule-member-phone",
}) => {
  const claimGift = onClaimGift ?? onServeGift;
  const [selectedStreakCount, setSelectedStreakCount] = useState<number | null>(
    null,
  );
  const [selectedItemQty, setSelectedItemQty] = useState<
    Record<string, number>
  >({});
  const [itemSearch, setItemSearch] = useState("");
  const [isNameSearchActive, setIsNameSearchActive] = useState(false);
  const [showAddGiftPicker, setShowAddGiftPicker] = useState(false);
  const [servedStreakHistory, setServedStreakHistory] = useState<number[]>([]);

  const servedGiftForSelected = useMemo(
    () =>
      servedGifts.find((gift) => gift.streakCount === selectedStreakCount) ??
      null,
    [servedGifts, selectedStreakCount],
  );

  const claimableAvailableGifts = useMemo(
    () =>
      getClaimableAvailableGifts(
        availableGifts,
        servedGifts,
        servedStreakHistory,
      ),
    [availableGifts, servedGifts, servedStreakHistory],
  );

  useEffect(() => {
    setServedStreakHistory([]);
    setShowAddGiftPicker(false);
  }, [phone]);

  useEffect(() => {
    if (servedGifts.length === 0) return;
    setServedStreakHistory((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const gift of servedGifts) {
        if (!next.has(gift.streakCount)) {
          next.add(gift.streakCount);
          changed = true;
        }
      }
      return changed ? Array.from(next) : prev;
    });
  }, [servedGifts]);

  const nextStreakReward = useMemo(() => {
    const currentStreak = Number(memberInfo?.streakCount ?? 0) || 0;
    const blockedStreaks = new Set([
      ...servedGifts.map((gift) => gift.streakCount),
      ...servedStreakHistory,
    ]);

    return [...streakRewards]
      .filter((reward) => !reward.claimed && reward.isClaimed !== true)
      .filter((reward) => !blockedStreaks.has(reward.streakCount))
      .sort((a, b) => a.streakCount - b.streakCount)
      .map((reward) => ({
        reward,
        isReached:
          reward.isReached === true || currentStreak >= reward.streakCount,
      }))[0];
  }, [memberInfo?.streakCount, servedGifts, servedStreakHistory, streakRewards]);

  // Bỏ chọn mốc đã claim mà không còn served trên schedule này
  useEffect(() => {
    if (selectedStreakCount === null) return;
    const reward = streakRewards.find(
      (r) => r.streakCount === selectedStreakCount,
    );
    if (!reward) return;
    const isClaimed = reward.claimed || reward.isClaimed === true;
    const served = servedGifts.some(
      (g) => g.streakCount === selectedStreakCount,
    );
    if (isClaimed && !served) {
      setSelectedStreakCount(null);
      setSelectedItemQty({});
      setItemSearch("");
    }
  }, [selectedStreakCount, streakRewards, servedGifts]);

  const selectedMilestone = useMemo((): IAvailableStreakGift | null => {
    if (selectedStreakCount === null) return null;
    if (servedGiftForSelected) {
      return {
        streakCount: servedGiftForSelected.streakCount,
        itemCount: servedGiftForSelected.itemCount,
        usedQuantity: servedGiftForSelected.usedQuantity,
        remainingQuantity: servedGiftForSelected.remainingQuantity,
        bonusPoints: servedGiftForSelected.bonusPoints,
      };
    }
    const fromAvailable = availableGifts.find(
      (gift) => gift.streakCount === selectedStreakCount,
    );
    if (fromAvailable) return fromAvailable;

    const fromReward = streakRewards.find(
      (reward) => reward.streakCount === selectedStreakCount,
    );
    if (!fromReward) return null;

    return {
      streakCount: fromReward.streakCount,
      itemCount: fromReward.itemCount ?? 0,
      usedQuantity: fromReward.usedQuantity,
      remainingQuantity: fromReward.remainingQuantity,
      bonusPoints: fromReward.bonusPoints,
    };
  }, [
    availableGifts,
    selectedStreakCount,
    servedGiftForSelected,
    streakRewards,
  ]);

  const quotaMax = selectedMilestone?.itemCount ?? 0;
  const remainingQuota = servedGiftForSelected
    ? Math.max(0, servedGiftForSelected.remainingQuantity ?? 0)
    : Math.max(0, quotaMax - sumSelectedItemQty(selectedItemQty));
  const showGiftItemPicker = shouldShowGiftItemPicker({
    hasServedGift: Boolean(servedGiftForSelected),
    remainingQuota,
    showAddPicker: showAddGiftPicker,
  });
  const inStockItems = useMemo(
    () => getSelectableInStockItems(selectableItems),
    [selectableItems],
  );
  const filteredInStockItems = useMemo(() => {
    const keyword = itemSearch.trim().toLowerCase();
    if (!keyword) return inStockItems;
    return inStockItems.filter((item) => {
      const name = item.name?.toLowerCase() ?? "";
      const category = item.category?.toLowerCase() ?? "";
      const categoryLabel =
        formatFnBCategory(item.category)?.toLowerCase() ?? "";
      return (
        name.includes(keyword) ||
        category.includes(keyword) ||
        categoryLabel.includes(keyword)
      );
    });
  }, [inStockItems, itemSearch]);
  useEffect(() => {
    if (remainingQuota <= 0) {
      setShowAddGiftPicker(false);
    }
  }, [remainingQuota]);

  useEffect(() => {
    if (!expandGiftPicker) return;
    const target = servedGifts.find((gift) => (gift.remainingQuantity ?? 0) > 0);
    if (!target) return;
    setSelectedStreakCount(target.streakCount);
    setShowAddGiftPicker(true);
  }, [expandGiftPicker, servedGifts]);
  const selectedQtyTotal = sumSelectedItemQty(selectedItemQty);
  // Claim soft: không bắt buộc chọn đủ quota
  const canClaimGift = selectedMilestone !== null && !servedGiftForSelected;

  const isPhoneValid = isValidMemberPhone(phone);
  const showPhoneError = phone.length > 0 && !isPhoneValid;
  const canClearPhone =
    Boolean(onClearPhone) &&
    (phone.trim().length > 0 || savedPhone.trim().length > 0);
  /** Hiện card member/quà khi SĐT hợp lệ và không đang tìm theo tên. */
  const showMemberLookup =
    !isNameSearchActive &&
    isPhoneValid &&
    (isLoadingMemberInfo ||
      memberInfo ||
      isMemberInfoError ||
      isMemberNotFound);
  const showScheduleCustomer =
    (customerName || customerEmail) &&
    !memberInfo &&
    !isLoadingMemberInfo &&
    !isNameSearchActive;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && isPhoneDirty && isPhoneValid && onSavePhone) {
      e.preventDefault();
      onSavePhone();
    }
  };

  const phoneHelperText = showPhoneError ? null : isPhoneValid &&
    isLoadingMemberInfo ? (
    "Đang tìm..."
  ) : hasSavedValidPhone && !isPhoneDirty ? (
    `Đã lưu: ${savedPhone}`
  ) : (
    "Nhập SĐT hoặc tên để tìm member và xem quà"
  );

  const handleSelectMilestone = (streakCount: number) => {
    setSelectedStreakCount((prev) => {
      if (prev === streakCount) {
        setSelectedItemQty({});
        setItemSearch("");
        setShowAddGiftPicker(false);
        return null;
      }
      setSelectedItemQty({});
      setItemSearch("");
      setShowAddGiftPicker(false);
      return streakCount;
    });
  };

  const adjustDraftItemQty = (
    item: ISelectableStreakGiftItem,
    delta: number,
  ) => {
    setSelectedItemQty((prev) => {
      const current = prev[item.itemId] ?? 0;
      const nextQty = current + delta;
      if (nextQty <= 0) {
        const next = { ...prev };
        delete next[item.itemId];
        return next;
      }
      const otherTotal = sumSelectedItemQty(prev) - current;
      if (quotaMax > 0 && otherTotal + nextQty > quotaMax) return prev;
      if (nextQty > item.quantity) return prev;
      return { ...prev, [item.itemId]: nextQty };
    });
  };

  const handleClaimGift = () => {
    if (!canClaimGift || selectedStreakCount === null || !claimGift) return;
    void claimGift(
      selectedStreakCount,
      selectedItemsToPayload(selectedItemQty),
    );
    setSelectedItemQty({});
  };

  const handleAddOneItem = (itemId: string) => {
    if (!selectedStreakCount || !onAddGiftItems) return;
    if (remainingQuota <= 0) return;
    void onAddGiftItems(selectedStreakCount, [{ itemId, quantity: 1 }]);
  };

  const handleChangeServedQty = (itemId: string, nextQty: number) => {
    if (!selectedStreakCount) return;
    if (nextQty <= 0) {
      if (onRemoveGiftItem) {
        void onRemoveGiftItem(selectedStreakCount, itemId);
      } else if (onUpdateGiftItemQty) {
        void onUpdateGiftItemQty(selectedStreakCount, itemId, 0);
      }
      return;
    }
    onUpdateGiftItemQty?.(selectedStreakCount, itemId, nextQty);
  };

  return (
    <section className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium">
          {showGiftToggle ? "Thành viên & quà tặng" : "Thành viên"}
        </h3>
        {showGiftToggle && (
          <Badge variant="secondary" className="shrink-0 font-normal">
            {getGiftStatusLabel(hasClaimedGift, isGiftEnabled)}
          </Badge>
        )}
        {!showGiftToggle && hasClaimedGift && (
          <Badge variant="secondary" className="shrink-0 font-normal">
            Đã nhận quà
          </Badge>
        )}
      </div>

      <MemberPhoneCombobox
        id={inputId}
        phone={phone}
        onPhoneChange={onPhoneChange}
        disabled={isSavingPhone}
        canClear={canClearPhone}
        onClear={onClearPhone}
        onKeyDown={handleKeyDown}
        onNameSearchActiveChange={setIsNameSearchActive}
        label={undefined}
        errorText={
          showPhoneError
            ? "SĐT không hợp lệ (10–11 số, bắt đầu bằng 0)"
            : undefined
        }
        helperText={phoneHelperText}
        trailing={
          isPhoneDirty && onSavePhone ? (
            <Button
              type="button"
              variant="secondary"
              onClick={onSavePhone}
              disabled={!isPhoneValid || isSavingPhone}
              className="h-9 shrink-0 sm:min-w-[88px]"
            >
              {isSavingPhone ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                "Lưu"
              )}
            </Button>
          ) : null
        }
      />

      {showMemberLookup && isLoadingMemberInfo && (
        <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          Đang tìm member...
        </div>
      )}

      {showMemberLookup && !isLoadingMemberInfo && memberInfo && (
        <div className="flex flex-col gap-2 rounded-md border px-3 py-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {getMemberDisplayName(memberInfo)}
              </p>
              {memberInfo.name && memberInfo.username && (
                <p className="truncate text-sm text-muted-foreground">
                  @{memberInfo.username}
                </p>
              )}
            </div>
            {memberInfo.tier && (
              <Badge variant="secondary" className="shrink-0 font-normal">
                {memberInfo.tier}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-[4.5rem_1fr] gap-x-3 gap-y-1 text-sm">
            <span className="text-muted-foreground">Tên</span>
            <span className="min-w-0 truncate font-medium">
              {memberInfo.full_name?.trim() || memberInfo.name?.trim() || "—"}
            </span>
            <span className="text-muted-foreground">SĐT</span>
            <span className="font-medium">{memberInfo.phone_number}</span>
            <span className="text-muted-foreground">Email</span>
            <span className="min-w-0 truncate font-medium">
              {memberInfo.email?.trim() || "—"}
            </span>
            <span className="text-muted-foreground">Ngày sinh</span>
            <span className="font-medium">
              {formatDateOfBirth(memberInfo.date_of_birth) || "—"}
            </span>
            <span className="text-muted-foreground">Điểm</span>
            <span className="font-medium">
              {(memberInfo.availablePoint ?? 0).toLocaleString()}
            </span>
            <span className="text-muted-foreground">Streak</span>
            <span className="font-medium">{memberInfo.streakCount ?? 0}</span>
          </div>
        </div>
      )}

      {showMemberLookup &&
        !isLoadingMemberInfo &&
        !memberInfo &&
        (isMemberInfoError || isMemberNotFound) && (
          <div className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
            Không tìm thấy tài khoản thành viên với SĐT này.
          </div>
        )}

      {showScheduleCustomer && (
        <div className="rounded-md border px-3 py-2 text-sm">
          {customerName && (
            <p className="font-medium">{customerName}</p>
          )}
          {customerEmail && (
            <p className="text-muted-foreground">{customerEmail}</p>
          )}
        </div>
      )}

      {showGiftToggle && onGiftEnabledChange && (
        <div className="flex h-9 items-center justify-between gap-3 rounded-md border px-3">
          <p className="text-sm font-medium">Cho phép nhận quà</p>
          <Switch
            checked={isGiftEnabled}
            onCheckedChange={(checked) => onGiftEnabledChange(checked === true)}
            disabled={isUpdatingGiftEnabled}
          />
        </div>
      )}

      {giftDetail && (
        <div className="flex flex-col gap-1 rounded-md border px-3 py-2.5 text-sm">
          <p className="font-medium">
            Quà đã gán: {giftDetail.name || "Quà tặng"}
          </p>
          {giftDetail.status && (
            <p className="text-muted-foreground">
              Trạng thái: {giftDetail.status}
            </p>
          )}
          {giftDetail.type === "discount" && giftDetail.discountPercentage && (
            <p className="font-medium">
              Giảm {giftDetail.discountPercentage}%
            </p>
          )}
          {giftDetail.type === "snacks_drinks" &&
            giftDetail.items &&
            giftDetail.items.length > 0 && (
              <ul className="list-disc space-y-0.5 pl-4 text-muted-foreground">
                {giftDetail.items.map((item, index) => (
                  <li key={item.itemId || index}>
                    {item.name || "Món"}
                    {item.quantity !== undefined && ` ×${item.quantity}`}
                  </li>
                ))}
              </ul>
            )}
        </div>
      )}

      {showMemberLookup && !isLoadingMemberInfo && memberInfo && (
        <>
          {servedGifts.length > 0 && (
            <div className="flex flex-col gap-2 rounded-md border px-3 py-2.5">
              <p className="text-sm font-medium">
                Quà đã phát ({servedGifts.length})
              </p>
              <div className="space-y-2">
                {servedGifts.map((gift) => {
                  const isSelected = selectedStreakCount === gift.streakCount;
                  return (
                    <button
                      key={gift.streakCount}
                      type="button"
                      onClick={() => handleSelectMilestone(gift.streakCount)}
                      disabled={isServingGift}
                      className={cn(
                        "w-full text-left rounded-md border px-2.5 py-2.5 transition-colors",
                        isSelected
                          ? "border-emerald-400 bg-emerald-50 ring-1 ring-emerald-300"
                          : "border-emerald-200 bg-white hover:bg-emerald-50/70",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900">
                            Streak {gift.streakCount}
                          </p>
                          <p className="text-xs text-gray-600">
                            {gift.usedQuantity}/{gift.itemCount} món
                          </p>
                        </div>
                        {isSelected && (
                          <Badge
                            variant="outline"
                            className="shrink-0 border-emerald-300 bg-emerald-50 text-emerald-700"
                          >
                            Đang xem
                          </Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {claimableAvailableGifts.length > 0 && (
            <div className="flex flex-col gap-2 rounded-md border px-3 py-2.5">
              <p className="text-sm font-medium">
                Quà ({claimableAvailableGifts.length})
              </p>
              <div className="space-y-2">
                {claimableAvailableGifts.map((gift) => {
                  const isSelected = selectedStreakCount === gift.streakCount;
                  return (
                    <button
                      key={gift.streakCount}
                      type="button"
                      onClick={() => handleSelectMilestone(gift.streakCount)}
                      disabled={isServingGift}
                      className={cn(
                        "w-full text-left rounded-md border px-2.5 py-2.5 transition-colors",
                        isSelected
                          ? "border-pink-400 bg-pink-100 ring-1 ring-pink-300"
                          : "border-pink-200 bg-white hover:bg-pink-50",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900">
                            Streak {gift.streakCount}
                          </p>
                          <p className="text-xs text-gray-600">
                            {formatAvailableGiftLabel(gift)}
                          </p>
                        </div>
                        {isSelected && (
                          <Badge
                            variant="outline"
                            className="shrink-0 border-pink-300 text-pink-700 bg-pink-50"
                          >
                            Đang chọn
                          </Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {nextStreakReward && (
            <div className="flex flex-col gap-2 rounded-md border px-3 py-2.5">
              <p className="text-sm font-medium">Mốc streak tiếp theo</p>
              <div className="space-y-2">
                {(() => {
                  const { reward, isReached } = nextStreakReward;
                  const served = servedGifts.find(
                    (gift) => gift.streakCount === reward.streakCount,
                  );
                  const isDisabled = isServingGift || !isReached;
                  const isSelected =
                    selectedStreakCount === reward.streakCount && !isDisabled;

                  return (
                    <button
                      key={reward.streakCount}
                      type="button"
                      onClick={() => handleSelectMilestone(reward.streakCount)}
                      disabled={isDisabled}
                      className={cn(
                        "w-full text-left rounded-md border px-2.5 py-2 text-sm transition-colors",
                        isDisabled && "cursor-not-allowed opacity-60",
                        isSelected
                          ? "border-pink-400 bg-pink-100 ring-1 ring-pink-300 text-pink-950"
                          : served
                            ? "border-emerald-200 bg-emerald-50/80 text-emerald-950"
                            : "border-pink-200 bg-pink-50/80 text-pink-950",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold",
                            isReached
                              ? "bg-pink-200 text-pink-800"
                              : "bg-gray-200 text-gray-600",
                          )}
                        >
                          {reward.streakCount}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {getRewardLabel(reward)}
                          </p>
                          <p className="text-xs opacity-80">
                            Streak {reward.streakCount}
                            {isReached
                              ? " • Đủ streak, có thể nhận"
                              : ` • Còn ${reward.streakCount - (Number(memberInfo?.streakCount ?? 0) || 0)} streak`}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "shrink-0",
                            isReached
                              ? "border-pink-300 text-pink-700 bg-white"
                              : "border-gray-300 text-gray-500 bg-white",
                          )}
                        >
                          {isReached ? "Nhận" : "Chưa đủ"}
                        </Badge>
                      </div>
                    </button>
                  );
                })()}
              </div>
            </div>
          )}

          {selectedMilestone && (
            <div className="rounded-md border border-pink-200 bg-white px-2.5 py-2.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {servedGiftForSelected
                    ? `Quà đã phát — streak ${selectedMilestone.streakCount}`
                    : `Nhận quà — streak ${selectedMilestone.streakCount}`}
                </p>
                <p className="text-xs font-semibold text-pink-700">
                  {servedGiftForSelected
                    ? `${servedGiftForSelected.usedQuantity}/${servedGiftForSelected.itemCount}`
                    : quotaMax > 0
                      ? `${selectedQtyTotal}/${quotaMax} món`
                      : null}
                </p>
              </div>

              {servedGiftForSelected && (
                <ul className="space-y-1.5">
                  {servedGiftForSelected.items.length === 0 ? (
                    <li className="text-xs text-gray-500">
                      {remainingQuota > 0
                        ? "Chưa có món tặng trên suất này."
                        : "Không còn suất quà."}
                    </li>
                  ) : (
                    servedGiftForSelected.items.map((item) => {
                      const categoryLabel = formatFnBCategory(item.category);
                      const canIncrease = remainingQuota > 0;
                      return (
                        <li
                          key={item.itemId}
                          className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50/60 px-2 py-1.5"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-gray-900 truncate">
                              {item.name || "Món"}
                            </p>
                            <p className="text-[11px] text-gray-500">
                              {categoryLabel ?? item.category ?? "—"}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              disabled={isServingGift}
                              onClick={() =>
                                handleChangeServedQty(
                                  item.itemId,
                                  item.quantity - 1,
                                )
                              }
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </Button>
                            <span className="w-5 text-center text-xs font-semibold">
                              {item.quantity}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              disabled={!canIncrease || isServingGift}
                              onClick={() =>
                                handleChangeServedQty(
                                  item.itemId,
                                  item.quantity + 1,
                                )
                              }
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-600"
                              disabled={isServingGift}
                              onClick={() =>
                                onRemoveGiftItem?.(
                                  selectedMilestone.streakCount,
                                  item.itemId,
                                )
                              }
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </li>
                      );
                    })
                  )}
                </ul>
              )}

              {servedGiftForSelected &&
                remainingQuota > 0 &&
                !showAddGiftPicker && (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 w-full text-xs"
                    disabled={isServingGift}
                    onClick={() => setShowAddGiftPicker(true)}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Thêm món tặng
                  </Button>
                )}

              {/* Claim draft picker; served gifts chỉ mở picker khi staff chủ động thêm */}
              {(showGiftItemPicker &&
                (!servedGiftForSelected || remainingQuota > 0)) &&
                (inStockItems.length === 0 ? (
                  <p className="text-xs text-gray-500">
                    Không còn món trong kho để chọn.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                      <Input
                        value={itemSearch}
                        onChange={(e) => setItemSearch(e.target.value)}
                        placeholder="Tìm món (tên, loại)..."
                        className="h-8 pl-8 pr-8 text-xs"
                        disabled={isServingGift}
                      />
                      {itemSearch && (
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          onClick={() => setItemSearch("")}
                          aria-label="Xóa tìm kiếm"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {filteredInStockItems.length === 0 ? (
                      <p className="text-xs text-gray-500 text-center py-2">
                        Không tìm thấy món phù hợp.
                      </p>
                    ) : (
                      <ul className="space-y-1.5 max-h-56 overflow-y-auto">
                        {filteredInStockItems.map((item) => {
                          const qty = selectedItemQty[item.itemId] ?? 0;
                          const categoryLabel = formatFnBCategory(
                            item.category,
                          );
                          const alreadyServed =
                            servedGiftForSelected?.items.some(
                              (served) => served.itemId === item.itemId,
                            );

                          if (servedGiftForSelected) {
                            return (
                              <li
                                key={item.itemId}
                                className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-2 py-1.5"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-medium truncate">
                                    {item.name}
                                  </p>
                                  <p className="text-[11px] text-gray-500">
                                    {categoryLabel ?? item.category}
                                    {" • Kho: "}
                                    {item.quantity}
                                  </p>
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-7"
                                  disabled={
                                    isServingGift ||
                                    remainingQuota <= 0 ||
                                    item.quantity <= 0
                                  }
                                  onClick={() => handleAddOneItem(item.itemId)}
                                >
                                  <Plus className="h-3.5 w-3.5 mr-1" />
                                  {alreadyServed ? "Thêm 1" : "Thêm"}
                                </Button>
                              </li>
                            );
                          }

                          const canIncrease =
                            (quotaMax === 0 || selectedQtyTotal < quotaMax) &&
                            qty < item.quantity;

                          return (
                            <li
                              key={item.itemId}
                              className={cn(
                                "flex items-center gap-2 rounded-md border px-2 py-1.5",
                                qty > 0
                                  ? "border-pink-300 bg-pink-50"
                                  : "border-gray-200 bg-white",
                              )}
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium truncate">
                                  {item.name}
                                </p>
                                <p className="text-[11px] text-gray-500">
                                  {categoryLabel ?? item.category}
                                  {" • Kho: "}
                                  {item.quantity}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  disabled={qty <= 0 || isServingGift}
                                  onClick={() => adjustDraftItemQty(item, -1)}
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </Button>
                                <span className="w-5 text-center text-xs font-semibold">
                                  {qty}
                                </span>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  disabled={!canIncrease || isServingGift}
                                  onClick={() => adjustDraftItemQty(item, 1)}
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                ))}

              {!servedGiftForSelected && claimGift && (
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    onClick={handleClaimGift}
                    disabled={!canClaimGift || isServingGift}
                    className="h-9 w-full"
                  >
                    {isServingGift ? (
                      <>
                        <Loader2 className="mr-2 size-3.5 animate-spin" />
                        Đang phát...
                      </>
                    ) : selectedQtyTotal > 0 ? (
                      `Phát quà (${selectedQtyTotal} món)`
                    ) : (
                      "Phát quà"
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}

          {streakRewards.length === 0 &&
            claimableAvailableGifts.length === 0 &&
            servedGifts.length === 0 && (
              <div className="rounded-lg border border-gray-200 bg-white/80 px-3 py-2.5 text-sm text-gray-600 text-center">
                Không có quà streak cần phục vụ lúc này.
              </div>
            )}
        </>
      )}
    </section>
  );
};

export default memo(ScheduleMemberSection);

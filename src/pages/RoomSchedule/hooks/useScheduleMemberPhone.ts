import { ICreateRoomScheduleRequest } from "@/apis/roomSchedule.api";
import roomsScheduleApis from "@/apis/roomSchedule.api";
import membershipApis from "@/apis/membership.apis";
import { IClaimGiftItem, IPendingGiftsResponse } from "@/@types/Membership";
import {
  useAddStreakGiftItems,
  useRemoveStreakGiftItem,
  useServeStreakGift,
  useStreakGifts,
  useUpdateStreakGiftItem,
} from "@/hooks/use-membership";
import { normalizeStreakGiftsResponse } from "@/pages/RoomSchedule/utils/streakGifts";
import { toast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { isValidMemberPhone } from "../utils/memberPhone";

const EMPTY_AVAILABLE_GIFTS: never[] = [];
const EMPTY_STREAK_REWARDS: never[] = [];
const EMPTY_SELECTABLE_ITEMS: never[] = [];
const EMPTY_SERVED_GIFTS: never[] = [];

interface UseScheduleMemberPhoneOptions {
  scheduleId: string;
  initialPhone?: string;
  initialGiftEnabled?: boolean;
  isOpen: boolean;
  refetchSchedules?: () => void;
  onGiftServed?: () => void;
}

/**
 * Nhập SĐT → tra cứu streak/điểm/hạng + phát quà ngay (không bắt buộc Lưu SĐT vào booking).
 * Lưu SĐT chỉ khi muốn gắn member vào schedule (vd. discount lúc checkout).
 * Checkout membership discount lấy từ GET /bill?phone=.
 */
export const useScheduleMemberPhone = ({
  scheduleId,
  initialPhone = "",
  initialGiftEnabled = false,
  isOpen,
  refetchSchedules,
  onGiftServed,
}: UseScheduleMemberPhoneOptions) => {
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState(initialPhone);
  const [savedPhone, setSavedPhone] = useState(initialPhone);
  const [isGiftEnabled, setIsGiftEnabled] = useState(initialGiftEnabled);

  useEffect(() => {
    if (!isOpen) return;
    setPhone(initialPhone);
    setSavedPhone(initialPhone);
  }, [isOpen, initialPhone]);

  useEffect(() => {
    if (!isOpen) return;
    setIsGiftEnabled(Boolean(initialGiftEnabled));
  }, [isOpen, initialGiftEnabled]);

  const trimmedPhone = phone.trim();
  const isPhoneDirty = trimmedPhone !== savedPhone.trim();
  const hasSavedValidPhone = isValidMemberPhone(savedPhone);
  const isCurrentPhoneValid = isValidMemberPhone(trimmedPhone);
  /** Tra cứu ngay khi nhập đủ SĐT — không cần Lưu / gắn booking. */
  const shouldLookupMember = isOpen && isCurrentPhoneValid;
  const lookupPhone = isCurrentPhoneValid ? trimmedPhone : "";

  const {
    data: streakGiftsData,
    isLoading: isLoadingMemberInfo,
    isError: isMemberInfoError,
    isFetched: hasFetchedMemberInfo,
  } = useStreakGifts(lookupPhone, {
    enabled: shouldLookupMember,
    scheduleId,
  });

  const memberInfo = streakGiftsData?.user ?? null;
  const availableGifts = streakGiftsData?.availableGifts ?? EMPTY_AVAILABLE_GIFTS;
  const streakRewards = streakGiftsData?.streakRewards ?? EMPTY_STREAK_REWARDS;
  const selectableItems =
    streakGiftsData?.selectableItems ?? EMPTY_SELECTABLE_ITEMS;
  const servedGifts = streakGiftsData?.servedGifts ?? EMPTY_SERVED_GIFTS;
  const isMemberNotFound =
    shouldLookupMember &&
    hasFetchedMemberInfo &&
    !memberInfo &&
    !isMemberInfoError;

  const afterGiftMutation = useCallback(() => {
    refetchSchedules?.();
    onGiftServed?.();
  }, [refetchSchedules, onGiftServed]);

  const prefetchStreakGifts = useCallback(
    async (customerPhone: string) => {
      await queryClient.fetchQuery({
        queryKey: ["streak-gifts", customerPhone, scheduleId],
        queryFn: async () => {
          const response = await membershipApis.getPendingGifts({
            phone: customerPhone,
            scheduleId,
          });
          return normalizeStreakGiftsResponse(
            response.data.result as IPendingGiftsResponse | undefined,
          );
        },
        staleTime: 30 * 1000,
      });
    },
    [queryClient, scheduleId],
  );

  const {
    mutate: savePhoneMutation,
    mutateAsync: savePhoneMutationAsync,
    isPending: isSavingPhone,
  } = useMutation({
    mutationFn: ({
      customerPhone,
    }: {
      customerPhone: string;
      silent?: boolean;
    }) =>
      roomsScheduleApis.updateSchedule(scheduleId, {
        customerPhone,
      } as Partial<ICreateRoomScheduleRequest>),
    onSuccess: async (_, { customerPhone, silent }) => {
      setSavedPhone(customerPhone);
      setPhone(customerPhone);
      refetchSchedules?.();
      if (customerPhone) {
        await prefetchStreakGifts(customerPhone);
      }
      if (!silent) {
        toast({
          title: customerPhone ? "Đã lưu" : "Đã bỏ thành viên",
          description: customerPhone
            ? "Số điện thoại thành viên đã được cập nhật"
            : "Đã gỡ số điện thoại / thành viên khỏi phiên",
        });
      }
    },
    onError: (_error, { silent }) => {
      if (silent) return;
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật số điện thoại",
        variant: "destructive",
      });
    },
  });

  const { mutate: updateGiftEnabled, isPending: isUpdatingGiftEnabled } =
    useMutation({
      mutationFn: (giftEnabled: boolean) =>
        roomsScheduleApis.updateSchedule(scheduleId, { giftEnabled }),
      onMutate: async (giftEnabled) => {
        const previous = isGiftEnabled;
        setIsGiftEnabled(giftEnabled);
        return { previous };
      },
      onSuccess: (_, giftEnabled) => {
        refetchSchedules?.();
        toast({
          title: "Đã cập nhật",
          description: giftEnabled
            ? "Đã cho phép nhận quà"
            : "Đã tắt quyền nhận quà",
        });
      },
      onError: (_error, _giftEnabled, context) => {
        if (context?.previous !== undefined) {
          setIsGiftEnabled(context.previous);
        }
        toast({
          title: "Lỗi",
          description: "Không thể cập nhật quyền nhận quà",
          variant: "destructive",
        });
      },
    });

  const { mutate: claimGiftMutation, isPending: isClaimingGift } =
    useServeStreakGift();
  const { mutate: addGiftItemsMutation, isPending: isAddingGiftItems } =
    useAddStreakGiftItems();
  const { mutate: updateGiftItemMutation, isPending: isUpdatingGiftItem } =
    useUpdateStreakGiftItem();
  const { mutate: removeGiftItemMutation, isPending: isRemovingGiftItem } =
    useRemoveStreakGiftItem();

  /** Dùng SĐT đang nhập — phát quà không cần Lưu vào booking trước. */
  const requireValidPhone = useCallback(() => {
    const value = phone.trim();
    if (!isValidMemberPhone(value)) {
      toast({
        title: "Số điện thoại không hợp lệ",
        description: "Vui lòng nhập SĐT hợp lệ trước khi thao tác quà",
        variant: "destructive",
      });
      return null;
    }
    return value;
  }, [phone]);

  const claimStreakGift = useCallback(
    (streakCount: number, items: IClaimGiftItem[] = []) => {
      const value = requireValidPhone();
      if (!value) return;
      claimGiftMutation(
        { phone: value, streakCount, scheduleId, items },
        { onSuccess: afterGiftMutation },
      );
    },
    [requireValidPhone, claimGiftMutation, scheduleId, afterGiftMutation],
  );

  /** Alias cũ — claim soft (items optional) */
  const serveStreakGift = claimStreakGift;

  const addStreakGiftItems = useCallback(
    (streakCount: number, items: IClaimGiftItem[]) => {
      const value = requireValidPhone();
      if (!value) return;
      if (!items.length) return;
      addGiftItemsMutation(
        { phone: value, streakCount, scheduleId, items },
        { onSuccess: afterGiftMutation },
      );
    },
    [requireValidPhone, addGiftItemsMutation, scheduleId, afterGiftMutation],
  );

  const updateStreakGiftItemQty = useCallback(
    (streakCount: number, itemId: string, quantity: number) => {
      const value = requireValidPhone();
      if (!value) return;
      updateGiftItemMutation(
        { phone: value, streakCount, scheduleId, itemId, quantity },
        { onSuccess: afterGiftMutation },
      );
    },
    [requireValidPhone, updateGiftItemMutation, scheduleId, afterGiftMutation],
  );

  const removeStreakGiftItem = useCallback(
    (streakCount: number, itemId: string) => {
      const value = requireValidPhone();
      if (!value) return;
      removeGiftItemMutation(
        { phone: value, streakCount, scheduleId, itemId },
        { onSuccess: afterGiftMutation },
      );
    },
    [requireValidPhone, removeGiftItemMutation, scheduleId, afterGiftMutation],
  );

  const savePhone = useCallback(() => {
    const value = phone.trim();
    if (!isValidMemberPhone(value)) {
      toast({
        title: "Số điện thoại không hợp lệ",
        description: "Vui lòng nhập đúng 10–11 số, bắt đầu bằng 0",
        variant: "destructive",
      });
      return;
    }
    savePhoneMutation({ customerPhone: value });
  }, [phone, savePhoneMutation]);

  const clearPhone = useCallback(() => {
    if (!phone.trim() && !savedPhone.trim()) return;

    const previousPhone = phone;
    setPhone("");
    if (!savedPhone.trim()) return;

    savePhoneMutation(
      { customerPhone: "" },
      {
        onError: () => {
          setPhone(previousPhone);
        },
      },
    );
  }, [phone, savedPhone, savePhoneMutation]);

  const ensurePhoneSavedForSubmit = useCallback(async (): Promise<
    string | null
  > => {
    if (!isPhoneDirty) {
      const value = savedPhone.trim();
      if (value && !isValidMemberPhone(value)) {
        toast({
          title: "Số điện thoại không hợp lệ",
          description:
            "Vui lòng cập nhật số điện thoại thành 10–11 số trước khi kết thúc",
          variant: "destructive",
        });
        return null;
      }
      return value;
    }

    const value = phone.trim();
    if (!value) {
      if (savedPhone.trim()) {
        try {
          await savePhoneMutationAsync({ customerPhone: "", silent: true });
        } catch {
          toast({
            title: "Lỗi",
            description: "Không thể bỏ số điện thoại trước khi kết thúc",
            variant: "destructive",
          });
          return null;
        }
      } else {
        setSavedPhone("");
      }
      return "";
    }

    if (!isValidMemberPhone(value)) {
      toast({
        title: "Số điện thoại không hợp lệ",
        description:
          "Vui lòng nhập đúng 10–11 số, bắt đầu bằng 0 trước khi kết thúc",
        variant: "destructive",
      });
      return null;
    }

    try {
      await savePhoneMutationAsync({ customerPhone: value, silent: true });
      return value;
    } catch {
      toast({
        title: "Lỗi",
        description: "Không thể lưu số điện thoại trước khi kết thúc",
        variant: "destructive",
      });
      return null;
    }
  }, [isPhoneDirty, phone, savedPhone, savePhoneMutationAsync]);

  const isMutatingGift =
    isClaimingGift ||
    isAddingGiftItems ||
    isUpdatingGiftItem ||
    isRemovingGiftItem;

  return {
    phone,
    setPhone,
    savedPhone,
    isGiftEnabled,
    updateGiftEnabled,
    isSavingPhone,
    isUpdatingGiftEnabled,
    isPhoneDirty,
    hasSavedValidPhone,
    savePhone,
    clearPhone,
    ensurePhoneSavedForSubmit,
    memberInfo,
    availableGifts,
    streakRewards,
    selectableItems,
    servedGifts,
    isLoadingMemberInfo,
    isMemberInfoError,
    isMemberNotFound,
    claimStreakGift,
    serveStreakGift,
    addStreakGiftItems,
    updateStreakGiftItemQty,
    removeStreakGiftItem,
    isServingGift: isMutatingGift,
    isMutatingGift,
  };
};

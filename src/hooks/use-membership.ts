import membershipApis, {
  GetPendingGiftsParams,
} from "@/apis/membership.apis";
import {
  GrantUserPointsPayload,
  IAddStreakGiftItemsPayload,
  IMembershipConfig,
  IPendingGiftsResponse,
  IRemoveStreakGiftItemPayload,
  IServeStreakGiftPayload,
  IStreakGiftItemsResult,
  IUpdateStreakGiftItemPayload,
  IUserStreakInfo,
  MembershipConfigPayload,
  UpdateStreakPayload,
} from "@/@types/Membership";
import { normalizeStreakGiftsResponse } from "@/pages/RoomSchedule/utils/streakGifts";
import { useToast } from "./use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useMembershipConfig = () => {
  return useQuery({
    queryKey: ["membership-config"],
    queryFn: async () => {
      const response = await membershipApis.getConfig();
      return response.data.result as IMembershipConfig | undefined;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useUpdateMembershipConfig = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: MembershipConfigPayload) =>
      membershipApis.updateConfig(payload),
    onSuccess: (response) => {
      toast({
        title: "Thành công",
        description:
          response.data.message || "Đã lưu cấu hình membership thành công",
      });
      queryClient.invalidateQueries({ queryKey: ["membership-config"] });
    },
    onError: () => {
      toast({
        title: "Lỗi",
        description: "Không thể lưu cấu hình membership",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateMemberPoints = (userId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: GrantUserPointsPayload) => {
      if (!userId) {
        return Promise.reject(new Error("Thiếu userId để cập nhật điểm"));
      }
      return membershipApis.updateMemberPoints(userId, payload);
    },
    onSuccess: (response) => {
      toast({
        title: "Thành công",
        description:
          response.data.message || "Đã cập nhật điểm thành viên thành công",
      });
      queryClient.invalidateQueries({ queryKey: ["user-membership", userId] });
    },
    onError: (error) => {
      const errorMessage =
        error instanceof Error ? error.message : "Không thể cập nhật điểm";
      toast({
        title: "Lỗi",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });
};

export const useUpdateMemberStreak = (userId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: UpdateStreakPayload) => {
      if (!userId) {
        return Promise.reject(new Error("Thiếu userId để cập nhật streak"));
      }
      return membershipApis.updateMemberStreak(userId, payload);
    },
    onSuccess: (response) => {
      toast({
        title: "Thành công",
        description: response.data.message || "Đã cập nhật streak thành công",
      });
      queryClient.invalidateQueries({ queryKey: ["user-membership", userId] });
    },
    onError: (error) => {
      const errorMessage =
        error instanceof Error ? error.message : "Không thể cập nhật streak";
      toast({
        title: "Lỗi",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });
};

export const usePendingGifts = (
  phoneOrParams?: string | GetPendingGiftsParams,
  options?: { enabled?: boolean },
) => {
  const params =
    typeof phoneOrParams === "string"
      ? { phone: phoneOrParams }
      : phoneOrParams;
  const phone = params?.phone;
  const userId = params?.userId;
  const scheduleId = params?.scheduleId;
  const category = params?.category;

  return useQuery({
    queryKey: ["pending-gifts", phone, userId, scheduleId, category],
    queryFn: async () => {
      if (!phone && !userId) {
        throw new Error("Thiếu số điện thoại hoặc userId");
      }
      const response = await membershipApis.getPendingGifts({
        phone,
        userId,
        scheduleId,
        category,
      });
      return normalizeStreakGiftsResponse(
        response.data.result as IPendingGiftsResponse | undefined,
      );
    },
    enabled: (options?.enabled ?? true) && !!(phone || userId),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
};

/** Staff lookup quà streak theo SĐT (+ scheduleId để lấy servedGifts) */
export const useStreakGifts = (
  phone?: string,
  options?: { enabled?: boolean; scheduleId?: string },
) => {
  const scheduleId = options?.scheduleId;
  return useQuery({
    queryKey: ["streak-gifts", phone, scheduleId],
    queryFn: async () => {
      if (!phone) {
        throw new Error("Thiếu số điện thoại");
      }
      const response = await membershipApis.getPendingGifts({
        phone,
        scheduleId,
      });
      return normalizeStreakGiftsResponse(
        response.data.result as IPendingGiftsResponse | undefined,
      );
    },
    enabled: (options?.enabled ?? true) && !!phone,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useStreakGiftItems = (
  category?: string,
  options?: { enabled?: boolean },
) => {
  return useQuery({
    queryKey: ["streak-gift-items", category],
    queryFn: async () => {
      const response = await membershipApis.getStreakGiftItems(category);
      return response.data.result as IStreakGiftItemsResult | undefined;
    },
    enabled: options?.enabled ?? true,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

const getApiErrorMessage = (error: unknown, fallback: string) =>
  (error as { response?: { data?: { message?: string } } })?.response?.data
    ?.message || fallback;

const invalidateStreakGiftQueries = (
  queryClient: ReturnType<typeof useQueryClient>,
  phone?: string,
  scheduleId?: string,
) => {
  if (phone) {
    queryClient.invalidateQueries({ queryKey: ["streak-gifts", phone] });
    queryClient.invalidateQueries({ queryKey: ["pending-gifts", phone] });
  }
  queryClient.invalidateQueries({ queryKey: ["pending-gifts"] });
  queryClient.invalidateQueries({ queryKey: ["streak-gifts"] });
  if (scheduleId) {
    queryClient.invalidateQueries({ queryKey: ["bill", scheduleId] });
    queryClient.invalidateQueries({
      queryKey: ["fnbOrderDetail", scheduleId],
    });
  }
};

export const useServeStreakGift = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: IServeStreakGiftPayload) =>
      membershipApis.claimGift(payload),
    onSuccess: (response, payload) => {
      toast({
        title: "Thành công",
        description:
          response.data.message || "Đã claim quà streak cho khách hàng",
      });
      invalidateStreakGiftQueries(
        queryClient,
        payload.phone,
        payload.scheduleId,
      );
    },
    onError: (error: unknown) => {
      toast({
        title: "Lỗi",
        description: getApiErrorMessage(
          error,
          "Không thể claim quà streak. Vui lòng thử lại.",
        ),
        variant: "destructive",
      });
    },
  });
};

export const useAddStreakGiftItems = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: IAddStreakGiftItemsPayload) =>
      membershipApis.addStreakGiftItems(payload),
    onSuccess: (response, payload) => {
      toast({
        title: "Đã thêm món quà",
        description: response.data.message || "Đã cập nhật quota quà streak",
      });
      invalidateStreakGiftQueries(
        queryClient,
        payload.phone,
        payload.scheduleId,
      );
    },
    onError: (error: unknown) => {
      toast({
        title: "Lỗi",
        description: getApiErrorMessage(error, "Không thể thêm món quà"),
        variant: "destructive",
      });
    },
  });
};

export const useUpdateStreakGiftItem = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: IUpdateStreakGiftItemPayload) =>
      membershipApis.updateStreakGiftItem(payload),
    onSuccess: (response, payload) => {
      toast({
        title: payload.quantity === 0 ? "Đã xoá món quà" : "Đã cập nhật số lượng",
        description: response.data.message || "Đã cập nhật quota quà streak",
      });
      invalidateStreakGiftQueries(
        queryClient,
        payload.phone,
        payload.scheduleId,
      );
    },
    onError: (error: unknown) => {
      toast({
        title: "Lỗi",
        description: getApiErrorMessage(error, "Không thể cập nhật món quà"),
        variant: "destructive",
      });
    },
  });
};

export const useRemoveStreakGiftItem = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: IRemoveStreakGiftItemPayload) =>
      membershipApis.removeStreakGiftItem(payload),
    onSuccess: (response, payload) => {
      toast({
        title: "Đã xoá món quà",
        description: response.data.message || "Đã trả lại quota quà streak",
      });
      invalidateStreakGiftQueries(
        queryClient,
        payload.phone,
        payload.scheduleId,
      );
    },
    onError: (error: unknown) => {
      toast({
        title: "Lỗi",
        description: getApiErrorMessage(error, "Không thể xoá món quà"),
        variant: "destructive",
      });
    },
  });
};

export const useMemberStreakInfo = (userId?: string) => {
  return useQuery({
    queryKey: ["member-streak-info", userId],
    queryFn: async () => {
      if (!userId) {
        throw new Error("Thiếu userId");
      }
      const response = await membershipApis.getMemberStreakInfo(userId);
      return response.data.result as IUserStreakInfo | undefined;
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
};

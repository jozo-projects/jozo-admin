import {
  GrantUserPointsPayload,
  IAddStreakGiftItemsPayload,
  IClaimGiftPayload,
  IClaimGiftResult,
  IMembershipConfig,
  IMembershipMe,
  IPendingGiftsResponse,
  IRemoveStreakGiftItemPayload,
  IServeStreakGiftPayload,
  IStreakGiftItemsResult,
  IStreakGiftQuotaResult,
  IStreakGiftsResponse,
  IUpdateStreakGiftItemPayload,
  IUserStreakInfo,
  MembershipConfigPayload,
  UpdateStreakPayload,
} from "@/@types/Membership";
import http from "@/utils/http";

const MEMBERSHIP_CONTROLLER = "/membership/config";
const MEMBERSHIP_ME_CONTROLLER = "/membership/me";
const MEMBERSHIP_MEMBER_CONTROLLER = "/membership/members";
const STREAK_GIFTS_ITEMS = "/membership/streak-gifts/items";

export type GetPendingGiftsParams = {
  phone?: string;
  userId?: string;
  scheduleId?: string;
  category?: "drink" | "snack" | string;
};

const membershipApis = {
  getConfig: () =>
    http.get<HTTPResponse<IMembershipConfig>>(MEMBERSHIP_CONTROLLER),
  updateConfig: (payload: MembershipConfigPayload) =>
    http.put<HTTPResponse<IMembershipConfig>>(MEMBERSHIP_CONTROLLER, payload),
  getMe: () => http.get<HTTPResponse<IMembershipMe>>(MEMBERSHIP_ME_CONTROLLER),
  updateMemberPoints: (id: string, payload: GrantUserPointsPayload) =>
    http.post<HTTPResponse>(
      `${MEMBERSHIP_MEMBER_CONTROLLER}/${id}/points`,
      payload,
    ),
  updateMemberStreak: (id: string, payload: UpdateStreakPayload) =>
    http.put<HTTPResponse>(
      `${MEMBERSHIP_MEMBER_CONTROLLER}/${id}/streak`,
      payload,
    ),
  getMemberStreakInfo: (id: string) =>
    http.get<HTTPResponse<IUserStreakInfo>>(
      `${MEMBERSHIP_MEMBER_CONTROLLER}/${id}/streak`,
    ),
  getPendingGifts: (params: GetPendingGiftsParams | string) => {
    if (typeof params === "string") {
      return http.get<HTTPResponse<IPendingGiftsResponse>>(
        `/membership/pending-gifts?phone=${encodeURIComponent(params)}`,
      );
    }

    const { phone, userId, scheduleId, category } = params;
    const query = new URLSearchParams();
    if (category) query.set("category", category);
    if (scheduleId) query.set("scheduleId", scheduleId);

    if (userId) {
      const qs = query.toString();
      return http.get<HTTPResponse<IPendingGiftsResponse>>(
        `${MEMBERSHIP_MEMBER_CONTROLLER}/${encodeURIComponent(userId)}/pending-gifts${qs ? `?${qs}` : ""}`,
      );
    }

    if (phone) query.set("phone", phone);
    const qs = query.toString();
    return http.get<HTTPResponse<IPendingGiftsResponse>>(
      `/membership/pending-gifts${qs ? `?${qs}` : ""}`,
    );
  },
  claimGift: (payload: IClaimGiftPayload) =>
    http.post<HTTPResponse<IClaimGiftResult>>(`/membership/claim-gift`, payload),
  /** Alias lịch sử — cùng shape pending-gifts */
  getStreakGifts: (phone: string, scheduleId?: string) => {
    const query = new URLSearchParams({ phone });
    if (scheduleId) query.set("scheduleId", scheduleId);
    return http.get<HTTPResponse<IStreakGiftsResponse>>(
      `/membership/pending-gifts?${query.toString()}`,
    );
  },
  serveStreakGift: (payload: IServeStreakGiftPayload) =>
    http.post<HTTPResponse<IClaimGiftResult>>(
      `/membership/serve-streak-gift`,
      payload,
    ),
  getStreakGiftItems: (category?: string) => {
    const qs = category ? `?category=${encodeURIComponent(category)}` : "";
    return http.get<HTTPResponse<IStreakGiftItemsResult>>(
      `/membership/streak-gift-items${qs}`,
    );
  },
  /** Thêm món vào quà streak đã claim trên schedule */
  addStreakGiftItems: (payload: IAddStreakGiftItemsPayload) =>
    http.post<HTTPResponse<IStreakGiftQuotaResult>>(STREAK_GIFTS_ITEMS, payload),
  /** Sửa số lượng món (quantity: 0 = xoá) */
  updateStreakGiftItem: (payload: IUpdateStreakGiftItemPayload) =>
    http.patch<HTTPResponse<IStreakGiftQuotaResult>>(STREAK_GIFTS_ITEMS, payload),
  /** Xoá món khỏi quà streak */
  removeStreakGiftItem: (payload: IRemoveStreakGiftItemPayload) =>
    http.delete<HTTPResponse<IStreakGiftQuotaResult>>(STREAK_GIFTS_ITEMS, {
      data: payload,
    }),
};

export default membershipApis;

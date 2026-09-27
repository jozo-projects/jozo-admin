// src/hooks/useRoomSchedules.ts
import { IRoomSchedule } from "@/@types/Room";
import roomApis from "@/apis/room.apis";
import roomsScheduleApis from "@/apis/roomSchedule.api";
import { parseUTCToLocal } from "@/lib/dayjs";
import { QueryClient, useMutation, useQuery } from "@tanstack/react-query";
import dayjs, { Dayjs } from "dayjs";

export const getRoomSchedulesQueryKey = (date: Dayjs | string) => {
  const normalized =
    typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? dayjs(date)
      : dayjs(date);
  return ["roomSchedules", normalized.startOf("day").toISOString()] as const;
};

/** Query key theo ngày của schedule (khớp useRoomSchedules). */
export const getRoomSchedulesQueryKeyForSchedule = (
  schedule: Pick<IRoomSchedule, "startTime">,
) => getRoomSchedulesQueryKey(parseUTCToLocal(schedule.startTime));

/** Cập nhật một schedule trong cache roomSchedules của ngày tương ứng. */
export const patchScheduleInRoomSchedulesCache = (
  queryClient: QueryClient,
  schedule: Pick<IRoomSchedule, "_id" | "startTime">,
  patch: Partial<IRoomSchedule>,
) => {
  const queryKey = getRoomSchedulesQueryKeyForSchedule(schedule);

  queryClient.setQueryData<IRoomSchedule[]>(queryKey, (old) => {
    if (!old) return old;
    return old.map((item) =>
      item._id === schedule._id ? { ...item, ...patch } : item,
    );
  });

  return queryKey;
};

/** Chuẩn hóa promotionId từ API/socket (string hoặc ObjectId). */
export const normalizeSchedulePromotionId = (
  promotionId: unknown,
): string | undefined => {
  if (promotionId === null || promotionId === undefined || promotionId === "") {
    return undefined;
  }
  if (typeof promotionId === "string") return promotionId;
  if (typeof promotionId === "object" && promotionId !== null && "_id" in promotionId) {
    const id = (promotionId as { _id?: unknown })._id;
    return id != null ? String(id) : undefined;
  }
  return String(promotionId);
};

/** Ghi promotionId vào cache sau khi PUT thành công — không refetch. */
export const persistSchedulePromotionInCache = (
  queryClient: QueryClient,
  schedule: Pick<IRoomSchedule, "_id" | "startTime">,
  promotionId: string | null,
) =>
  patchScheduleInRoomSchedulesCache(queryClient, schedule, {
    promotionId: promotionId ?? undefined,
  });

export type RoomScheduleChangedAction =
  | "created"
  | "updated"
  | "cancelled"
  | "finished";

export const applyScheduleChangedToCache = (
  old: IRoomSchedule[] | undefined,
  action: RoomScheduleChangedAction,
  schedule: IRoomSchedule,
): IRoomSchedule[] | undefined => {
  if (!old) {
    return action === "created" ? [schedule] : old;
  }

  if (action === "created") {
    if (old.some((item) => item._id === schedule._id)) return old;
    return [...old, schedule];
  }

  const updated = old.map((item) => {
    if (item._id !== schedule._id) return item;

    const incomingPromotionId = normalizeSchedulePromotionId(schedule.promotionId);
    const merged: IRoomSchedule = { ...item, ...schedule };

    if ("promotionId" in schedule) {
      merged.promotionId = incomingPromotionId;
    }

    return merged;
  });

  if (action === "cancelled" || action === "finished") {
    return updated;
  }

  return updated.filter((item) => item.status?.toLowerCase() !== "cancelled");
};

export const useRoomSchedules = (date: Dayjs = dayjs()) => {
  const queryKey = getRoomSchedulesQueryKey(date);

  return useQuery<IRoomSchedule[], Error>({
    queryKey,
    queryFn: async () => {
      const response = await roomsScheduleApis.getRoomSchedules(queryKey[1]);
      if (!response.data.result) {
        return [];
      }
      return response.data.result;
    },
    refetchOnWindowFocus: false,
  });
};

export const useRoomSchedule = (scheduleId: string) => {
  return useQuery<IRoomSchedule, Error>({
    queryKey: ["roomSchedule", scheduleId],
    queryFn: async () => {
      const response = await roomsScheduleApis.getScheduleById(scheduleId);
      if (!response.data.result) {
        throw new Error("Schedule not found");
      }
      return response.data.result;
    },
  });
};

export const useResolveRequest = () => {
  return useMutation({
    mutationFn: roomApis.resolveRequest,
  });
};

export const useTurnOffAllRooms = () => {
  return useMutation({
    mutationFn: roomApis.turnOffAllRooms,
  });
};

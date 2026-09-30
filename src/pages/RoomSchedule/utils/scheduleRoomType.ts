import { IRoom, IRoomSchedule } from "@/@types/Room";
import { RoomStatus, RoomType } from "@/constants/enum";

const ROOM_TYPE_VALUES = new Set<string>(Object.values(RoomType));

/** BE có thể trả "Medium"/"Large"; FE enum dùng lowercase ("medium"). */
export const normalizeRoomType = (
  type?: string | RoomType | null,
): RoomType | undefined => {
  if (type == null || type === "") return undefined;
  const normalized = String(type).trim().toLowerCase();
  if (!ROOM_TYPE_VALUES.has(normalized)) return undefined;
  return normalized as RoomType;
};

export const getEffectiveScheduleRoomType = (
  schedule: Pick<IRoomSchedule, "roomType">,
  room?: Pick<IRoom, "roomType"> | null,
): RoomType | undefined =>
  normalizeRoomType(schedule.roomType) ?? normalizeRoomType(room?.roomType);

export const isScheduleRoomTypeEditable = (
  schedule: Pick<IRoomSchedule, "status" | "actualEndTime">,
): boolean =>
  schedule.status !== RoomStatus.Finished &&
  schedule.status !== RoomStatus.Cancelled &&
  !schedule.actualEndTime;

export const getRoomTypeLabel = (type?: string | RoomType | null) => {
  switch (normalizeRoomType(type)) {
    case RoomType.Small:
      return "Nhỏ";
    case RoomType.Large:
      return "Lớn";
    case RoomType.Medium:
      return "Nhỏ";
    case RoomType.Dorm:
      return "Dorm";
    default:
      return "—";
  }
};

export const getRoomTypeForBooking = (
  use4Mic: boolean,
): RoomType.Medium | RoomType.Large =>
  use4Mic ? RoomType.Large : RoomType.Medium;

export const getScheduleTimelineLabel = (
  roomName: string,
  schedule: Pick<IRoomSchedule, "roomType" | "status">,
  room?: Pick<IRoom, "roomType"> | null,
): string => {
  const status = schedule.status?.toLowerCase();
  if (status !== "booked" && status !== "in use") {
    return roomName;
  }

  const effectiveType = getEffectiveScheduleRoomType(schedule, room);
  const sizeLabel = getRoomTypeLabel(effectiveType).toLowerCase();
  if (!effectiveType || sizeLabel === "—") {
    return roomName;
  }

  return `${roomName} - ${sizeLabel}`;
};

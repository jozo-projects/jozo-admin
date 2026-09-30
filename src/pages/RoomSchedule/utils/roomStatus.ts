import { IRoom } from "@/@types/Room";
import { RoomStatus } from "@/constants/enum";

export const isRoomUnderMaintenance = (
  room?: Pick<IRoom, "status"> | null,
): boolean => room?.status?.toLowerCase() === RoomStatus.Maintenance;

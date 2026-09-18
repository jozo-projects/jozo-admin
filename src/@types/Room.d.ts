import { RoomStatus, RoomType } from "@/constants/enum";

interface ITimeSlotPrice {
  timeSlot: string;
  price: number;
}

interface ITimeSlot {
  start: string;
  end: string;
  prices: ITimeSlotPrice[];
}

interface IRoom {
  _id?: ObjectId;
  roomId: number;
  roomName: string;
  roomType: RoomType;
  status: RoomStatus; // e.g., AVAILABLE, UNAVAILABLE
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
  maxCapacity?: number;
}

interface IRoomSchedule {
  _id: string;
  roomId: string;
  startTime: string;
  endTime: string | null;
  status: RoomStatus;
  note?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  actualEndTime: string | null;
  newRoomId?: string;
  roomChangeNote?: string;
  // Customer information
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  // Room upgrade information
  originalRoomType?: string;
  upgraded?: boolean;
  // Booking source
  source?: "customer" | "admin" | "walk-in" | "staff";
  dateOfUse?: string;
  bookingCode?: string;
  // Gift enabled
  giftEnabled?: boolean;
  photoDisplayState?: "hidden" | "showing" | "deleted";
  photos?: Array<{ id: string; url: string; publicId: string; position: number }>;
  /** Khuyến mãi đã chọn lúc booked — dùng lại khi mở modal thanh toán */
  promotionId?: string;
  // Free hour promotion
  applyFreeHourPromo?: boolean;
  /** Size khách đặt / đang sử dụng (snapshot, khác room.roomType vật lý) */
  roomType?: RoomType;
}

interface IRoomScheduleChangedSocketPayload {
  action: "created" | "updated" | "cancelled" | "finished";
  schedule: IRoomSchedule;
  roomIndex: string;
}

type RoomDeviceClientType = "control" | "video" | "unknown";

interface RoomDeviceConnection {
  deviceId: string;
  roomId: string;
  clientType: RoomDeviceClientType;
  socketId: string;
  origin: string;
  connectedAt: string; // ISO
}

interface RoomDeviceRoomGroup {
  roomId: string;
  count: number;
  devices: RoomDeviceConnection[];
}

interface RoomDeviceConnectionsSnapshot {
  rooms: RoomDeviceRoomGroup[];
  totalDevices: number;
}

export type {
  IRoom,
  ITimeSlot,
  ITimeSlotPrice,
  IRoomSchedule,
  IRoomScheduleChangedSocketPayload,
  RoomDeviceClientType,
  RoomDeviceConnection,
  RoomDeviceRoomGroup,
  RoomDeviceConnectionsSnapshot,
};

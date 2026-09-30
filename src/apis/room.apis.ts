import { IRoom, RoomDeviceConnectionsSnapshot } from "@/@types/Room";
import { RoomType } from "@/constants/enum";
import http from "@/utils/http";

const ROOM_CONTROLLER = "/rooms";

// Interface cho RoomRequest (input API)
export interface IAddRoomRequestBody {
  roomId: number;
  roomName: string;
  roomType: RoomType;
  description?: string;
}

export interface IPendingOrderNotification {
  type: "new_order";
  roomId: string;
  message: string;
  timestamp: number;
  orderData: {
    orderId: string;
    items: Array<{ itemId: string; name: string; quantity: number; price: number }>;
    totalAmount: number;
    customerInfo: { roomName: string; roomScheduleId: string };
    createdAt: string;
  };
}

const roomApis = {
  createRoom: (payload: IRoom) => {
    return http.post<HTTPResponse<IRoom>>(
      `${ROOM_CONTROLLER}/add-room`,
      payload
    );
  },
  getRooms: () => {
    return http.get<HTTPResponse<IRoom[]>>(`${ROOM_CONTROLLER}`);
  },
  getPendingOrderNotifications: () => {
    return http.get<HTTPResponse<IPendingOrderNotification[]>>(
      `${ROOM_CONTROLLER}/order-notifications/pending`
    );
  },
  updateRoom: (payload: IRoom) => {
    return http.put<HTTPResponse<IRoom>>(
      `${ROOM_CONTROLLER}/${payload._id}`,
      payload
    );
  },
  getRoomById: (id: string) => {
    return http.get<HTTPResponse<IRoom>>(`${ROOM_CONTROLLER}/${id}`);
  },
  deleteRoom: (payload: { _id: string }) => {
    return http.delete<HTTPResponse<IRoom>>(
      `${ROOM_CONTROLLER}/${payload._id}`
    );
  },
  deleteRoomByIds: (payload: { ids: string[] }) => {
    return http.delete<HTTPResponse<IRoom>>(
      `${ROOM_CONTROLLER}/delete-room-by-ids`,
      { data: payload }
    );
  },
  resolveRequest: (roomIndex: string) => {
    return http.post<HTTPResponse>(
      `${ROOM_CONTROLLER}/${roomIndex}/resolve-request`
    );
  },
  turnOffAllRooms: () => {
    return http.post<HTTPResponse>(`${ROOM_CONTROLLER}/turn-off-videos`);
  },
  getDeviceConnections: () => {
    return http.get<HTTPResponse<RoomDeviceConnectionsSnapshot>>(
      `${ROOM_CONTROLLER}/device-connections`
    );
  },
};

export default roomApis;

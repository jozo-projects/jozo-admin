import {
  SupportRequest,
  SupportRequestListResponse,
  SupportRequestResponse,
} from "@/@types/SupportRequest";
import http from "@/utils/http";

const ROOM_MUSIC_CONTROLLER = "/room-music";

const supportRequestApis = {
  create: (roomId: string) =>
    http.post<SupportRequestResponse>(
      `${ROOM_MUSIC_CONTROLLER}/${roomId}/support-requests`,
    ),
  getActive: (roomId: string) =>
    http.get<SupportRequestListResponse>(
      `${ROOM_MUSIC_CONTROLLER}/${roomId}/support-requests/active`,
    ),
  getHistory: (roomId: string) =>
    http.get<SupportRequestListResponse>(
      `${ROOM_MUSIC_CONTROLLER}/${roomId}/support-requests/history`,
    ),
  getAllHistory: () =>
    http.get<SupportRequestListResponse>(
      `${ROOM_MUSIC_CONTROLLER}/support-requests/history`,
    ),
  acknowledge: (requestId: string) =>
    http.post<SupportRequestResponse>(
      `${ROOM_MUSIC_CONTROLLER}/support-requests/${requestId}/acknowledge`,
    ),
  resolve: (requestId: string, supportNote: string) =>
    http.post<SupportRequestResponse>(
      `${ROOM_MUSIC_CONTROLLER}/support-requests/${requestId}/resolve`,
      { supportNote },
    ),
  close: (requestId: string) =>
    http.post<SupportRequestResponse>(
      `${ROOM_MUSIC_CONTROLLER}/support-requests/${requestId}/close`,
    ),
};

export const supportRequestFromResponse = (
  response: SupportRequestResponse,
): SupportRequest => response.result;

export default supportRequestApis;

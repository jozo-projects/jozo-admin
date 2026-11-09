import http from "@/utils/http";

export type AuthorizationClientType = "video" | "control";
export interface ActiveAuthorization {
  id: string;
  roomId: number;
  roomName: string;
  clientType: AuthorizationClientType;
}
export interface PendingAuthorization extends ActiveAuthorization {
  createdAt: string;
  expiresAt: string;
}
export interface AuthorizationSnapshot {
  pending: PendingAuthorization[];
  rejected?: PendingAuthorization[];
  active: ActiveAuthorization[];
  truncated: boolean;
}
export type ApproveAuthorization = Pick<PendingAuthorization, "id" | "roomId" | "clientType"> & { expectedActiveId: string | null };
export type RevokeAuthorization = Pick<ActiveAuthorization, "roomId" | "clientType"> & { expectedActiveId: string };

const base = "/room-device-authorization/admin";
// The authorization endpoints return raw JSON, unlike the usual HTTPResponse wrapper.
const roomDeviceAuthorizationApis = {
  getConfig: () => http.get<{ enabled: boolean }>("/room-device-authorization/config"),
  updateConfig: (enabled: boolean) => http.put(`${base}/config`, { enabled }),
  list: () => http.get<AuthorizationSnapshot>(base),
  approve: (payload: ApproveAuthorization) => http.post<{ approved: boolean }>(`${base}/approve`, payload),
  reject: (payload: Pick<PendingAuthorization, "id" | "roomId" | "clientType">) => http.post<{ rejected: boolean }>(`${base}/reject`, payload),
  reopen: (payload: Pick<PendingAuthorization, "id" | "roomId" | "clientType">) => http.post<{ reopened: boolean }>(`${base}/reopen`, payload),
  revoke: (payload: RevokeAuthorization) => http.post<{ revoked: boolean }>(`${base}/revoke`, payload),
};
export default roomDeviceAuthorizationApis;

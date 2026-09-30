export type SupportRequestStatus =
  "pending" | "acknowledged" | "resolved" | "not_supported" | "closed" | "expired";

export interface SupportRequestActor {
  userId: string;
  name: string;
  role: "admin" | "staff";
}

export interface SupportRequest {
  requestId: string;
  roomId: string;
  message?: string;
  status: SupportRequestStatus;
  createdAt: string;
  expiresAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: SupportRequestActor;
  expiredAt?: string;
  timedOutAt?: string;
  closedAt?: string;
  closedBy?: SupportRequestActor;
  resolvedAt?: string;
  resolvedBy?: SupportRequestActor;
  supportNote?: string;
}

export interface SupportRequestResponse {
  message?: string;
  result: SupportRequest;
}

export interface SupportRequestListResponse {
  result: SupportRequest[];
}

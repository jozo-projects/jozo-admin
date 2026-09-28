export enum NotificationType {
  ScheduleRegistered = "schedule_registered",
  ScheduleCreatedByEmployee = "schedule_created_by_employee",
  ScheduleApproved = "schedule_approved",
  ScheduleRejected = "schedule_rejected",
  ScheduleAssigned = "schedule_assigned",
  ScheduleReminder = "schedule_reminder",
  ScheduleStatusUpdated = "schedule_status_updated",
  System = "system",
  MessengerMessageReceived = "messenger_message_received",
}

export interface INotification {
  _id: string;
  title: string;
  body: string;
  type: NotificationType;
  data?: {
    scheduleId?: string;
    scheduleDate?: string; // "DD/MM/YYYY"
    shiftType?: string; // "morning", "afternoon"
    status?: string;
    [key: string]: any;
  };
  isRead: boolean;
  createdAt: string | Date;
  updatedAt?: string | Date;
}

export interface INotificationListResponse {
  notifications: INotification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface INotificationQuery {
  page?: number;
  limit?: number;
  isRead?: boolean;
  type?: NotificationType;
}

export interface IUnreadCountResponse {
  count: number;
}

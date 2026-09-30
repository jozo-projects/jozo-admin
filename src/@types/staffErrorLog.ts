export enum StaffErrorLogType {
  Warning = "warning",
  Penalty = "penalty",
}

export enum StaffErrorLogStatus {
  Active = "active",
  Cancelled = "cancelled",
}

export type StaffErrorPreset = {
  _id: string;
  code: string;
  name: string;
  description?: string;
  defaultAmount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type StaffErrorLog = {
  _id: string;
  userId: string;
  userName: string;
  type: StaffErrorLogType;
  presetId?: string;
  presetCode?: string;
  presetName?: string;
  title: string;
  note: string;
  amount: number;
  occurredAt: string;
  status: StaffErrorLogStatus;
  createdBy: string;
  createdByName: string;
  cancelledBy?: string;
  cancelledByName?: string;
  cancelledAt?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateStaffErrorPresetPayload = {
  code: string;
  name: string;
  description?: string;
  defaultAmount: number;
  isActive?: boolean;
};

export type UpdateStaffErrorPresetPayload = Partial<CreateStaffErrorPresetPayload>;

export type CreateStaffErrorLogPayload = {
  userId: string;
  type: StaffErrorLogType;
  presetId?: string;
  title?: string;
  note: string;
  amount?: number;
  occurredAt?: string;
};

export type CancelStaffErrorLogPayload = {
  cancelReason?: string;
};

export type StaffErrorLogFilters = {
  userId?: string;
  type?: StaffErrorLogType | "";
  status?: StaffErrorLogStatus | "";
  startDate?: string;
  endDate?: string;
  presetId?: string;
};

export type ApiResponse<T> = {
  message: string;
  result: T;
};

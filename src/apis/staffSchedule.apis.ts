import http from "@/utils/http";
import { EmployeeScheduleStatus } from "@/constants/enum";

export interface IRegisterStaffScheduleRequest {
  userId: string;
  date: string; // Format: YYYY-MM-DD
  shifts: string[]; // ["shift1", "shift2", "shift3"]
  note?: string;
  customStartTime?: string; // Format: HH:mm
  customEndTime?: string; // Format: HH:mm
}

export interface IEmployeeSelfRegisterRequest {
  date: string; // Format: YYYY-MM-DD
  shifts: string[]; // ["shift1", "shift2", "shift3"]
  note?: string;
  customStartTime?: string; // Format: HH:mm
  customEndTime?: string; // Format: HH:mm
}

export interface IShiftInfo {
  name: string;
  startTime: string;
  endTime: string;
}

/** Query param: omit or non-compact → backend treats as full */
export type SalaryView = "compact" | "full";

/** Salary source tied to schedule (new backend) */
export type ScheduleSalarySource =
  | "global"
  | "probation"
  | "legacy_manual";

/** Legacy values may still appear during rollout */
export type LegacySalarySource =
  | "special"
  | "override"
  | "snapshot"
  | "fallback";

export type SalarySource = ScheduleSalarySource | LegacySalarySource;

export interface IHourlyBreakdownItem {
  hour: number;
  minutes: number;
  rate: number;
  amount: number;
}

export interface ISalaryResolution {
  mode: ScheduleSalarySource;
  specialBusinessDates: string[];
  probationHolidayMultiplier?: number;
  probationHolidayBoostSegments?: unknown[];
}

/** Compact: mainly source + capturedAt. Full: adds hourly maps and details. */
export interface IEmployeeScheduleSalarySnapshot {
  source?: "global" | "override" | "manual" | ScheduleSalarySource;
  capturedAt?: string;
  hourlyRateMap?: Record<string, number>;
  hourlyShiftMap?: Record<string, "shift1" | "shift2" | "shift3" | null>;
  syncedFromSnapshotRateMap?: Record<string, number>;
  syncedFromSnapshotShiftMap?: Record<
    string,
    "shift1" | "shift2" | "shift3" | null
  >;

  hourlyRate?: number;
  snapshotAt?: string;
  syncedFromSnapshot?: number;
}

export interface IEmployeeScheduleSalary {
  hourlyRate: number;
  hours: number;
  totalAmount: number;
  isPayable: boolean;
  hourlyBreakdown?: IHourlyBreakdownItem[];
}

export interface IEmployeeSchedule {
  _id: string;
  userId: string;
  userName?: string;
  userPhone?: string;
  user?: {
    _id: string;
    name?: string;
    full_name?: string;
    email?: string;
    phone_number?: string;
  };
  date: string;
  shift?:
    | "shift1"
    | "shift2"
    | "shift3"
    | "morning"
    | "afternoon"
    | "evening"
    | "all";
  shiftType?:
    | "shift1"
    | "shift2"
    | "shift3"
    | "morning"
    | "afternoon"
    | "evening"
    | "all";
  customStartTime?: string;
  customEndTime?: string;
  shiftInfo?: IShiftInfo;
  status: EmployeeScheduleStatus;
  salarySource?: SalarySource;
  salaryResolution?: ISalaryResolution;
  note?: string;
  createdBy?: string;
  createdByName?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedByName?: string;
  rejectedAt?: string;
  rejectedReason?: string;
  startedAt?: string;
  completedAt?: string;
  markedAbsentBy?: string;
  markedAbsentAt?: string;
  salarySnapshot?: IEmployeeScheduleSalarySnapshot;
  salary?: IEmployeeScheduleSalary;
  createdAt?: string;
  updatedAt?: string;
}

export interface IEmployeeSalarySnapshot {
  hourlyRate?: number;
  hourlyRateMap?: Record<string, number>;
  hourlyShiftMap?: Record<string, "shift1" | "shift2" | "shift3" | null>;
  createdAt?: string;
  updatedAt?: string;
}

export interface IEmployeeSalaryConfig {
  userId: string;
  userName?: string;
  userPhone?: string;
  hourlyRate: number;
  snapshotHourlyRate: number;
  /** Per-staff override removed — may no longer come from backend */
  isOverride?: boolean;
  updatedAt?: string;
}

export interface IEmployeeSalaryOverrideResult {
  userId: string;
  userName?: string;
  userPhone?: string;
  isOverride?: boolean;
  hourlyRate: number | null;
  hourlyRateMap?: Record<string, number>;
  syncedAt?: string;
  updatedAt?: string;
  updatedByName?: string;
}

export interface IUpdateEmployeeSalarySnapshotRequest {
  hourlyRateMap: Record<string, number>;
  hourlyShiftMap: Record<string, "shift1" | "shift2" | "shift3" | null>;
}

/** @deprecated Backend returns 410 — use special-days */
export interface IUpdateEmployeeSalaryOverrideRequest {
  hourlyRate: number;
}

export interface IEmployeeSchedulesSummary {
  totalDays: number;
  totalShifts: number;
  completed: number;
  inProgress: number;
  upcoming: number;
  totalSalary: number;
  totalDeductions?: number;
  deductionCount?: number;
  netSalary?: number;
  byStatus: {
    pending: number;
    approved: number;
    "in-progress": number;
    completed: number;
    absent: number;
    rejected: number;
    cancelled: number;
  };
}

export interface IEmployeeSchedulesResponse {
  schedulesByDate: Record<string, IEmployeeSchedule[]>;
  summary: IEmployeeSchedulesSummary;
}

export interface IGetEmployeeSchedulesParams {
  startDate?: string;
  endDate?: string;
  userId?: string;
  filterType?: "day" | "week" | "month";
  date?: string;
  status?: EmployeeScheduleStatus | string;
  shiftType?: string;
  salaryView?: SalaryView;
}

export interface ISalarySyncResult {
  totalStaffs: number;
  syncedCount: number;
  snapshotHourlyRateMap: Record<string, number>;
}

export interface ISpecialSalaryDay {
  _id: string;
  businessDate: string;
  hourlyAmountMap: Record<string, number>;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
  updatedByName?: string;
}

export interface IUpsertSpecialSalaryDayRequest {
  businessDate: string;
  hourlyAmountMap: Record<string, number>;
}

export interface IGetSpecialSalaryDaysParams {
  from?: string;
  to?: string;
}

const staffScheduleApis = {
  registerStaffSchedule: (data: IRegisterStaffScheduleRequest) =>
    http.post<HTTPResponse>("/employee-schedules/admin", data),
  registerMySchedule: (data: IEmployeeSelfRegisterRequest) =>
    http.post<HTTPResponse>("/employee-schedules", data),
  getEmployeeSchedules: (params?: IGetEmployeeSchedulesParams) =>
    http.get<HTTPResponse<IEmployeeSchedulesResponse>>("/employee-schedules", {
      params,
    }),
  getMySchedules: (params?: IGetEmployeeSchedulesParams) =>
    http.get<HTTPResponse<IEmployeeSchedulesResponse>>(
      "/employee-schedules/me",
      {
        params,
      },
    ),
  getScheduleById: (
    id: string,
    params?: { salaryView?: SalaryView },
  ) =>
    http.get<HTTPResponse<IEmployeeSchedule>>(`/employee-schedules/${id}`, {
      params,
    }),
  updateSchedule: (
    id: string,
    data: {
      note?: string;
      customStartTime?: string;
      customEndTime?: string;
    },
  ) => http.put<HTTPResponse>(`/employee-schedules/${id}`, data),
  updateScheduleStatus: (
    id: string,
    data: {
      status: EmployeeScheduleStatus;
      rejectedReason?: string;
    },
  ) => http.put<HTTPResponse>(`/employee-schedules/${id}/status`, data),
  deleteSchedule: (id: string) =>
    http.delete<HTTPResponse>(`/employee-schedules/${id}`),
  getSalarySnapshot: () =>
    http.get<HTTPResponse<IEmployeeSalarySnapshot>>(
      "/employee-schedules/salary/snapshot",
    ),
  updateSalarySnapshot: (data: IUpdateEmployeeSalarySnapshotRequest) =>
    http.put<HTTPResponse<IEmployeeSalarySnapshot>>(
      "/employee-schedules/salary/snapshot",
      data,
    ),
  syncSalarySnapshot: () =>
    http.post<HTTPResponse<ISalarySyncResult>>(
      "/employee-schedules/salary/sync",
    ),
  getSalaryEmployees: () =>
    http.get<HTTPResponse<IEmployeeSalaryConfig[]>>(
      "/employee-schedules/salary/employees",
    ),
  /** @deprecated Backend 410 — not used from UI */
  updateEmployeeSalaryOverride: (
    userId: string,
    data: IUpdateEmployeeSalaryOverrideRequest,
  ) =>
    http.put<HTTPResponse<IEmployeeSalaryOverrideResult>>(
      `/employee-schedules/salary/employees/${userId}`,
      data,
    ),
  /** @deprecated Backend 410 — not used from UI */
  deleteEmployeeSalaryOverride: (userId: string) =>
    http.delete<HTTPResponse<IEmployeeSalaryOverrideResult>>(
      `/employee-schedules/salary/employees/${userId}/override`,
    ),
  getSpecialSalaryDays: (params?: IGetSpecialSalaryDaysParams) =>
    http.get<HTTPResponse<ISpecialSalaryDay[]>>(
      "/employee-schedules/salary/special-days",
      { params },
    ),
  upsertSpecialSalaryDay: (data: IUpsertSpecialSalaryDayRequest) =>
    http.put<HTTPResponse<ISpecialSalaryDay>>(
      "/employee-schedules/salary/special-days",
      data,
    ),
  deleteSpecialSalaryDay: (businessDate: string) =>
    http.delete<HTTPResponse>(
      `/employee-schedules/salary/special-days/${encodeURIComponent(businessDate)}`,
    ),
};

export default staffScheduleApis;

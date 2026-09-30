import type {
  ApiResponse,
  CancelStaffErrorLogPayload,
  CreateStaffErrorLogPayload,
  CreateStaffErrorPresetPayload,
  StaffErrorLog,
  StaffErrorLogFilters,
  StaffErrorPreset,
  UpdateStaffErrorPresetPayload,
} from "@/@types/staffErrorLog";
import http from "@/utils/http";

const cleanParams = (params?: StaffErrorLogFilters) => {
  if (!params) return undefined;

  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== "")
  );
};

const staffErrorLogApis = {
  getPresets: (params?: { includeInactive?: boolean }) =>
    http.get<ApiResponse<StaffErrorPreset[]>>("/staff-error-logs/presets", {
      params,
    }),

  createPreset: (payload: CreateStaffErrorPresetPayload) =>
    http.post<ApiResponse<StaffErrorPreset>>("/staff-error-logs/presets", payload),

  updatePreset: (id: string, payload: UpdateStaffErrorPresetPayload) =>
    http.put<ApiResponse<StaffErrorPreset>>(
      `/staff-error-logs/presets/${id}`,
      payload
    ),

  deletePreset: (id: string) =>
    http.delete<ApiResponse<void>>(`/staff-error-logs/presets/${id}`),

  getLogs: (params?: StaffErrorLogFilters) =>
    http.get<ApiResponse<StaffErrorLog[]>>("/staff-error-logs", {
      params: cleanParams(params),
    }),

  getMyLogs: (params?: Omit<StaffErrorLogFilters, "userId">) =>
    http.get<ApiResponse<StaffErrorLog[]>>("/staff-error-logs/me", {
      params: cleanParams(params),
    }),

  getLogById: (id: string) =>
    http.get<ApiResponse<StaffErrorLog>>(`/staff-error-logs/${id}`),

  createLog: (payload: CreateStaffErrorLogPayload) =>
    http.post<ApiResponse<StaffErrorLog>>("/staff-error-logs", payload),

  cancelLog: (id: string, payload: CancelStaffErrorLogPayload) =>
    http.post<ApiResponse<StaffErrorLog>>(
      `/staff-error-logs/${id}/cancel`,
      payload
    ),
};

export default staffErrorLogApis;

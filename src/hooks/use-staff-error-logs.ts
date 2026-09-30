import { StaffErrorLogFilters } from "@/@types/staffErrorLog";
import staffErrorLogApis from "@/apis/staffErrorLog.apis";
import { toast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";

const extractErrorMessage = (error: unknown) => {
  const axiosError = error as AxiosError<{ message?: string }>;
  return (
    axiosError?.response?.data?.message ||
    (error instanceof Error ? error.message : "Có lỗi xảy ra")
  );
};

export const staffErrorLogQueryKeys = {
  presets: ["staff-error-presets"] as const,
  logs: (filters?: StaffErrorLogFilters) => ["staff-error-logs", filters] as const,
  myLogs: (filters?: Omit<StaffErrorLogFilters, "userId">) =>
    ["my-staff-error-logs", filters] as const,
};

export const useStaffErrorPresets = (includeInactive = false) => {
  return useQuery({
    queryKey: [...staffErrorLogQueryKeys.presets, includeInactive],
    queryFn: () => staffErrorLogApis.getPresets({ includeInactive }),
    select: (response) => response.data.result || [],
  });
};

export const useStaffErrorLogs = (filters?: StaffErrorLogFilters) => {
  return useQuery({
    queryKey: staffErrorLogQueryKeys.logs(filters),
    queryFn: () => staffErrorLogApis.getLogs(filters),
    select: (response) => response.data.result || [],
  });
};

export const useMyStaffErrorLogs = (
  filters?: Omit<StaffErrorLogFilters, "userId">
) => {
  return useQuery({
    queryKey: staffErrorLogQueryKeys.myLogs(filters),
    queryFn: () => staffErrorLogApis.getMyLogs(filters),
    select: (response) => response.data.result || [],
  });
};

export const useStaffErrorLogMutations = () => {
  const queryClient = useQueryClient();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["staff-error-logs"] });
    queryClient.invalidateQueries({ queryKey: ["my-staff-error-logs"] });
    queryClient.invalidateQueries({ queryKey: ["staff-error-presets"] });
  };

  const createLog = useMutation({
    mutationFn: staffErrorLogApis.createLog,
    onSuccess: () => {
      toast({ title: "Thành công", description: "Đã ghi log lỗi nhân viên" });
      invalidateAll();
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: extractErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const cancelLog = useMutation({
    mutationFn: ({ id, cancelReason }: { id: string; cancelReason?: string }) =>
      staffErrorLogApis.cancelLog(id, { cancelReason }),
    onSuccess: () => {
      toast({ title: "Thành công", description: "Đã hủy log lỗi" });
      invalidateAll();
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: extractErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const createPreset = useMutation({
    mutationFn: staffErrorLogApis.createPreset,
    onSuccess: () => {
      toast({ title: "Thành công", description: "Đã tạo preset lỗi" });
      invalidateAll();
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: extractErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const updatePreset = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Parameters<typeof staffErrorLogApis.updatePreset>[1];
    }) => staffErrorLogApis.updatePreset(id, payload),
    onSuccess: () => {
      toast({ title: "Thành công", description: "Đã cập nhật preset lỗi" });
      invalidateAll();
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: extractErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const deletePreset = useMutation({
    mutationFn: staffErrorLogApis.deletePreset,
    onSuccess: () => {
      toast({ title: "Thành công", description: "Đã xóa preset lỗi" });
      invalidateAll();
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: extractErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  return {
    createLog: createLog.mutate,
    cancelLog: cancelLog.mutate,
    createPreset: createPreset.mutate,
    updatePreset: updatePreset.mutate,
    deletePreset: deletePreset.mutate,
    isCreatingLog: createLog.isPending,
    isCancellingLog: cancelLog.isPending,
    isSavingPreset: createPreset.isPending || updatePreset.isPending,
    isDeletingPreset: deletePreset.isPending,
  };
};

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import staffScheduleApis from "@/apis/staffSchedule.apis";
import { IEmployeeSchedule } from "@/apis/staffSchedule.apis";
import { EmployeeScheduleStatus } from "@/constants/enum";
import dayjs from "dayjs";
import { format } from "date-fns";
import { AlertTriangle } from "lucide-react";
import { useIsAdmin, useIsStaff } from "@/hooks/usePermission";
import useAuth from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface StaffScheduleDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: IEmployeeSchedule | null;
  refetchSchedules?: () => void;
  /** My Schedule page: allow employee to withdraw a pending registration within 1 hour */
  allowEmployeeSelfDelete?: boolean;
}

const ONE_HOUR_MS = 60 * 60 * 1000;

const canEmployeeDeleteRegistration = (
  s: {
    status: string;
    createdAt?: string;
    userId: string;
  },
  currentUserId: string | undefined,
) =>
  !!currentUserId &&
  s.userId === currentUserId &&
  s.status === EmployeeScheduleStatus.Pending &&
  !!s.createdAt &&
  Date.now() - new Date(s.createdAt).getTime() <= ONE_HOUR_MS;

const normalizeTimeValue = (time?: string) => (time ? time.slice(0, 5) : "");

const getDefaultShiftTimeRange = (shift?: string) => {
  if (shift === "shift1" || shift === "morning") {
    return { startTime: "09:00", endTime: "14:00" };
  }

  if (shift === "shift2" || shift === "afternoon" || shift === "evening") {
    return { startTime: "14:00", endTime: "19:00" };
  }

  if (shift === "shift3" || shift === "all") {
    return { startTime: "19:00", endTime: "01:00" };
  }

  return { startTime: "", endTime: "" };
};

const getScheduleTimeRange = (schedule: IEmployeeSchedule) => {
  const shiftRange = getDefaultShiftTimeRange(
    schedule.shift || schedule.shiftType,
  );

  return {
    startTime:
      normalizeTimeValue(schedule.customStartTime) ||
      normalizeTimeValue(schedule.shiftInfo?.startTime) ||
      shiftRange.startTime,
    endTime:
      normalizeTimeValue(schedule.customEndTime) ||
      normalizeTimeValue(schedule.shiftInfo?.endTime) ||
      shiftRange.endTime,
  };
};

const getSnapshotCapturedAt = (schedule: IEmployeeSchedule) =>
  schedule.salarySnapshot?.capturedAt || schedule.salarySnapshot?.snapshotAt;

const getCurrentHourlyRate = (schedule: IEmployeeSchedule): number | null => {
  if (typeof schedule.salary?.hourlyRate === "number") {
    return schedule.salary.hourlyRate;
  }

  if (typeof schedule.salarySnapshot?.hourlyRate === "number") {
    return schedule.salarySnapshot.hourlyRate;
  }

  return null;
};

const getSalarySourceLabel = (
  salarySource?: IEmployeeSchedule["salarySource"],
) => {
  switch (salarySource) {
    case "global":
      return "Bản lưu mức lương chung";
    case "probation":
      return "Thử việc";
    case "legacy_manual":
      return "Nhập thủ công (cũ)";
    case "special":
      return "Mức đặc biệt của ca";
    case "override":
      return "Mức riêng của nhân viên";
    case "snapshot":
      return "Bản lưu của ca";
    case "fallback":
      return "Mặc định hệ thống";
    default:
      return "Không xác định";
  }
};

const modeLabel = (mode?: string) => {
  switch (mode) {
    case "global":
      return "Chung";
    case "probation":
      return "Thử việc";
    case "legacy_manual":
      return "Cũ / thủ công";
    default:
      return mode || "—";
  }
};

const StaffScheduleDetailModal: React.FC<StaffScheduleDetailModalProps> = ({
  isOpen,
  onClose,
  schedule,
  refetchSchedules,
  allowEmployeeSelfDelete = false,
}) => {
  const queryClient = useQueryClient();
  const isAdmin = useIsAdmin();
  const isStaff = useIsStaff();
  const { user } = useAuth();
  const [rejectedReason, setRejectedReason] = useState("");

  const [adjustedStartTime, setAdjustedStartTime] = useState("");
  const [adjustedEndTime, setAdjustedEndTime] = useState("");
  const [adjustTimeError, setAdjustTimeError] = useState("");
  const [adjustedNote, setAdjustedNote] = useState("");

  const { data: scheduleFull, isFetching: isLoadingDetail } = useQuery({
    queryKey: ["schedule-detail-modal", schedule?._id, "full"],
    queryFn: async () => {
      const response = await staffScheduleApis.getScheduleById(schedule!._id, {
        salaryView: "full",
      });
      return response.data.result as IEmployeeSchedule;
    },
    enabled: isOpen && !!schedule?._id,
  });

  const displaySchedule = scheduleFull ?? schedule!;

  useEffect(() => {
    if (!schedule) return;
    const base = scheduleFull ?? schedule;
    const scheduleTimeRange = getScheduleTimeRange(base);

    setRejectedReason("");
    setAdjustedStartTime(scheduleTimeRange.startTime);
    setAdjustedEndTime(scheduleTimeRange.endTime);
    setAdjustedNote(base.note || "");
    setAdjustTimeError("");
  }, [schedule, scheduleFull]);

  const { mutate: updateSchedule, isPending } = useMutation({
    mutationFn: (data: {
      customStartTime?: string;
      customEndTime?: string;
      note?: string;
    }) => staffScheduleApis.updateSchedule(schedule!._id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staffSchedules"] });
      queryClient.invalidateQueries({ queryKey: ["mySchedules"] });
      queryClient.invalidateQueries({ queryKey: ["staff-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["schedule-detail"] });
      queryClient.invalidateQueries({
        queryKey: ["schedule-detail-modal", schedule!._id],
      });
      toast({
        title: "Thành công",
        description: "Cập nhật lịch làm việc thành công",
      });
      setRejectedReason("");
      refetchSchedules?.();
    },
    onError: (error: unknown) => {
      const axiosError = error as {
        response?: {
          data?: {
            message?: string;
          };
        };
        message?: string;
      };
      toast({
        title: "Lỗi",
        description:
          axiosError?.response?.data?.message ||
          axiosError?.message ||
          "Không thể cập nhật lịch làm việc",
        variant: "destructive",
      });
    },
  });

  const { mutate: updateScheduleStatus, isPending: isUpdatingStatus } =
    useMutation({
      mutationFn: (data: {
        status: EmployeeScheduleStatus;
        rejectedReason?: string;
      }) => staffScheduleApis.updateScheduleStatus(schedule!._id, data),
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries({ queryKey: ["staffSchedules"] });
        queryClient.invalidateQueries({ queryKey: ["mySchedules"] });
        queryClient.invalidateQueries({ queryKey: ["staff-schedules"] });
        queryClient.invalidateQueries({ queryKey: ["schedule-detail"] });
        queryClient.invalidateQueries({
          queryKey: ["schedule-detail-modal", schedule!._id],
        });
        toast({
          title: "Thành công",
          description: "Cập nhật trạng thái ca thành công",
        });
        setRejectedReason("");
        refetchSchedules?.();
        if (variables.status === EmployeeScheduleStatus.Completed) {
          onClose();
        }
      },
      onError: (error: unknown) => {
        const axiosError = error as {
          response?: {
            data?: {
              message?: string;
            };
          };
          message?: string;
        };
        toast({
          title: "Lỗi",
          description:
            axiosError?.response?.data?.message ||
            axiosError?.message ||
            "Không thể cập nhật trạng thái ca",
          variant: "destructive",
        });
      },
    });

  const { mutate: deleteSchedule, isPending: isDeleting } = useMutation({
    mutationFn: () => staffScheduleApis.deleteSchedule(schedule!._id),
    onSuccess: () => {
      const deletedId = schedule!._id;
      // Drop detail cache for this id — do not invalidate (refetch would GET a deleted row → 404).
      queryClient.removeQueries({
        queryKey: ["schedule-detail-modal", deletedId],
      });
      queryClient.removeQueries({
        queryKey: ["schedule-detail", deletedId],
      });
      queryClient.invalidateQueries({ queryKey: ["staffSchedules"] });
      queryClient.invalidateQueries({ queryKey: ["mySchedules"] });
      queryClient.invalidateQueries({ queryKey: ["staff-schedules"] });
      toast({
        title: "Thành công",
        description: "Đã xóa lịch làm việc.",
      });
      refetchSchedules?.();
      onClose();
    },
    onError: (error: unknown) => {
      const axiosError = error as {
        response?: {
          data?: {
            message?: string;
          };
        };
        message?: string;
      };
      toast({
        title: "Lỗi",
        description:
          axiosError?.response?.data?.message ||
          axiosError?.message ||
          "Không thể hủy lịch làm việc",
        variant: "destructive",
      });
    },
  });

  const calculateWorkingMinutes = (
    startTime: string,
    endTime: string,
  ): number | null => {
    if (!startTime || !endTime) return null;

    const [startHours, startMinutes] = startTime.split(":").map(Number);
    const [endHours, endMinutes] = endTime.split(":").map(Number);

    const startTotal = startHours * 60 + startMinutes;
    const endTotal = endHours * 60 + endMinutes;
    const normalizedEndTotal =
      endTotal < startTotal ? endTotal + 24 * 60 : endTotal;

    if (startTotal >= normalizedEndTotal) return null;

    return normalizedEndTotal - startTotal;
  };

  const validateAdjustedTime = (
    startTime: string,
    endTime: string,
  ): boolean => {
    if (!startTime || !endTime) {
      setAdjustTimeError("");
      return true;
    }

    const [startHours, startMinutes] = startTime.split(":").map(Number);
    const [endHours, endMinutes] = endTime.split(":").map(Number);

    const startTotal = startHours * 60 + startMinutes;
    const endTotal = endHours * 60 + endMinutes;
    const normalizedEndTotal =
      endTotal < startTotal ? endTotal + 24 * 60 : endTotal;

    if (startTotal >= normalizedEndTotal) {
      setAdjustTimeError("Giờ bắt đầu phải trước giờ kết thúc.");
      return false;
    }

    setAdjustTimeError("");
    return true;
  };

  const handleAdjustedStartTimeChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = e.target.value;
    setAdjustedStartTime(value);
    if (adjustedEndTime) {
      validateAdjustedTime(value, adjustedEndTime);
    }
  };

  const handleAdjustedEndTimeChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = e.target.value;
    setAdjustedEndTime(value);
    if (adjustedStartTime) {
      validateAdjustedTime(adjustedStartTime, value);
    }
  };

  const handleUpdateScheduleInfo = () => {
    if (!schedule) return;

    if (adjustedStartTime && adjustedEndTime) {
      if (!validateAdjustedTime(adjustedStartTime, adjustedEndTime)) {
        return;
      }
    }

    const updateData: {
      customStartTime?: string;
      customEndTime?: string;
      note?: string;
    } = {};

    if (adjustedStartTime) {
      updateData.customStartTime = adjustedStartTime;
    } else {
      updateData.customStartTime = undefined;
    }

    if (adjustedEndTime) {
      updateData.customEndTime = adjustedEndTime;
    } else {
      updateData.customEndTime = undefined;
    }

    if (adjustedNote !== displaySchedule.note) {
      updateData.note = adjustedNote || undefined;
    }

    updateSchedule(updateData);
  };

  const handleCancel = () => {
    if (!schedule) return;
    deleteSchedule();
  };

  const handleApprove = () => {
    if (!schedule) return;
    updateScheduleStatus({
      status: EmployeeScheduleStatus.Approved,
    });
  };

  const handleReject = () => {
    if (!schedule) return;
    updateScheduleStatus({
      status: EmployeeScheduleStatus.Rejected,
      rejectedReason: rejectedReason || undefined,
    });
  };

  const handleStart = () => {
    if (!schedule) return;
    updateScheduleStatus({
      status: EmployeeScheduleStatus.InProgress,
    });
  };

  const handleComplete = () => {
    if (!schedule) return;
    updateScheduleStatus({
      status: EmployeeScheduleStatus.Completed,
    });
  };

  const handleMarkAbsent = () => {
    if (!schedule) return;
    updateScheduleStatus({
      status: EmployeeScheduleStatus.Absent,
    });
  };

  if (!schedule) return null;

  const scheduleTimeRange = getScheduleTimeRange(displaySchedule);

  const isPastSchedule = displaySchedule.date
    ? dayjs(displaySchedule.date).isBefore(dayjs(), "day")
    : false;

  const canCancel =
    !isStaff &&
    (displaySchedule.status === EmployeeScheduleStatus.Pending ||
      displaySchedule.status === EmployeeScheduleStatus.Approved);
  const canApprove =
    displaySchedule.status === EmployeeScheduleStatus.Pending && !isStaff;
  const canReject =
    !isStaff &&
    (displaySchedule.status === EmployeeScheduleStatus.Pending ||
      displaySchedule.status === EmployeeScheduleStatus.Approved);
  const canStart =
    !isStaff && displaySchedule.status === EmployeeScheduleStatus.Approved;
  const canComplete =
    displaySchedule.status === EmployeeScheduleStatus.InProgress;
  const canMarkAbsent =
    displaySchedule.status === EmployeeScheduleStatus.InProgress;
  const canDelete = !isStaff && (!isPastSchedule || isAdmin);
  const canEmployeeSelfUnregister =
    allowEmployeeSelfDelete &&
    canEmployeeDeleteRegistration(displaySchedule, user?._id);
  const isReadOnly =
    displaySchedule.status === EmployeeScheduleStatus.Cancelled ||
    displaySchedule.status === EmployeeScheduleStatus.Absent ||
    displaySchedule.status === EmployeeScheduleStatus.Rejected;

  const getStatusLabel = (status: EmployeeScheduleStatus) => {
    switch (status) {
      case EmployeeScheduleStatus.Pending:
        return "Chờ duyệt";
      case EmployeeScheduleStatus.Approved:
        return "Đã duyệt";
      case EmployeeScheduleStatus.InProgress:
        return "Đang làm";
      case EmployeeScheduleStatus.Completed:
        return "Hoàn thành";
      case EmployeeScheduleStatus.Rejected:
        return "Đã từ chối";
      case EmployeeScheduleStatus.Cancelled:
        return "Đã hủy";
      case EmployeeScheduleStatus.Absent:
        return "Vắng mặt";
      default:
        return status;
    }
  };

  const getShiftLabel = (shift?: string) => {
    if (shift === "shift1" || shift === "morning")
      return "Ca 1 (09:00 - 14:00)";
    if (shift === "shift2" || shift === "afternoon" || shift === "evening")
      return "Ca 2 (14:00 - 19:00)";
    if (shift === "shift3" || shift === "all") return "Ca 3 (19:00 - 01:00)";
    return shift || "N/A";
  };

  const formatCurrency = (value: number) =>
    `${value.toLocaleString("en-US")} VND`;

  const getHourlyRate = () => getCurrentHourlyRate(displaySchedule) ?? 22000;

  const capturedAt = getSnapshotCapturedAt(displaySchedule);
  const resolution = displaySchedule.salaryResolution;
  const salary = displaySchedule.salary;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:max-w-4xl lg:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chi tiết ca làm việc</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isPastSchedule && isAdmin && (
            <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Bạn đang chỉnh sửa dữ liệu ca làm trong quá khứ. Hãy kiểm tra kỹ
                trước khi lưu thay đổi.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-semibold text-gray-500">
                Tên nhân viên
              </Label>
              <p className="mt-1">
                {displaySchedule.userName ||
                  displaySchedule.user?.name ||
                  displaySchedule.user?.full_name ||
                  "N/A"}
              </p>
            </div>
            <div>
              <Label className="text-sm font-semibold text-gray-500">
                Trạng thái
              </Label>
              <p className="mt-1 font-medium">
                {getStatusLabel(displaySchedule.status)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-semibold text-gray-500">
                Ngày
              </Label>
              <p className="mt-1">
                {displaySchedule.date
                  ? format(dayjs(displaySchedule.date).toDate(), "dd/MM/yyyy")
                  : "N/A"}
              </p>
            </div>
            <div>
              <Label className="text-sm font-semibold text-gray-500">
                Ca làm
              </Label>
              <p className="mt-1">
                {getShiftLabel(
                  displaySchedule.shift || displaySchedule.shiftType,
                )}
              </p>
            </div>
          </div>

          <div>
            <Label className="text-sm font-semibold text-gray-500">
              Nguồn lương
            </Label>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                {getSalarySourceLabel(displaySchedule.salarySource)}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {displaySchedule.salarySource || "—"}
              </span>
              {isLoadingDetail && (
                <span className="text-xs text-muted-foreground">
                  Đang tải chi tiết lương…
                </span>
              )}
            </div>
          </div>

          {isAdmin && resolution && (
            <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-2">
              <div>
                <span className="font-medium text-gray-600">
                  Chế độ tính lương:{" "}
                </span>
                <span>{modeLabel(resolution.mode)}</span>
              </div>
              {resolution.specialBusinessDates?.length ? (
                <div>
                  <span className="font-medium text-gray-600">
                    Ngày có lương đặc biệt:{" "}
                  </span>
                  <span>{resolution.specialBusinessDates.join(", ")}</span>
                </div>
              ) : null}
              {resolution.mode === "probation" && (
                <>
                  {typeof resolution.probationHolidayMultiplier ===
                    "number" && (
                    <div>
                      <span className="font-medium text-gray-600">
                        Hệ số lương ngày lễ khi thử việc:{" "}
                      </span>
                      <span>{resolution.probationHolidayMultiplier}</span>
                    </div>
                  )}
                  {Array.isArray(resolution.probationHolidayBoostSegments) &&
                    resolution.probationHolidayBoostSegments.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium text-gray-600">
                          Các khoảng tăng lương:{" "}
                        </span>
                        <pre className="mt-1 max-h-24 overflow-auto rounded bg-background p-2">
                          {JSON.stringify(
                            resolution.probationHolidayBoostSegments,
                            null,
                            2,
                          )}
                        </pre>
                      </div>
                    )}
                </>
              )}
            </div>
          )}

          {isAdmin && salary && (
            <div className="rounded-md border p-3 space-y-1">
              <Label className="text-sm font-semibold text-gray-500">
                Lương dự kiến
              </Label>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  Số giờ: <span className="font-medium">{salary.hours}</span>
                </div>
                <div>
                  Lương theo giờ:{" "}
                  <span className="font-medium">
                    {formatCurrency(salary.hourlyRate)}
                  </span>
                </div>
                <div>
                  Tổng:{" "}
                  <span className="font-semibold text-green-700">
                    {formatCurrency(salary.totalAmount)}
                  </span>
                </div>
                <div>
                  Được trả lương:{" "}
                  <Badge variant={salary.isPayable ? "default" : "secondary"}>
                    {salary.isPayable ? "Có" : "Không"}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {isAdmin &&
            salary?.hourlyBreakdown &&
            salary.hourlyBreakdown.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-500">
                  Chi tiết theo giờ
                </Label>
                <div className="rounded-md border max-h-[220px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Khung giờ</TableHead>
                        <TableHead>Số phút</TableHead>
                        <TableHead>Đơn giá</TableHead>
                        <TableHead className="text-right">Thành tiền</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salary.hourlyBreakdown.map((row, idx) => (
                        <TableRow key={`${row.hour}-${idx}`}>
                          <TableCell>{row.hour}</TableCell>
                          <TableCell>{row.minutes}</TableCell>
                          <TableCell>{formatCurrency(row.rate)}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(row.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

          {isAdmin && displaySchedule.salarySnapshot && (
            <div className="rounded-md border bg-green-50 p-3 space-y-2">
              <Label className="text-sm font-semibold text-gray-500">
                Bản lưu lương khi tạo ca
              </Label>
              {displaySchedule.salarySnapshot.source != null && (
                <p className="text-sm">
                  Nguồn bản lưu:{" "}
                  <span className="font-medium">
                    {String(displaySchedule.salarySnapshot.source)}
                  </span>
                </p>
              )}
              {capturedAt && (
                <p className="text-xs text-gray-600">
                  Lưu lúc{" "}
                  {format(dayjs(capturedAt).toDate(), "dd/MM/yyyy HH:mm")}
                </p>
              )}
              {isAdmin &&
                displaySchedule.salarySnapshot.hourlyRateMap &&
                Object.keys(displaySchedule.salarySnapshot.hourlyRateMap)
                  .length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Bảng lương theo giờ đã được lưu — chỉnh sửa tại cấu hình lương chung hoặc ngày đặc biệt.
                  </p>
                )}
            </div>
          )}

          <div className="border-t pt-4">
            <Label className="text-sm font-semibold text-gray-500 mb-2 block">
              {isReadOnly || isStaff
                ? "Giờ làm việc"
                : "Điều chỉnh giờ làm việc"}
            </Label>
            {isReadOnly || isStaff ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-500">
                      Giờ bắt đầu (HH:mm)
                    </Label>
                    <p className="mt-1 font-medium">
                      {scheduleTimeRange.startTime || "Chưa đặt"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">
                      Giờ kết thúc (HH:mm)
                    </Label>
                    <p className="mt-1 font-medium">
                      {scheduleTimeRange.endTime || "Chưa đặt"}
                    </p>
                  </div>
                </div>

                {scheduleTimeRange.startTime && scheduleTimeRange.endTime && (
                  <div className="bg-blue-50 p-3 rounded-md space-y-1">
                    {(() => {
                      const minutes = calculateWorkingMinutes(
                        scheduleTimeRange.startTime,
                        scheduleTimeRange.endTime,
                      );
                      if (minutes === null) return null;
                      const hours = Math.floor(minutes / 60);
                      const mins = minutes % 60;
                      const hourlyRate = getHourlyRate();
                      const est = (minutes / 60) * hourlyRate;

                      return (
                        <>
                          <div className="text-sm">
                            <span className="text-gray-600">
                              Tổng thời gian:{" "}
                            </span>
                            <span className="font-semibold">
                              {hours > 0 && `${hours} giờ `}
                              {mins > 0 && `${mins} phút`}
                              {hours === 0 && mins === 0 && "0 phút"}
                            </span>
                            <span className="text-gray-500 ml-2">
                              ({minutes} phút)
                            </span>
                          </div>
                          <div className="text-sm">
                            <span className="text-gray-600">Ước tính: </span>
                            <span className="font-semibold text-green-600">
                              {formatCurrency(est)}
                            </span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-500">
                      Giờ bắt đầu (HH:mm)
                    </Label>
                    <Input
                      type="time"
                      value={adjustedStartTime}
                      onChange={handleAdjustedStartTimeChange}
                      className="mt-1"
                      placeholder="08:00"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">
                      Giờ kết thúc (HH:mm)
                    </Label>
                    <Input
                      type="time"
                      value={adjustedEndTime}
                      onChange={handleAdjustedEndTimeChange}
                      className="mt-1"
                      placeholder="17:00"
                    />
                  </div>
                </div>
                {adjustTimeError && (
                  <p className="text-sm text-red-500">{adjustTimeError}</p>
                )}

                {adjustedStartTime && adjustedEndTime && !adjustTimeError && (
                  <div className="bg-blue-50 p-3 rounded-md space-y-1">
                    {(() => {
                      const minutes = calculateWorkingMinutes(
                        adjustedStartTime,
                        adjustedEndTime,
                      );
                      if (minutes === null) return null;
                      const hours = Math.floor(minutes / 60);
                      const mins = minutes % 60;
                      const hourlyRate = getHourlyRate();
                      const est = (minutes / 60) * hourlyRate;

                      return (
                        <>
                          <div className="text-sm">
                            <span className="text-gray-600">
                              Tổng thời gian:{" "}
                            </span>
                            <span className="font-semibold">
                              {hours > 0 && `${hours} giờ `}
                              {mins > 0 && `${mins} phút`}
                              {hours === 0 && mins === 0 && "0 phút"}
                            </span>
                            <span className="text-gray-500 ml-2">
                              ({minutes} phút)
                            </span>
                          </div>
                          <div className="text-sm">
                            <span className="text-gray-600">Ước tính: </span>
                            <span className="font-semibold text-green-600">
                              {formatCurrency(est)}
                            </span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                <div>
                  <Label htmlFor="adjustedNote">Ghi chú</Label>
                  <Textarea
                    id="adjustedNote"
                    placeholder="Nhập ghi chú…"
                    value={adjustedNote}
                    onChange={(e) => setAdjustedNote(e.target.value)}
                    className="mt-1 resize-none"
                    rows={3}
                  />
                </div>
              </div>
            )}
          </div>

          {displaySchedule.status === EmployeeScheduleStatus.Rejected &&
            displaySchedule.rejectedReason && (
              <div>
                <Label className="text-sm font-semibold text-gray-500">
                  Lý do từ chối
                </Label>
                <p className="mt-1 text-sm">{displaySchedule.rejectedReason}</p>
              </div>
            )}
          {displaySchedule.status !== EmployeeScheduleStatus.Rejected &&
            displaySchedule.note && (
              <div>
                <Label className="text-sm font-semibold text-gray-500">
                  Ghi chú
                </Label>
                <p className="mt-1 text-sm">{displaySchedule.note}</p>
              </div>
            )}

          <div className="border-t pt-4 space-y-2">
            {displaySchedule.createdByName && (
              <div className="text-sm">
                <span className="text-gray-500">Người tạo: </span>
                <span>{displaySchedule.createdByName}</span>
                {displaySchedule.createdAt && (
                  <span className="text-gray-400 ml-2">
                    (
                    {format(
                      dayjs(displaySchedule.createdAt).toDate(),
                      "dd/MM/yyyy HH:mm",
                    )}
                    )
                  </span>
                )}
              </div>
            )}
            {displaySchedule.approvedByName && (
              <div className="text-sm">
                <span className="text-gray-500">Người duyệt: </span>
                <span>{displaySchedule.approvedByName}</span>
                {displaySchedule.approvedAt && (
                  <span className="text-gray-400 ml-2">
                    (
                    {format(
                      dayjs(displaySchedule.approvedAt).toDate(),
                      "dd/MM/yyyy HH:mm",
                    )}
                    )
                  </span>
                )}
              </div>
            )}
            {displaySchedule.startedAt && (
              <div className="text-sm">
                <span className="text-gray-500">Bắt đầu lúc: </span>
                <span>
                  {format(
                    dayjs(displaySchedule.startedAt).toDate(),
                    "dd/MM/yyyy HH:mm",
                  )}
                </span>
              </div>
            )}
            {displaySchedule.completedAt && (
              <div className="text-sm">
                <span className="text-gray-500">Hoàn thành lúc: </span>
                <span>
                  {format(
                    dayjs(displaySchedule.completedAt).toDate(),
                    "dd/MM/yyyy HH:mm",
                  )}
                </span>
              </div>
            )}
            {displaySchedule.markedAbsentBy && (
              <div className="text-sm">
                <span className="text-gray-500">Người đánh dấu vắng mặt: </span>
                <span>{displaySchedule.markedAbsentBy}</span>
                {displaySchedule.markedAbsentAt && (
                  <span className="text-gray-400 ml-2">
                    (
                    {format(
                      dayjs(displaySchedule.markedAbsentAt).toDate(),
                      "dd/MM/yyyy HH:mm",
                    )}
                    )
                  </span>
                )}
              </div>
            )}
          </div>

          {canReject && !isReadOnly && (
            <div>
              <Label htmlFor="rejectedReason">Lý do từ chối</Label>
              <Textarea
                id="rejectedReason"
                placeholder="Nhập lý do từ chối..."
                value={rejectedReason}
                onChange={(e) => setRejectedReason(e.target.value)}
                className="mt-1 resize-none"
                rows={3}
              />
            </div>
          )}
        </div>

        {canEmployeeSelfUnregister && (
          <p className="text-sm text-muted-foreground border-t pt-3">
            Bạn có thể rút đăng ký này trong vòng 1 giờ sau khi gửi.
          </p>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isPending || isDeleting || isUpdatingStatus}
          >
            Đóng
          </Button>
          {!isReadOnly && !isStaff && (
            <Button
              onClick={handleUpdateScheduleInfo}
              disabled={
                isPending ||
                isDeleting ||
                isUpdatingStatus ||
                !!adjustTimeError ||
                isLoadingDetail
              }
            >
              Cập nhật
            </Button>
          )}
          {canApprove && (
            <Button
              onClick={handleApprove}
              disabled={isPending || isDeleting || isUpdatingStatus}
            >
              Duyệt
            </Button>
          )}
          {canReject && (
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isPending || isDeleting || isUpdatingStatus}
            >
              Từ chối
            </Button>
          )}
          {canStart && (
            <Button
              onClick={handleStart}
              disabled={isPending || isDeleting || isUpdatingStatus}
            >
              Bắt đầu
            </Button>
          )}
          {canComplete && (
            <Button
              onClick={handleComplete}
              disabled={isPending || isDeleting || isUpdatingStatus}
            >
              Hoàn thành
            </Button>
          )}
          {canMarkAbsent && (
            <Button
              variant="destructive"
              onClick={handleMarkAbsent}
              disabled={isPending || isDeleting || isUpdatingStatus}
            >
              Đánh dấu vắng mặt
            </Button>
          )}
          {canCancel && (
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={isPending || isDeleting || isUpdatingStatus}
            >
              Hủy ca
            </Button>
          )}
          {canEmployeeSelfUnregister && (
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={isPending || isDeleting || isUpdatingStatus}
            >
              Rút đăng ký
            </Button>
          )}
          {canDelete && (
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={isPending || isDeleting || isUpdatingStatus}
            >
              Xóa
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StaffScheduleDetailModal;

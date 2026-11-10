import { IEmployeeSchedule } from "@/apis/staffSchedule.apis";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmployeeScheduleStatus } from "@/constants/enum";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Dayjs } from "dayjs";
import { CalendarIcon, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface DateSchedulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Dayjs;
  schedules: IEmployeeSchedule[];
  onScheduleClick: (schedule: IEmployeeSchedule) => void;
  onRegisterNew: () => void;
}

const DateSchedulesModal: React.FC<DateSchedulesModalProps> = ({
  isOpen,
  onClose,
  date,
  schedules,
  onScheduleClick,
  onRegisterNew,
}) => {
  const getStatusColor = (status: EmployeeScheduleStatus) => {
    switch (status) {
      case EmployeeScheduleStatus.Approved:
        return "bg-blue-100 text-blue-800 border-blue-200";
      case EmployeeScheduleStatus.InProgress:
        return "bg-purple-100 text-purple-800 border-purple-200";
      case EmployeeScheduleStatus.Completed:
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case EmployeeScheduleStatus.Pending:
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case EmployeeScheduleStatus.Rejected:
      case EmployeeScheduleStatus.Cancelled:
        return "bg-red-100 text-red-800 border-red-200";
      case EmployeeScheduleStatus.Absent:
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

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
      case EmployeeScheduleStatus.Absent:
        return "Vắng mặt";
      case EmployeeScheduleStatus.Rejected:
        return "Đã từ chối";
      case EmployeeScheduleStatus.Cancelled:
        return "Đã hủy";
      default:
        return status;
    }
  };

  const getShiftLabel = (schedule: IEmployeeSchedule) => {
    const shift = schedule.shift || schedule.shiftType;
    if (schedule.customStartTime && schedule.customEndTime) {
      return `${schedule.customStartTime} - ${schedule.customEndTime}`;
    }
    if (shift === "shift1" || shift === "morning")
      return "Ca 1 (09:00 - 14:00)";
    if (shift === "shift2" || shift === "afternoon" || shift === "evening")
      return "Ca 2 (14:00 - 19:00)";
    if (shift === "shift3" || shift === "all") return "Ca 3 (19:00 - 01:00)";
    return shift || "Ca tùy chỉnh";
  };

  const getShiftBadgeColor = (schedule: IEmployeeSchedule) => {
    const shift = schedule.shift || schedule.shiftType;
    if (shift === "shift1" || shift === "morning")
      return "bg-orange-100 text-orange-800";
    if (shift === "shift2" || shift === "afternoon" || shift === "evening")
      return "bg-indigo-100 text-indigo-800";
    if (shift === "shift3" || shift === "all")
      return "bg-green-100 text-green-800";
    return "bg-gray-100 text-gray-800";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="overflow-y-auto overscroll-y-contain pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:max-w-2xl sm:pt-6 sm:pb-6">
        <DialogHeader className="pr-8">
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Lịch làm việc ngày{" "}
            {format(date.toDate(), "dd/MM/yyyy", { locale: vi })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {schedules.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                Chưa có ca làm việc trong ngày này
              </p>
              <Button onClick={onRegisterNew} className="gap-2">
                <Plus className="h-4 w-4" />
                Đăng ký ca
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  Tổng cộng {schedules.length} ca
                  {schedules.length >= 2 && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      (đã đạt số ca tối đa)
                    </span>
                  )}
                </p>
                {schedules.length < 2 && (
                  <Button
                    onClick={onRegisterNew}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Đăng ký thêm ca
                  </Button>
                )}
              </div>

              <div className="space-y-3">
                {schedules.map((schedule) => (
                  <div
                    key={schedule._id}
                    onClick={() => onScheduleClick(schedule)}
                    className={cn(
                      "border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md hover:border-primary",
                      getStatusColor(schedule.status),
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className={getShiftBadgeColor(schedule)}
                        >
                          {getShiftLabel(schedule)}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn(
                            "border",
                            getStatusColor(schedule.status),
                          )}
                        >
                          {getStatusLabel(schedule.status)}
                        </Badge>
                      </div>
                    </div>

                    {schedule.shiftInfo && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        <div>
                          {schedule.shiftInfo.name}:{" "}
                          {schedule.shiftInfo.startTime} -{" "}
                          {schedule.shiftInfo.endTime}
                        </div>
                      </div>
                    )}

                    {schedule.status === EmployeeScheduleStatus.Rejected &&
                      schedule.rejectedReason && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          <span className="font-medium">Lý do từ chối: </span>
                          {schedule.rejectedReason}
                        </p>
                      )}
                    {schedule.status !== EmployeeScheduleStatus.Rejected &&
                      schedule.note && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {schedule.note}
                        </p>
                      )}

                    <p className="text-xs text-muted-foreground mt-2">
                      Xem chi tiết →
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DateSchedulesModal;

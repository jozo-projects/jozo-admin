import { IRoomSchedule } from "@/@types/Room";
import roomScheduleApis from "@/apis/roomSchedule.api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RoomStatus } from "@/constants/enum";
import { toast } from "@/hooks/use-toast";
import dayjs, {
  parseUTCToLocal,
  toIsoStringWithZeroSubsecond,
} from "@/lib/dayjs";
import { AxiosError } from "axios";
import { useMutation } from "@tanstack/react-query";
import { Wrench } from "lucide-react";
import React, { useEffect, useState } from "react";

/** Ghép YYYY-MM-DD + HH:mm theo giờ tường VN rồi trả về ISO UTC. */
const wallTimeVietnamToUtcIso = (dateStr: string, timeStr: string) => {
  const t =
    timeStr.length === 5
      ? `${timeStr}:00`
      : timeStr.length === 8
        ? timeStr
        : timeStr;
  const d = dayjs.tz(`${dateStr}T${t}`, "Asia/Ho_Chi_Minh");
  if (!d.isValid()) return null;
  return toIsoStringWithZeroSubsecond(d.utc());
};

interface ProcessMaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: IRoomSchedule;
  refetchSchedules: () => void;
}

const ProcessMaintenanceModal: React.FC<ProcessMaintenanceModalProps> = ({
  isOpen,
  onClose,
  schedule,
  refetchSchedules,
}) => {
  const [adjustedStartDate, setAdjustedStartDate] = useState("");
  const [adjustedEndDate, setAdjustedEndDate] = useState("");
  const [adjustedStartTime, setAdjustedStartTime] = useState("");
  const [adjustedEndTime, setAdjustedEndTime] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    const start = parseUTCToLocal(schedule.startTime);
    const end = schedule.endTime
      ? parseUTCToLocal(schedule.endTime)
      : start.add(240, "minute");
    setAdjustedStartDate(start.format("YYYY-MM-DD"));
    setAdjustedEndDate(end.format("YYYY-MM-DD"));
    setAdjustedStartTime(start.format("HH:mm"));
    setAdjustedEndTime(end.format("HH:mm"));
  }, [isOpen, schedule._id, schedule.startTime, schedule.endTime]);

  const { mutate, isPending } = useMutation({
    mutationFn: (payload: Partial<IRoomSchedule>) =>
      roomScheduleApis.updateSchedule(schedule._id, payload),
    onSuccess: (_data, variables) => {
      refetchSchedules();
      const isDone = variables.status === RoomStatus.Finished;
      toast({
        title: isDone ? "Bảo trì xong" : "Đã cập nhật",
        description: isDone
          ? "Lịch bảo trì đã kết thúc."
          : "Thời gian bảo trì đã được cập nhật.",
      });
      if (isDone) onClose();
    },
    onError: (error) => {
      const _error = error as AxiosError;
      toast({
        title: "Lỗi",
        description: _error.message || "Không thể cập nhật lịch bảo trì.",
        variant: "destructive",
      });
    },
  });

  const buildTimePayload = (): Partial<IRoomSchedule> | null => {
    const newStartIso = wallTimeVietnamToUtcIso(
      adjustedStartDate,
      adjustedStartTime,
    );
    let newEndIso = wallTimeVietnamToUtcIso(adjustedEndDate, adjustedEndTime);

    if (!newStartIso || !newEndIso) {
      toast({
        title: "Thời gian không hợp lệ",
        description: "Vui lòng nhập ngày/giờ hợp lệ.",
        variant: "destructive",
      });
      return null;
    }

    const startUtc = dayjs.utc(newStartIso);
    let endUtc = dayjs.utc(newEndIso);
    if (!endUtc.isAfter(startUtc)) {
      endUtc = endUtc.add(1, "day");
      setAdjustedEndDate(endUtc.tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DD"));
      newEndIso = toIsoStringWithZeroSubsecond(endUtc);
    }

    return {
      startTime: newStartIso,
      endTime: newEndIso,
    };
  };

  const handleUpdateTime = () => {
    const payload = buildTimePayload();
    if (!payload) return;
    mutate(payload);
  };

  const handleFinish = () => {
    mutate({
      status: RoomStatus.Finished,
      endTime: toIsoStringWithZeroSubsecond(dayjs()),
    });
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-md gap-0 p-0">
        <div className="px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:pt-6 sm:pb-6">
          <DialogHeader className="pr-8">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Wrench className="h-5 w-5 text-gray-600" />
              Lịch bảo trì
            </DialogTitle>
            <DialogDescription>
              Điều chỉnh thời gian bảo trì hoặc đánh dấu bảo trì xong khi phòng
              đã sẵn sàng.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-3 rounded-lg border bg-muted/30 p-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label
                  htmlFor="maintenance-start-date"
                  className="text-xs text-muted-foreground"
                >
                  Ngày bắt đầu
                </label>
                <input
                  id="maintenance-start-date"
                  type="date"
                  value={adjustedStartDate}
                  onChange={(e) => setAdjustedStartDate(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="maintenance-start-time"
                  className="text-xs text-muted-foreground"
                >
                  Giờ bắt đầu
                </label>
                <input
                  id="maintenance-start-time"
                  type="time"
                  value={adjustedStartTime}
                  onChange={(e) => setAdjustedStartTime(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="maintenance-end-date"
                  className="text-xs text-muted-foreground"
                >
                  Ngày kết thúc
                </label>
                <input
                  id="maintenance-end-date"
                  type="date"
                  value={adjustedEndDate}
                  onChange={(e) => setAdjustedEndDate(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="maintenance-end-time"
                  className="text-xs text-muted-foreground"
                >
                  Giờ kết thúc
                </label>
                <input
                  id="maintenance-end-time"
                  type="time"
                  value={adjustedEndTime}
                  onChange={(e) => setAdjustedEndTime(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleUpdateTime}
              loading={isPending}
            >
              Cập nhật giờ
            </Button>
          </div>

          {schedule.note && (
            <p className="mt-3 text-sm text-muted-foreground">
              Ghi chú: {schedule.note}
            </p>
          )}

          <div className="mt-5 grid grid-cols-1 gap-2">
            <Button
              onClick={handleFinish}
              loading={isPending}
              className="h-11 bg-emerald-600 hover:bg-emerald-700"
            >
              Bảo trì xong
            </Button>
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={isPending}
              className="h-11"
            >
              Đóng
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProcessMaintenanceModal;

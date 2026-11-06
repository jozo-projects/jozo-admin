// src/components/ExtendSessionModal.tsx
import { IRoomSchedule } from "@/@types/Room";
import roomsScheduleApis from "@/apis/roomSchedule.api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RoomStatus } from "@/constants/enum";
import { toast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import dayjs from "dayjs";
import React, { useState } from "react";

interface ExtendSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: IRoomSchedule;
  refetchSchedules?: () => void;
  birthdayDraft?: import("@/utils/memberBirthday").ScheduleBirthdayDraft | null;
  birthdayBlocked?: boolean;
}

const ExtendSessionModal: React.FC<ExtendSessionModalProps> = ({
  isOpen,
  onClose,
  schedule,
  refetchSchedules,
  birthdayDraft,
  birthdayBlocked = false,
}) => {
  // Các khoảng thời gian gia hạn tính theo phút
  const extensionOptions = [
    { value: 15, label: "15 phút" },
    { value: 30, label: "30 phút" },
    { value: 45, label: "45 phút" },
    { value: 60, label: "1 giờ" },
    { value: 75, label: "1 giờ 15 phút" },
    { value: 90, label: "1 giờ 30 phút" },
    { value: 105, label: "1 giờ 45 phút" },
    { value: 120, label: "2 giờ" },
    { value: 150, label: "2 giờ 30 phút" },
    { value: 180, label: "3 giờ" },
    { value: 210, label: "3 giờ 30 phút" },
    { value: 240, label: "4 giờ" },
  ];
  const [selectedExtension, setSelectedExtension] = useState<number>(15);

  const { mutate, isPending } = useMutation({
    mutationFn: (extensionMinutes: number) => {
      // Xác định thời gian cơ sở: nếu schedule.endTime tồn tại và > now thì dùng nó, ngược lại dùng now
      const baseTime =
        schedule.endTime && dayjs(schedule.endTime).isAfter(dayjs())
          ? dayjs(schedule.endTime)
          : dayjs();
      const newEndTime = baseTime.add(extensionMinutes, "minute");
      // Gọi API cập nhật với dữ liệu mới (chỉ cập nhật endTime)
      return roomsScheduleApis.updateSchedule(schedule._id, {
        endTime: newEndTime.toISOString(),
        status: RoomStatus.InUse,
        ...(birthdayDraft !== undefined ? { birthdayDraft } : {}),
      });
    },
    onSuccess: () => {
      refetchSchedules?.();
      onClose();
      toast({
        title: "Success",
        description: `Session extended by ${selectedExtension} minutes.`,
      });
    },
  });

  const handleSubmit = () => {
    if (birthdayBlocked) return;
    mutate(selectedExtension);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Extend Session</DialogTitle>
          <DialogDescription>
            Choose the duration to extend the session. The current session will
            be extended by the selected duration.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-4 mt-4 flex-wrap">
          {extensionOptions.map((minutes) => (
            <Button
              key={minutes.value}
              variant={
                selectedExtension === minutes.value ? "default" : "outline"
              }
              onClick={() => setSelectedExtension(minutes.value)}
              disabled={isPending}
            >
              {minutes.label}
            </Button>
          ))}
        </div>
        <DialogFooter className="mt-4 flex justify-end gap-4">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || birthdayBlocked}
            loading={isPending}
          >
            Extend
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExtendSessionModal;

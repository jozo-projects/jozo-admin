import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import roomScheduleApis from "@/apis/roomSchedule.api";
import React from "react";
import dayjs from "dayjs";
import { IRoomSchedule } from "@/@types/Room";
import { RoomStatus } from "@/constants/enum";
import { AxiosError } from "axios";
import { useMutation, useQuery } from "@tanstack/react-query";
import FoodDrinkModal from "@/components/modules/RoomSchedule/FoodDrinkModal";
import ExtendSessionModal from "./ExtendSessionModal";
import { useScheduleMemberPhone } from "../hooks/useScheduleMemberPhone";
import ScheduleMemberSection from "./ScheduleMemberSection";
import ScheduleRoomTypeSection from "./ScheduleRoomTypeSection";
import roomApis from "@/apis/room.apis";
import { IRoom } from "@/@types/Room";
import { Clock, Lock, UtensilsCrossed } from "lucide-react";

interface ProcessLockedModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: IRoomSchedule;
  refetchSchedules: () => void;
}

const ProcessLockedModal: React.FC<ProcessLockedModalProps> = ({
  isOpen,
  onClose,
  schedule,
  refetchSchedules,
}) => {
  const [isFnbModalOpen, setIsFnbModalOpen] = useState(false);
  const [isExtendSessionModalOpen, setIsExtendSessionModalOpen] =
    useState(false);

  const member = useScheduleMemberPhone({
    scheduleId: schedule._id,
    initialPhone: schedule.customerPhone || "",
    initialGiftEnabled: schedule.giftEnabled,
    isOpen,
    refetchSchedules,
  });

  const { data: roomsData } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => roomApis.getRooms(),
    staleTime: 5 * 60 * 1000,
    enabled: isOpen,
  });

  const currentRoom = roomsData?.data?.result?.find(
    (room: IRoom) => room._id === schedule.roomId,
  );

  const { mutate, isPending } = useMutation({
    mutationFn: (payload: Partial<IRoomSchedule>) =>
      roomScheduleApis.updateSchedule(schedule._id, payload),
    onSuccess: () => {
      refetchSchedules();
      onClose();
      toast({
        title: "Đã cập nhật",
        description: "Trạng thái phiên đã được thay đổi",
      });
    },
    onError: (error) => {
      const _error = error as AxiosError;
      console.error("Error updating schedule:", _error.message);
      toast({
        title: "Lỗi",
        description: _error.message,
        variant: "destructive",
      });
    },
  });

  const handleUpdate = async (newStatus: RoomStatus) => {
    const now = dayjs();
    const updateData: Partial<IRoomSchedule> = { status: newStatus };

    if (newStatus === RoomStatus.InUse) {
      updateData.startTime = now.toISOString();
      updateData.endTime = now.add(2, "hour").toISOString();
    } else if (newStatus === RoomStatus.Cancelled) {
      updateData.endTime = now.toISOString();
    }

    mutate(updateData);
  };

  const handleCloseExtendSessionModal = () => {
    setIsExtendSessionModalOpen(false);
    onClose();
    refetchSchedules();
  };

  const startLabel = schedule.startTime
    ? dayjs(schedule.startTime).format("HH:mm")
    : "—";
  const endLabel = schedule.endTime
    ? dayjs(schedule.endTime).format("HH:mm")
    : "—";

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <DialogContent className="max-w-lg gap-0 p-0 sm:max-w-xl">
          <div className="px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:pt-6 sm:pb-6">
            <DialogHeader className="pr-8">
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Lock className="w-5 h-5 text-amber-600" />
                Phiên đang khóa
              </DialogTitle>
              <DialogDescription>
                Nhập SĐT thành viên trước khi mở phiên hoặc hủy booking.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 flex items-center gap-2 text-sm text-amber-900">
              <Clock className="w-4 h-4 shrink-0" />
              <span>
                Dự kiến: <strong>{startLabel}</strong> –{" "}
                <strong>{endLabel}</strong>
              </span>
            </div>

            <ScheduleMemberSection
              className="mt-4"
              inputId="locked-member-phone"
              phone={member.phone}
              savedPhone={member.savedPhone}
              onPhoneChange={member.setPhone}
              isPhoneDirty={member.isPhoneDirty}
              hasSavedValidPhone={member.hasSavedValidPhone}
              isSavingPhone={member.isSavingPhone}
              onSavePhone={member.savePhone}
              onClearPhone={member.clearPhone}
              isGiftEnabled={member.isGiftEnabled}
              onGiftEnabledChange={member.updateGiftEnabled}
              isUpdatingGiftEnabled={member.isUpdatingGiftEnabled}
              customerName={schedule.customerName}
              customerEmail={schedule.customerEmail}
              memberInfo={member.memberInfo}
              isLoadingMemberInfo={member.isLoadingMemberInfo}
              isMemberInfoError={member.isMemberInfoError}
              isMemberNotFound={member.isMemberNotFound}
              availableGifts={member.availableGifts}
              streakRewards={member.streakRewards}
              selectableItems={member.selectableItems}
              servedGifts={member.servedGifts}
              onClaimGift={member.claimStreakGift}
              onAddGiftItems={member.addStreakGiftItems}
              onUpdateGiftItemQty={member.updateStreakGiftItemQty}
              onRemoveGiftItem={member.removeStreakGiftItem}
              isServingGift={member.isMutatingGift}
            />

            <ScheduleRoomTypeSection
              className="mt-4"
              schedule={schedule}
              physicalRoomType={currentRoom?.roomType}
              onUpdated={refetchSchedules}
            />

            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button
                variant="outline"
                onClick={() => setIsFnbModalOpen(true)}
                className="h-11 justify-start"
              >
                <UtensilsCrossed className="w-4 h-4 mr-2" />
                Đặt đồ ăn / uống
              </Button>
              <Button
                onClick={() => setIsExtendSessionModalOpen(true)}
                loading={isPending}
                className="h-11 justify-start bg-emerald-600 hover:bg-emerald-700"
              >
                Mở phiên (In use)
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleUpdate(RoomStatus.Cancelled)}
                loading={isPending}
                className="h-11 sm:col-span-2"
              >
                Hủy booking
              </Button>
              <Button
                variant="ghost"
                onClick={onClose}
                className="h-11 sm:col-span-2"
              >
                Đóng
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <FoodDrinkModal
        isOpen={isFnbModalOpen}
        onClose={() => setIsFnbModalOpen(false)}
        scheduleId={schedule._id}
        refetch={refetchSchedules}
      />

      <ExtendSessionModal
        isOpen={isExtendSessionModalOpen}
        onClose={handleCloseExtendSessionModal}
        schedule={schedule}
        refetchSchedules={refetchSchedules}
      />
    </>
  );
};

export default ProcessLockedModal;

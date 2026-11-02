import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import roomsScheduleApis from "@/apis/roomSchedule.api";
import { useBirthdayCheckout } from "./use-member-birthday";
import { toast } from "./use-toast";

/** One canonical schedule draft, shared by booked, locked, active and checkout. */
export function useScheduleBirthday(scheduleId: string, memberId: string, enabled: boolean, at?: string) {
  const client = useQueryClient();
  const schedule = useQuery({
    queryKey: ["roomSchedule", scheduleId],
    queryFn: () => roomsScheduleApis.getScheduleById(scheduleId),
    enabled: enabled && !!scheduleId,
  });
  const birthday = useBirthdayCheckout(`${scheduleId}:${memberId}`, memberId, enabled, schedule.data?.data.result?.birthdayDraft, at);
  const save = useMutation({
    mutationFn: () => roomsScheduleApis.updateSchedule(scheduleId, { birthdayDraft: birthday.scheduleDraft }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["roomSchedule", scheduleId] });
      await client.invalidateQueries({ queryKey: ["roomSchedules"] });
      toast({ title: "Đã lưu lựa chọn sinh nhật", description: "Chưa sử dụng lượt; điều kiện sẽ được kiểm tra lại khi lưu hóa đơn." });
    },
    onError: () => toast({ title: "Không lưu được lựa chọn sinh nhật", description: "Lịch, điều kiện hoặc tồn kho có thể đã thay đổi. Vui lòng tải lại và kiểm tra.", variant: "destructive" }),
  });
  return { ...birthday, blocked: birthday.blocked || save.isPending || (enabled && (schedule.isPending || schedule.isError || schedule.isFetching)), isSavingDraft: save.isPending, saveDraft: () => save.mutate(), draftLoadError: schedule.isError, retryDraft: () => void schedule.refetch() };
}

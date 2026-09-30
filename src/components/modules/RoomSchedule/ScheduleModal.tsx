import { IRoom } from "@/@types/Room";
import fnbOrderApis from "@/apis/fnbOrder.apis";
import roomsScheduleApis, {
  ICreateRoomScheduleRequest,
} from "@/apis/roomSchedule.api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { RoomStatus, RoomType } from "@/constants/enum";
import { useGetStandardPromotions } from "@/hooks/promotion";
import useAuth from "@/hooks/useAuth";
import {
  getRoomTypeForBooking,
  getRoomTypeLabel,
  isScheduleRoomTypeEditable,
  normalizeRoomType,
} from "@/pages/RoomSchedule/utils/scheduleRoomType";
import { getDefaultBusinessDate } from "@/pages/RoomSchedule/utils/timelineHours";
import { roomTypeOptions } from "@/pages/RoomsManagement/constants";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { useMembershipConfig, useStreakGifts } from "@/hooks/use-membership";
import MemberPhoneCombobox from "@/pages/RoomSchedule/components/MemberPhoneCombobox";
import MemberPhoneLookupCard from "@/pages/RoomSchedule/components/MemberPhoneLookupCard";
import ScheduleDatePicker from "@/pages/RoomSchedule/components/ScheduleDatePicker";
import { isValidMemberPhone } from "@/pages/RoomSchedule/utils/memberPhone";

const PEOPLE_COUNT_LARGE_THRESHOLD = 5;

// Define schema using zod
const buildScheduleSchema = (requirePeopleCount: boolean) =>
  z.object({
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    startTime: z.string().min(1, "Start time is required"),
    endTime: z.string().min(1, "End time is required"),
    status: z.nativeEnum(RoomStatus),
    roomType: z.nativeEnum(RoomType).optional(),
    peopleCount: requirePeopleCount
      ? z.coerce
          .number({
            required_error: "Vui lòng nhập số lượng người",
            invalid_type_error: "Số người phải là số hợp lệ",
          })
          .int("Số người phải là số nguyên")
          .min(1, "Số người phải ít nhất 1")
      : z.coerce.number().optional(),
    customerPhone: z
      .string()
      .optional()
      .refine(
        (value) => !value || isValidMemberPhone(value),
        "SĐT phải có 10–11 số và bắt đầu bằng 0",
      ),
    note: z.string().max(200).optional(),
    giftEnabled: z.boolean().optional(),
    promotionId: z.string().optional(),
    use4Mic: z.boolean().optional(),
  });

type FormValues = z.infer<ReturnType<typeof buildScheduleSchema>>;

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Nếu có scheduleId thì chế độ cập nhật; nếu không là chế độ tạo mới
  scheduleId?: string;
  // Khi tạo mới, cần cung cấp thông tin phòng
  room?: IRoom;
  // Ngày được chọn từ component cha
  selectedDate?: Date;
}

const ScheduleModal: React.FC<ScheduleModalProps> = ({
  isOpen,
  onClose,
  scheduleId,
  room,
  selectedDate = new Date(),
}) => {
  const requirePeopleCount =
    !scheduleId && !!room && room.roomType !== RoomType.Dorm;
  const scheduleSchema = useMemo(
    () => buildScheduleSchema(requirePeopleCount),
    [requirePeopleCount],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      startDate: "",
      endDate: "",
      startTime: "",
      endTime: "",
      status: RoomStatus.Booked,
      note: "",
      customerPhone: "",
      giftEnabled: false,
      promotionId: "",
      peopleCount: undefined,
      use4Mic: false,
    },
  });

  const { control, handleSubmit, setValue, watch } = form;
  const startDateValue = watch("startDate");
  const startTimeValue = watch("startTime");
  const statusValue = watch("status");
  const peopleCountValue = watch("peopleCount");
  const use4MicValue = watch("use4Mic");
  const customerPhoneValue = watch("customerPhone") ?? "";
  const [isNameSearchActive, setIsNameSearchActive] = useState(false);
  const parsedPeopleCount =
    typeof peopleCountValue === "number"
      ? peopleCountValue
      : Math.max(1, Number(peopleCountValue) || 0);
  const suggestedRoomType =
    peopleCountValue !== undefined &&
    !Number.isNaN(Number(peopleCountValue)) &&
    parsedPeopleCount >= 1
      ? getRoomTypeForBooking(!!use4MicValue)
      : null;

  const lookupPhone = isValidMemberPhone(customerPhoneValue)
    ? customerPhoneValue.trim()
    : "";
  const { data: membershipConfig } = useMembershipConfig();
  const {
    data: streakGiftsData,
    isLoading: isLoadingMemberLookup,
    isError: isMemberLookupError,
    isFetched: hasFetchedMemberLookup,
  } = useStreakGifts(lookupPhone, {
    enabled: isOpen && !!lookupPhone,
    scheduleId,
  });
  const memberLookupUser = streakGiftsData?.user ?? null;
  const isMemberLookupNotFound =
    !!lookupPhone &&
    hasFetchedMemberLookup &&
    !memberLookupUser &&
    !isMemberLookupError;

  // Biến cờ để đánh dấu nếu người dùng đã tự chỉnh sửa End Time
  const [isEndTimeModified, setIsEndTimeModified] = useState(false);
  const [sizeConfirmOpen, setSizeConfirmOpen] = useState(false);
  const [pendingCreateValues, setPendingCreateValues] =
    useState<FormValues | null>(null);

  const { user } = useAuth();
  const { data: standardPromotions } = useGetStandardPromotions();
  const promotionList = standardPromotions?.data.result ?? [];

  // Load schedule khi mở modal chỉnh sửa (scheduleId có giá trị)
  const { data: scheduleData } = useQuery({
    queryKey: ["roomSchedule", scheduleId],
    queryFn: () => roomsScheduleApis.getScheduleById(scheduleId!),
    enabled: isOpen && !!scheduleId,
  });

  const schedule = scheduleData?.data?.result;
  const canEditScheduleRoomType =
    !!scheduleId && !!schedule && isScheduleRoomTypeEditable(schedule);

  useEffect(() => {
    if (scheduleId && schedule && isOpen) {
      const start = dayjs(schedule.startTime);
      const end = schedule.endTime
        ? dayjs(schedule.endTime)
        : start.add(2, "hour");
      setValue("startDate", start.format("YYYY-MM-DD"));
      setValue("endDate", end.format("YYYY-MM-DD"));
      setValue("startTime", start.format("HH:mm"));
      setValue("endTime", end.format("HH:mm"));
      setValue("status", schedule.status as RoomStatus);
      setValue("note", schedule.note ?? "");
      setValue("customerPhone", schedule.customerPhone ?? "");
      setValue("giftEnabled", schedule.giftEnabled ?? false);
      setValue("promotionId", schedule.promotionId ?? "");
      if (schedule.roomType) {
        const normalized = normalizeRoomType(schedule.roomType);
        if (normalized) {
          setValue("roomType", normalized);
        }
      }
      setIsEndTimeModified(true);
    }
  }, [scheduleId, schedule, isOpen, setValue]);

  const { mutate: updateSchedule, isPending: isUpdating } = useMutation({
    mutationFn: (payload: {
      id: string;
      schedule: Partial<ICreateRoomScheduleRequest>;
    }) => roomsScheduleApis.updateSchedule(payload.id, payload.schedule),
    onSuccess: () => {
      onClose();
    },
    onError: (error) => {
      console.error("Error updating schedule:", error);
    },
  });

  const { mutateAsync: createSchedule, isPending: isCreating } = useMutation({
    mutationFn: (payload: ICreateRoomScheduleRequest) =>
      roomsScheduleApis.createSchedule(payload),
    onSuccess: async (response) => {
      // response.data.result là roomSchedule vừa tạo
      const roomScheduleId = response?.data?.result;
      console.log("roomScheduleId", roomScheduleId);

      if (roomScheduleId) {
        try {
          await fnbOrderApis.createFnbOrder({
            roomScheduleId,
            order: { drinks: {}, snacks: {} },
            createdBy: user?.name || "system",
          });
        } catch (err) {
          console.error("Tạo order thất bại:", err);
        }
      }
      onClose();
    },
    onError: (error) => {
      console.error("Error creating schedule:", error);
    },
  });

  // Dùng ref để đảm bảo khởi tạo giá trị mặc định chỉ chạy 1 lần
  const isInitialized = useRef(false);
  const prevPeopleCountRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!scheduleId && room && isOpen) {
      setValue("roomType", room.roomType);
      setValue("peopleCount", undefined);
      setValue("use4Mic", false);
      prevPeopleCountRef.current = undefined;
    }
  }, [scheduleId, room, isOpen, setValue]);

  useEffect(() => {
    if (
      peopleCountValue === undefined ||
      Number.isNaN(Number(peopleCountValue))
    ) {
      return;
    }

    const count = Number(peopleCountValue);
    const prevCount = prevPeopleCountRef.current;
    let effectiveUse4Mic = !!use4MicValue;

    if (count > PEOPLE_COUNT_LARGE_THRESHOLD) {
      if (
        prevCount === undefined ||
        prevCount <= PEOPLE_COUNT_LARGE_THRESHOLD
      ) {
        effectiveUse4Mic = true;
        setValue("use4Mic", true);
      }
    }

    prevPeopleCountRef.current = count;

    if (count >= 1 && room && room.roomType !== RoomType.Dorm) {
      setValue("roomType", getRoomTypeForBooking(effectiveUse4Mic));
    }
  }, [peopleCountValue, use4MicValue, room, setValue]);

  // Reset init khi đóng modal để lần mở sau lấy đúng ngày/giờ hiện tại
  useEffect(() => {
    if (!isOpen) {
      isInitialized.current = false;
      setIsEndTimeModified(false);
    }
  }, [isOpen]);

  // Set default date & time khi tạo mới schedule
  // - Ca hiện tại: dùng ngày lịch thực tế của "now" (qua 0h → ngày hôm nay, không giữ ngày kinh doanh)
  // - Ngày khác: giữ selectedDate + giờ hiện tại
  // - End luôn derive từ start + duration để qua nửa đêm nhảy đúng ngày
  useEffect(() => {
    if (!isOpen || scheduleId || !selectedDate || isInitialized.current) {
      return;
    }

    const now = dayjs().second(0).millisecond(0);
    const viewDate = dayjs(selectedDate).startOf("day");
    const isCurrentBusinessDay = viewDate.isSame(
      getDefaultBusinessDate(now),
      "day",
    );

    const startDateTime = isCurrentBusinessDay
      ? now
      : viewDate.hour(now.hour()).minute(now.minute()).second(0).millisecond(0);

    const endDateTime = startDateTime.add(2, "hour");

    setValue("startDate", startDateTime.format("YYYY-MM-DD"));
    setValue("startTime", startDateTime.format("HH:mm"));
    setValue("endDate", endDateTime.format("YYYY-MM-DD"));
    setValue("endTime", endDateTime.format("HH:mm"));

    isInitialized.current = true;
  }, [isOpen, selectedDate, scheduleId, setValue]);

  // Cập nhật End Date & End Time tự động nếu người dùng chưa chỉnh sửa thủ công
  useEffect(() => {
    if (!scheduleId && startDateValue && startTimeValue && !isEndTimeModified) {
      const startDateTime = dayjs(`${startDateValue}T${startTimeValue}`);

      let endDateTime;
      if (statusValue === RoomStatus.Locked) {
        endDateTime = startDateTime.add(5, "minute");
      } else if (statusValue === RoomStatus.Booked) {
        endDateTime = startDateTime.add(2, "hour");
      } else {
        endDateTime = startDateTime.add(1, "hour");
      }
      const newEndTimeStr = endDateTime.format("HH:mm");
      const newEndDateStr = endDateTime.format("YYYY-MM-DD");
      setValue("endTime", newEndTimeStr);
      setValue("endDate", newEndDateStr);
    }
  }, [
    statusValue,
    startDateValue,
    startTimeValue,
    scheduleId,
    setValue,
    isEndTimeModified,
  ]);

  const buildScheduleTimes = (values: FormValues) => {
    const toISO = (dateStr: string, timeStr: string) =>
      dayjs(`${dateStr}T${timeStr}`).toISOString();

    const startDt = dayjs(toISO(values.startDate, values.startTime));
    let endDt = dayjs(toISO(values.endDate, values.endTime));
    let endTimeISO = endDt.toISOString();
    if (!endDt.isAfter(startDt)) {
      endDt = endDt.add(1, "day");
      endTimeISO = endDt.toISOString();
    }

    return {
      startTimeISO: startDt.toISOString(),
      endTimeISO,
    };
  };

  const needsMediumToLargeConfirm = (
    values: FormValues,
    targetRoom: IRoom,
  ): boolean =>
    targetRoom.roomType === RoomType.Medium &&
    !!values.peopleCount &&
    values.peopleCount > PEOPLE_COUNT_LARGE_THRESHOLD;

  const executeCreate = async (values: FormValues) => {
    if (!room) {
      throw new Error("Room information is required to create schedule.");
    }

    const { startTimeISO, endTimeISO } = buildScheduleTimes(values);

    let bookingRoomType = values.roomType;

    if (room.roomType !== RoomType.Dorm && values.peopleCount) {
      bookingRoomType = getRoomTypeForBooking(!!values.use4Mic);
    }

    const scheduleData: ICreateRoomScheduleRequest = {
      roomId: room._id,
      startTime: startTimeISO,
      endTime: endTimeISO,
      status: values.status,
      note: values.note,
      customerPhone: values.customerPhone?.trim() || undefined,
      giftEnabled: values.giftEnabled,
      promotionId: values.promotionId || undefined,
      roomType: bookingRoomType,
    };
    await createSchedule(scheduleData);
  };

  const handleConfirmSizeUpgrade = async () => {
    if (!pendingCreateValues) {
      return;
    }

    try {
      await executeCreate(pendingCreateValues);
    } catch (error) {
      console.error("Error submitting schedule:", error);
    } finally {
      setSizeConfirmOpen(false);
      setPendingCreateValues(null);
    }
  };

  const onSubmit = async (values: FormValues) => {
    try {
      if (scheduleId) {
        const { startTimeISO, endTimeISO } = buildScheduleTimes(values);
        const updatePayload: Partial<ICreateRoomScheduleRequest> = {
          startTime: startTimeISO,
          endTime: endTimeISO,
          status: values.status,
          note: values.note,
          customerPhone: values.customerPhone?.trim() || undefined,
          giftEnabled: values.giftEnabled,
          promotionId: values.promotionId || null,
        };

        if (
          canEditScheduleRoomType &&
          values.roomType &&
          values.roomType !== schedule?.roomType
        ) {
          updatePayload.roomType = values.roomType;
        }

        updateSchedule({
          id: scheduleId,
          schedule: updatePayload,
        });
        return;
      }

      if (!room) {
        throw new Error("Room information is required to create schedule.");
      }

      if (needsMediumToLargeConfirm(values, room)) {
        setPendingCreateValues(values);
        setSizeConfirmOpen(true);
        return;
      }

      await executeCreate(values);
    } catch (error) {
      console.error("Error submitting schedule:", error);
    }
  };

  const formattedDate = startDateValue
    ? dayjs(startDateValue).format("DD/MM/YYYY")
    : selectedDate
      ? dayjs(selectedDate).format("DD/MM/YYYY")
      : "Hôm nay";

  const showPeopleFields =
    !scheduleId && !!room && room.roomType !== RoomType.Dorm;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent
          className="flex h-[100dvh] max-h-[100dvh] flex-col gap-0 overflow-hidden p-0 sm:h-auto sm:max-h-[90vh] sm:max-w-[560px]"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <Form {...form}>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="flex h-full min-h-0 flex-1 flex-col"
            >
              <DialogHeader className="shrink-0 gap-1 border-b px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] pr-12 sm:px-6 sm:pt-5">
                <DialogTitle className="text-lg font-semibold tracking-tight">
                  {scheduleId
                    ? "Sửa lịch"
                    : `Đặt phòng ${room?.roomName ?? ""}`}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  {scheduleId
                    ? "Cập nhật thông tin lịch"
                    : `${formattedDate}${
                        room && room.roomType !== RoomType.Dorm
                          ? ` · ${getRoomTypeLabel(room.roomType).toLowerCase()}`
                          : ""
                      }`}
                </DialogDescription>
              </DialogHeader>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4 sm:px-6">
                <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <FormField
                    control={control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col gap-1.5 space-y-0">
                        <FormLabel className="text-sm font-medium">
                          Ngày bắt đầu
                        </FormLabel>
                        <FormControl>
                          <ScheduleDatePicker
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Chọn ngày"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem className="flex flex-col gap-1.5 space-y-0">
                        <FormLabel className="text-sm font-medium">
                          Giờ bắt đầu
                        </FormLabel>
                        <FormControl>
                          <Input type="time" className="h-9" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col gap-1.5 space-y-0">
                        <FormLabel className="text-sm font-medium">
                          Ngày kết thúc
                        </FormLabel>
                        <FormControl>
                          <ScheduleDatePicker
                            value={field.value}
                            onChange={(next) => {
                              field.onChange(next);
                              setIsEndTimeModified(true);
                            }}
                            placeholder="Chọn ngày"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem className="flex flex-col gap-1.5 space-y-0">
                        <FormLabel className="text-sm font-medium">
                          Giờ kết thúc
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            className="h-9"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              setIsEndTimeModified(true);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div
                  className={
                    showPeopleFields
                      ? "grid grid-cols-2 items-end gap-2 sm:grid-cols-3 sm:gap-3"
                      : "grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3"
                  }
                >
                  <FormField
                    control={control}
                    name="status"
                    render={({ field }) => (
                      <FormItem className="flex flex-col gap-1.5 space-y-0">
                        <FormLabel className="text-sm font-medium">
                          Trạng thái
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Trạng thái" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={RoomStatus.Booked}>
                              Booked
                            </SelectItem>
                            <SelectItem value={RoomStatus.Locked}>
                              Locked
                            </SelectItem>
                            <SelectItem value={RoomStatus.Maintenance}>
                              Maintenance
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {showPeopleFields && (
                    <>
                      <FormField
                        control={control}
                        name="peopleCount"
                        render={({ field }) => (
                          <FormItem className="flex flex-col gap-1.5 space-y-0">
                            <FormLabel className="text-sm font-medium">
                              Số khách
                              {suggestedRoomType
                                ? ` · ${getRoomTypeLabel(
                                    suggestedRoomType,
                                  ).toLowerCase()}`
                                : ""}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                placeholder="VD: 4"
                                className="h-9"
                                {...field}
                                value={field.value ?? ""}
                                onChange={(event) =>
                                  field.onChange(
                                    event.target.value === ""
                                      ? undefined
                                      : event.target.value,
                                  )
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={control}
                        name="use4Mic"
                        render={({ field }) => (
                          <FormItem className="col-span-2 flex h-9 items-center justify-between gap-3 rounded-md border px-3 sm:col-span-1">
                            <FormLabel className="text-sm font-medium">
                              4 mic
                            </FormLabel>
                            <FormControl>
                              <Switch
                                checked={field.value ?? false}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </div>

                <FormField
                  control={control}
                  name="customerPhone"
                  render={({ field }) => (
                    <FormItem className="flex flex-col gap-1.5 space-y-0">
                      <FormControl>
                        <MemberPhoneCombobox
                          id="schedule-modal-member-phone"
                          phone={field.value ?? ""}
                          onPhoneChange={field.onChange}
                          enabled={isOpen}
                          onNameSearchActiveChange={setIsNameSearchActive}
                          label="Thành viên"
                          inputClassName="h-9"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {!isNameSearchActive && (
                  <MemberPhoneLookupCard
                    phone={customerPhoneValue}
                    isLoading={isLoadingMemberLookup}
                    isError={isMemberLookupError}
                    isNotFound={isMemberLookupNotFound}
                    memberInfo={memberLookupUser}
                    availableGifts={streakGiftsData?.availableGifts}
                    streakRewards={streakGiftsData?.streakRewards}
                    configStreakRewards={membershipConfig?.streak?.rewards}
                  />
                )}

                {canEditScheduleRoomType && (
                  <FormField
                    control={control}
                    name="roomType"
                    render={({ field }) => (
                      <FormItem className="flex flex-col gap-1.5 space-y-0">
                        <FormLabel className="text-sm font-medium">
                          Size
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Chọn size" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {roomTypeOptions.map((option) => (
                              <SelectItem
                                value={option.value}
                                key={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {!scheduleId && room?.roomType === RoomType.Dorm && (
                  <FormField
                    control={control}
                    name="roomType"
                    render={({ field }) => (
                      <FormItem className="flex flex-col gap-1.5 space-y-0">
                        <FormLabel className="text-sm font-medium">
                          Loại phòng
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Chọn loại phòng" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {roomTypeOptions.map((option) => (
                              <SelectItem
                                value={option.value}
                                key={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={control}
                  name="note"
                  render={({ field }) => (
                    <FormItem className="flex flex-col gap-1.5 space-y-0">
                      <FormLabel className="text-sm font-medium">
                        Ghi chú
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          maxLength={200}
                          placeholder="VD: khách đến trễ 15p"
                          className="min-h-[64px] resize-y"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FormField
                    control={control}
                    name="giftEnabled"
                    render={({ field }) => (
                      <FormItem className="flex h-9 items-center justify-between gap-3 rounded-md border px-3">
                        <FormLabel className="text-sm font-medium">
                          Cho nhận quà
                        </FormLabel>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  {statusValue === RoomStatus.Booked && (
                    <FormField
                      control={control}
                      name="promotionId"
                      render={({ field }) => (
                        <FormItem className="flex flex-col gap-1.5 space-y-0">
                          <FormLabel className="text-sm font-medium">
                            Khuyến mãi
                          </FormLabel>
                          <Select
                            onValueChange={(value) =>
                              field.onChange(value === "none" ? "" : value)
                            }
                            value={field.value || "none"}
                          >
                            <FormControl>
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Khuyến mãi" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">
                                Không áp dụng
                              </SelectItem>
                              {promotionList.map((promotion) => (
                                <SelectItem
                                  key={promotion._id}
                                  value={promotion._id}
                                >
                                  {promotion.name} (
                                  {promotion.discountPercentage}%)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
                </div>
              </div>

              <DialogFooter className="shrink-0 flex-col gap-2 border-t px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:px-6 sm:py-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="h-9 w-full sm:w-auto sm:min-w-[100px]"
                >
                  Huỷ
                </Button>
                <Button
                  type="submit"
                  loading={isCreating || isUpdating}
                  className="h-9 w-full sm:w-auto sm:min-w-[120px]"
                >
                  {scheduleId ? "Lưu" : "Đặt phòng"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={sizeConfirmOpen}
        onOpenChange={(open) => {
          setSizeConfirmOpen(open);
          if (!open) {
            setPendingCreateValues(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận size phòng</AlertDialogTitle>
            <AlertDialogDescription>
              Phòng {room?.roomName ?? ""} là size{" "}
              {getRoomTypeLabel(RoomType.Medium).toLowerCase()}, bạn có chắc
              muốn tạo với size {getRoomTypeLabel(RoomType.Large).toLowerCase()}
              ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCreating}>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleConfirmSizeUpgrade();
              }}
              disabled={isCreating}
            >
              {isCreating ? "Đang tạo..." : "Xác nhận"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ScheduleModal;

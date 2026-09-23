import { IRoom, IRoomSchedule } from "@/@types/Room";
import roomsScheduleApis, { IChangeRoomRequest } from "@/apis/roomSchedule.api";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RoomStatus } from "@/constants/enum";
import roomApis from "@/apis/room.apis";
import useAuth from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs, {
  parseUTCToLocal,
  toIsoStringWithZeroSubsecond,
} from "@/lib/dayjs";
import * as React from "react";
import MenuItemsModal from "@/components/modules/RoomSchedule/MenuItemsModal";
import { useScheduleMemberPhone } from "../hooks/useScheduleMemberPhone";
import { isRoomUnderMaintenance } from "../utils/roomStatus";
import {
  getRoomSchedulesQueryKeyForSchedule,
  patchScheduleInRoomSchedulesCache,
  persistSchedulePromotionInCache,
} from "@/hooks/room-schedule";
import ScheduleDatePicker from "./ScheduleDatePicker";
import ScheduleMemberSection from "./ScheduleMemberSection";
import ImagePicker from "@/components/ui/image-picker";
import ScheduleRoomTypeSection from "./ScheduleRoomTypeSection";
import { getRoomTypeLabel } from "../utils/scheduleRoomType";
import fnbMenuApis from "@/apis/fnbMenu.apis";
import fnbOrderApis from "@/apis/fnbOrder.apis";
import { IAddRemoveItemRequestBody } from "@/apis/fnbOrder.apis";
import { OrderDetail } from "@/@types/FnbOrder";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Minus,
  Globe,
  UserCheck,
  Building,
  User,
} from "lucide-react";
import { useGetStandardPromotions } from "@/hooks/promotion";

// Import type MenuItem từ MenuItemsModal
interface MenuItem {
  _id: string;
  name: string;
  parentId: string | null;
  hasVariant: boolean;
  price: number;
  image: string;
  isActive?: boolean;
  category: string;
  inventory: {
    quantity: number;
    minStock?: number;
    maxStock?: number;
    lastUpdated?: string;
  };
  createdAt: string;
  updatedAt: string;
  existingImage?: string;
  quantity?: string;
  variants?: string;
}

/** Ghép YYYY-MM-DD + HH:mm(ss) theo giờ tường VN rồi trả về ISO UTC (chuẩn BE). */
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

interface ProcessBookedModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: IRoomSchedule;
  refetchSchedules: VoidFunction;
}

const ProcessBookedModal: React.FC<ProcessBookedModalProps> = ({
  isOpen,
  onClose,
  schedule,
  refetchSchedules,
}) => {
  const { user } = useAuth();
  const eventStart = parseUTCToLocal(schedule.startTime);
  const eventEnd = schedule.endTime
    ? parseUTCToLocal(schedule.endTime)
    : eventStart.add(120, "minute");

  // State cho thời gian điều chỉnh
  const [adjustedStartDate, setAdjustedStartDate] = React.useState<string>("");
  const [adjustedEndDate, setAdjustedEndDate] = React.useState<string>("");
  const [adjustedStartTime, setAdjustedStartTime] = React.useState<string>("");
  const [adjustedEndTime, setAdjustedEndTime] = React.useState<string>("");

  // State cho modal đặt đồ ăn
  const [isMenuModalOpen, setIsMenuModalOpen] = React.useState(false);

  // State cho edit note
  const [isEditingNote, setIsEditingNote] = React.useState(false);
  const [noteValue, setNoteValue] = React.useState<string>("");

  // State để lưu schedule hiện tại (để sync với cache)
  const [currentSchedule, setCurrentSchedule] =
    React.useState<IRoomSchedule>(schedule);

  // State đổi phòng
  const [targetRoomId, setTargetRoomId] = React.useState<string>("");
  const [roomChangeNote, setRoomChangeNote] = React.useState<string>("");
  const [promotionSelectOpen, setPromotionSelectOpen] = React.useState(false);
  const [roomSelectOpen, setRoomSelectOpen] = React.useState(false);
  const [photoFiles, setPhotoFiles] = React.useState<File[]>([]);
  const [photoPreview, setPhotoPreview] = React.useState<string>("");

  const queryClient = useQueryClient();
  const { data: standardPromotions } = useGetStandardPromotions();
  const promotionList = standardPromotions?.data.result ?? [];
  const [selectedPromotion, setSelectedPromotion] = React.useState<string>("");

  const member = useScheduleMemberPhone({
    scheduleId: schedule._id,
    initialPhone: schedule.customerPhone || "",
    isOpen,
    refetchSchedules,
  });

  const { data: photoDisplayData, refetch: refetchPhotoDisplay } = useQuery({
    queryKey: ["schedulePhotoDisplay", schedule._id],
    queryFn: () => roomsScheduleApis.getPhotoDisplay(schedule._id),
    enabled: isOpen && !!schedule._id,
  });
  const photoDisplay = photoDisplayData?.data?.result;
  const photoMutation = useMutation({
    mutationFn: async (file: File) => roomsScheduleApis.uploadPhoto(schedule._id, file),
    onSuccess: () => { setPhotoFiles([]); setPhotoPreview(""); refetchPhotoDisplay(); toast({ title: "Đã tải ảnh", description: "Ảnh đang ở trạng thái ẩn." }); },
  });
  const displayMutation = useMutation({
    mutationFn: (state: "hidden" | "showing") => roomsScheduleApis.setPhotoDisplay(schedule._id, state),
    onSuccess: () => { refetchPhotoDisplay(); toast({ title: "Đã cập nhật hiển thị ảnh" }); },
  });
  const deletePhotosMutation = useMutation({
    mutationFn: () => roomsScheduleApis.deletePhotos(schedule._id),
    onSuccess: () => { refetchPhotoDisplay(); toast({ title: "Đã xóa ảnh" }); },
  });

  // Query danh sách phòng để đổi
  const { data: roomsData, isLoading: isLoadingRooms } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => roomApis.getRooms(),
    staleTime: 5 * 60 * 1000,
  });

  // Query lấy menu items
  const { data: menuItemsData } = useQuery({
    queryKey: ["menuItems"],
    queryFn: () => fnbMenuApis.getAllMenuItems(),
    enabled: isOpen,
  });

  // Query lấy order detail
  const { data: orderDetailData } = useQuery<OrderDetail | undefined>({
    queryKey: ["fnbOrderDetail", schedule._id],
    queryFn: () =>
      schedule._id
        ? fnbOrderApis
            .getFnbOrderDetail(schedule._id)
            .then((res) => res.data.result as OrderDetail)
        : Promise.resolve(undefined),
    enabled: isOpen && !!schedule._id,
    refetchOnWindowFocus: false,
  });

  // Mutation để cập nhật số lượng (dùng add/remove)
  const { mutate: updateQuantity, isPending: isUpdatingQuantity } = useMutation(
    {
      mutationFn: async ({
        itemId,
        quantity,
        category,
      }: {
        itemId: string;
        quantity: number;
        category: string;
      }) => {
        if (!schedule._id || !schedule.createdBy) return;

        // Get current quantity
        const currentQuantity =
          orderDetailData?.items?.drinks?.find((item) => item.itemId === itemId)
            ?.quantity ||
          orderDetailData?.items?.snacks?.find((item) => item.itemId === itemId)
            ?.quantity ||
          0;

        const diff = quantity - currentQuantity;

        if (diff === 0) return; // Không có thay đổi

        // Tạo payload đúng format API mới
        const isDrinks = category === "drinks";
        const payload: IAddRemoveItemRequestBody = {
          order: {
            ...(isDrinks
              ? { drinks: { [itemId]: Math.abs(diff) } }
              : { snacks: { [itemId]: Math.abs(diff) } }),
          },
          createdBy: schedule.createdBy,
        };

        if (diff > 0) {
          await fnbOrderApis.addItemToOrder(schedule._id, payload);
        } else if (diff < 0) {
          await fnbOrderApis.removeItemFromOrder(schedule._id, payload);
        }
      },
      onMutate: async ({ itemId, quantity }) => {
        // Cancel any outgoing refetches
        await queryClient.cancelQueries({
          queryKey: ["fnbOrderDetail", schedule._id],
        });

        // Snapshot the previous value
        const previousOrderData = queryClient.getQueryData([
          "fnbOrderDetail",
          schedule._id,
        ]);

        // Get current quantity to calculate diff
        const currentQuantity =
          orderDetailData?.items?.drinks?.find((item) => item.itemId === itemId)
            ?.quantity ||
          orderDetailData?.items?.snacks?.find((item) => item.itemId === itemId)
            ?.quantity ||
          0;

        const quantityDiff = quantity - currentQuantity;

        // Optimistically update to the new value
        queryClient.setQueryData(
          ["fnbOrderDetail", schedule._id],
          (old: OrderDetail | undefined) => {
            if (!old) return old;

            const newDrinks = old.items.drinks.map((item) =>
              item.itemId === itemId ? { ...item, quantity } : item,
            );
            const newSnacks = old.items.snacks.map((item) =>
              item.itemId === itemId ? { ...item, quantity } : item,
            );

            return {
              ...old,
              items: {
                drinks: newDrinks,
                snacks: newSnacks,
              },
            };
          },
        );

        // Optimistically update inventory
        queryClient.setQueriesData(
          { queryKey: ["menuItems"] },
          (old: { data?: { result?: unknown[] } } | undefined) => {
            if (!old?.data?.result) return old;
            return {
              ...old,
              data: {
                ...old.data,
                result: old.data.result.map((item: unknown) => {
                  const menuItem = item as {
                    _id: string;
                    inventory?: { quantity?: number };
                  };
                  if (menuItem._id === itemId) {
                    return {
                      ...(item as Record<string, unknown>),
                      inventory: {
                        ...menuItem.inventory,
                        quantity: Math.max(
                          0,
                          (menuItem.inventory?.quantity || 0) - quantityDiff,
                        ),
                      },
                    };
                  }
                  return item;
                }),
              },
            };
          },
        );

        return { previousOrderData, currentQuantity };
      },
      onError: (_err, _variables, context) => {
        // If the mutation fails, use the context returned from onMutate to roll back
        if (context?.previousOrderData) {
          queryClient.setQueryData(
            ["fnbOrderDetail", schedule._id],
            context.previousOrderData,
          );
        }
        // Rollback inventory
        if (context?.currentQuantity !== undefined) {
          const quantityDiff = _variables.quantity - context.currentQuantity;
          queryClient.setQueriesData(
            { queryKey: ["menuItems"] },
            (old: { data?: { result?: unknown[] } } | undefined) => {
              if (!old?.data?.result) return old;
              return {
                ...old,
                data: {
                  ...old.data,
                  result: old.data.result.map((item: unknown) => {
                    const menuItem = item as {
                      _id: string;
                      inventory?: { quantity?: number };
                    };
                    if (menuItem._id === _variables.itemId) {
                      return {
                        ...(item as Record<string, unknown>),
                        inventory: {
                          ...menuItem.inventory,
                          quantity: Math.max(
                            0,
                            (menuItem.inventory?.quantity || 0) + quantityDiff,
                          ),
                        },
                      };
                    }
                    return item;
                  }),
                },
              };
            },
          );
        }
        toast({
          title: "Lỗi",
          description: "Không thể cập nhật số lượng",
          variant: "destructive",
        });
      },
      onSuccess: () => {
        // Invalidate and refetch
        queryClient.invalidateQueries({
          queryKey: ["fnbOrderDetail", schedule._id],
        });
        // Refetch menuItems để đảm bảo inventory được cập nhật từ server
        queryClient.invalidateQueries({ queryKey: ["menuItems"] });
      },
    },
  );

  const menuItems = (menuItemsData?.data?.result ||
    []) as unknown as MenuItem[];
  const rooms = (roomsData?.data?.result || []) as IRoom[];
  const currentRoom = rooms.find((room) => room._id === schedule.roomId);
  const availableRooms = rooms.filter(
    (room) => room._id !== schedule.roomId && !isRoomUnderMaintenance(room),
  );

  // Nhãn + icon cho nguồn booking (giữ tông màu trung tính, không tô màu nền)
  const getSourceInfo = (source?: string) => {
    switch (source) {
      case "customer":
        return { label: "Khách đặt online", icon: Globe };
      case "admin":
        return { label: "Admin đặt", icon: UserCheck };
      case "walk-in":
        return { label: "Khách vãng lai", icon: Building };
      default:
        return { label: "Hệ thống", icon: User };
    }
  };

  // Hàm xử lý edit note
  const handleEditNote = () => {
    setIsEditingNote(true);
  };

  // Hàm xử lý save note
  const handleSaveNote = () => {
    updateNote(noteValue);
  };

  // Hàm xử lý cancel edit note
  const handleCancelEditNote = () => {
    setNoteValue(currentSchedule.note || "");
    setIsEditingNote(false);
  };

  React.useEffect(() => {
    if (!isOpen) {
      setPromotionSelectOpen(false);
      setRoomSelectOpen(false);
    }
  }, [isOpen]);

  React.useEffect(() => {
    return () => {
      document.body.style.removeProperty("pointer-events");
      document.body.style.removeProperty("overflow");
      document.documentElement.style.removeProperty("overflow");
    };
  }, []);

  // Khởi tạo state khi mở modal hoặc schedule/promotion đổi
  React.useEffect(() => {
    if (!isOpen || !schedule) return;

    setCurrentSchedule(schedule);
    const start = parseUTCToLocal(schedule.startTime);
    const defaultEnd = schedule.endTime
      ? parseUTCToLocal(schedule.endTime)
      : start.add(120, "minute");

    setAdjustedStartDate(start.format("YYYY-MM-DD"));
    setAdjustedEndDate(defaultEnd.format("YYYY-MM-DD"));
    setAdjustedStartTime(start.format("HH:mm"));
    setAdjustedEndTime(defaultEnd.format("HH:mm"));
    setNoteValue(schedule.note || "");
    setSelectedPromotion(schedule.promotionId || "");
    setIsEditingNote(false);
    setTargetRoomId("");
    setRoomChangeNote("");
  }, [isOpen, schedule._id, schedule.promotionId, schedule.note, schedule.startTime, schedule.endTime]);

  // Hàm xử lý tăng/giảm số lượng
  const handleQuantityChange = (
    itemId: string,
    currentQuantity: number,
    change: number,
    category: string,
  ) => {
    const newQuantity = Math.max(0, currentQuantity + change);
    updateQuantity({
      itemId,
      quantity: newQuantity,
      category, // Giữ nguyên "drinks" hoặc "snacks"
    });
  };

  const { mutate, isPending } = useMutation({
    mutationFn: (updateData: Partial<IRoomSchedule>) =>
      roomsScheduleApis.updateSchedule(schedule._id, updateData),
    onSuccess: (_, variables) => {
      refetchSchedules();
      if (variables.status) {
        onClose();
        toast({
          title: "Success",
          description: `Schedule updated to ${variables.status}`,
        });
      } else {
        toast({
          title: "Success",
          description: "Thời gian đã được cập nhật",
        });
      }
    },
  });

  // Mutation riêng để cập nhật promotion
  const { mutate: updatePromotion, isPending: isUpdatingPromotion } =
    useMutation({
      mutationFn: (promotionId: string | null) =>
        roomsScheduleApis.updateSchedule(schedule._id, { promotionId }),
      onMutate: async (newPromotionId) => {
        const queryKey = getRoomSchedulesQueryKeyForSchedule(schedule);

        await queryClient.cancelQueries({ queryKey });

        const previousSchedules =
          queryClient.getQueryData<IRoomSchedule[]>(queryKey);

        patchScheduleInRoomSchedulesCache(queryClient, schedule, {
          promotionId: newPromotionId || undefined,
        });

        setSelectedPromotion(newPromotionId || "");
        setCurrentSchedule((prev) => ({
          ...prev,
          promotionId: newPromotionId || undefined,
        }));

        return { previousSchedules, queryKey };
      },
      onSuccess: (_data, newPromotionId) => {
        persistSchedulePromotionInCache(
          queryClient,
          schedule,
          newPromotionId,
        );
        setSelectedPromotion(newPromotionId || "");
        setCurrentSchedule((prev) => ({
          ...prev,
          promotionId: newPromotionId || undefined,
        }));
        toast({
          title: "Success",
          description: "Khuyến mãi đã được cập nhật",
        });
      },
      onError: (_error, _newPromotionId, context) => {
        if (context?.previousSchedules && context?.queryKey) {
          queryClient.setQueryData(context.queryKey, context.previousSchedules);
        }
        const rollbackPromotionId =
          context?.previousSchedules?.find((s) => s._id === schedule._id)
            ?.promotionId || schedule.promotionId;
        setSelectedPromotion(rollbackPromotionId || "");
        setCurrentSchedule((prev) => ({
          ...prev,
          promotionId: rollbackPromotionId,
        }));
        toast({
          title: "Error",
          description: "Không thể cập nhật khuyến mãi",
          variant: "destructive",
        });
      },
    });

  const handlePromotionChange = (value: string) => {
    const nextPromotionId = value === "none" ? "" : value;
    setSelectedPromotion(nextPromotionId);
    updatePromotion(nextPromotionId || null);
  };

  // Mutation riêng để cập nhật note
  const { mutate: updateNote, isPending: isUpdatingNote } = useMutation({
    mutationFn: (note: string) =>
      roomsScheduleApis.updateSchedule(schedule._id, { note }),
    onMutate: async (newNote) => {
      const queryKey = getRoomSchedulesQueryKeyForSchedule(schedule);

      await queryClient.cancelQueries({ queryKey });

      const previousSchedules =
        queryClient.getQueryData<IRoomSchedule[]>(queryKey);

      patchScheduleInRoomSchedulesCache(queryClient, schedule, { note: newNote });

      setNoteValue(newNote);
      setCurrentSchedule((prev) => ({ ...prev, note: newNote }));

      return { previousSchedules, queryKey };
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Ghi chú đã được cập nhật",
      });
      setIsEditingNote(false);
      queryClient.invalidateQueries({
        queryKey: getRoomSchedulesQueryKeyForSchedule(schedule),
      });
    },
    onError: (error, _newNote, context) => {
      console.error("Error updating note:", error);

      // Rollback về giá trị cũ nếu có lỗi
      if (context?.previousSchedules && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousSchedules);
        // Rollback noteValue và currentSchedule
        const originalNote = schedule.note || "";
        setNoteValue(originalNote);
        setCurrentSchedule((prev) => ({ ...prev, note: originalNote }));
      }

      toast({
        title: "Error",
        description: "Không thể cập nhật ghi chú",
        variant: "destructive",
      });
    },
  });

  // Mutation đổi phòng
  const { mutate: changeRoom, isPending: isChangingRoom } = useMutation({
    mutationFn: (payload: IChangeRoomRequest) =>
      roomsScheduleApis.changeRoom(schedule._id, payload),
    onSuccess: () => {
      refetchSchedules();
      onClose();
      toast({
        title: "Đã đổi phòng",
        description: "Phòng đã được cập nhật. Danh sách nhạc chưa được chuyển.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Không thể đổi phòng, vui lòng thử lại",
        variant: "destructive",
      });
    },
  });

  const handleChangeRoom = () => {
    if (!targetRoomId) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng chọn phòng mới trước khi chuyển.",
        variant: "destructive",
      });
      return;
    }

    if (targetRoomId === schedule.roomId) {
      toast({
        title: "Phòng mới phải khác phòng cũ",
        description: "Vui lòng chọn phòng khác để chuyển.",
        variant: "destructive",
      });
      return;
    }

    const payload: IChangeRoomRequest = {
      roomId: schedule.roomId,
      newRoomId: targetRoomId,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      status: schedule.status,
      roomChangeNote: roomChangeNote || undefined,
      updatedBy: user?._id,
    };

    changeRoom(payload);
  };

  const handleUpdate = (newStatus: RoomStatus) => {
    const updateData: Partial<IRoomSchedule> = { status: newStatus };

    // Nếu chuyển sang "In use", sử dụng thời gian đã điều chỉnh hoặc thời gian hiện tại
    if (newStatus === RoomStatus.InUse) {
      if (adjustedStartTime) {
        // Sử dụng thời gian đã điều chỉnh
        const datePart =
          adjustedStartDate ||
          parseUTCToLocal(schedule.startTime).format("YYYY-MM-DD");
        const newStartIso = wallTimeVietnamToUtcIso(
          datePart,
          adjustedStartTime,
        );
        if (newStartIso) {
          updateData.startTime = newStartIso;
          // Thông báo cho người dùng biết đã sử dụng thời gian đã điều chỉnh
          toast({
            title: "Thời gian đã được điều chỉnh",
            description: `Sử dụng thời gian bắt đầu: ${adjustedStartTime}`,
          });
        } else {
          // Nếu thời gian không hợp lệ, sử dụng thời gian hiện tại
          updateData.startTime = toIsoStringWithZeroSubsecond(dayjs());
          toast({
            title: "Thời gian không hợp lệ",
            description: "Sử dụng thời gian hiện tại",
          });
        }
      } else {
        // Nếu chưa điều chỉnh thời gian, sử dụng thời gian hiện tại
        updateData.startTime = toIsoStringWithZeroSubsecond(dayjs());
      }
    }
    // Nếu chuyển sang "Cancelled", cập nhật endTime thành thời gian hiện tại.
    else if (newStatus === RoomStatus.Cancelled) {
      updateData.endTime = toIsoStringWithZeroSubsecond(dayjs());
    }

    // Gọi API update với dữ liệu mới (bao gồm status và thời gian)
    mutate(updateData);
  };

  // Hàm cập nhật thời gian mới dựa vào input
  const handleUpdateTime = () => {
    // Lấy phần ngày, cho phép chỉnh riêng start date và end date
    const fallbackDate = parseUTCToLocal(schedule.startTime).format(
      "YYYY-MM-DD",
    );
    const startDatePart = adjustedStartDate || fallbackDate;
    const endDatePart = adjustedEndDate || startDatePart;

    const newStartIso = wallTimeVietnamToUtcIso(
      startDatePart,
      adjustedStartTime,
    );
    let newEndIso = wallTimeVietnamToUtcIso(endDatePart, adjustedEndTime);

    if (!newStartIso || !newEndIso) {
      toast({
        title: "Invalid time",
        description: "Please enter valid times.",
      });
      return;
    }

    const startUtc = dayjs.utc(newStartIso);
    let endUtc = dayjs.utc(newEndIso);

    // Nếu end time nhỏ hơn start time (qua 00:00) thì tự động sang ngày hôm sau
    if (endUtc.isBefore(startUtc)) {
      endUtc = endUtc.add(1, "day");
      setAdjustedEndDate(endUtc.tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DD"));
      newEndIso = toIsoStringWithZeroSubsecond(endUtc);
    }

    const updateData: Partial<IRoomSchedule> = {
      startTime: newStartIso,
      endTime: newEndIso,
    };

    mutate(updateData);
  };

  // Kiểm tra xem có order nào không
  const hasOrders =
    orderDetailData &&
    orderDetailData.items &&
    ((orderDetailData.items.drinks &&
      orderDetailData.items.drinks.length > 0) ||
      (orderDetailData.items.snacks &&
        orderDetailData.items.snacks.length > 0));

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      setPromotionSelectOpen(false);
      setRoomSelectOpen(false);
      document.body.style.removeProperty("pointer-events");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        className="flex h-[100dvh] max-h-[100dvh] flex-col gap-0 overflow-hidden p-0 sm:h-auto sm:max-h-[90vh] sm:max-w-[560px]"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div className="flex h-full min-h-0 flex-1 flex-col">
          <DialogHeader className="shrink-0 gap-1 border-b px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] pr-12 sm:px-6 sm:pt-5">
            <DialogTitle className="text-lg font-semibold tracking-tight">
              Xử lý booking
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {eventStart.format("HH:mm")} – {eventEnd.format("HH:mm")}
              <span className="mx-1.5 text-border">·</span>
              {getSourceInfo(schedule.source).label}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-4">
              <ScheduleMemberSection
                inputId="booked-member-phone"
                phone={member.phone}
                savedPhone={member.savedPhone}
                onPhoneChange={member.setPhone}
                isPhoneDirty={member.isPhoneDirty}
                hasSavedValidPhone={member.hasSavedValidPhone}
                isSavingPhone={member.isSavingPhone}
                onSavePhone={member.savePhone}
                onClearPhone={member.clearPhone}
                showGiftToggle={false}
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
                schedule={schedule}
                physicalRoomType={currentRoom?.roomType}
                onUpdated={refetchSchedules}
              />

              <div className="rounded-md border bg-card text-sm">
                <div className="flex items-center justify-between border-b px-3 py-2">
                  <div><h4 className="font-semibold">Hình ảnh khách hàng</h4><p className="text-[11px] text-muted-foreground">Tối đa 1 ảnh · Ảnh mặc định được ẩn</p></div>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${photoDisplay?.state === "showing" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{photoDisplay?.state === "showing" ? "Đang hiển thị" : "Đang ẩn"}</span>
                </div>
                <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
                  <ImagePicker currentImage={photoPreview || photoDisplay?.photos?.[0]?.url} onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; setPhotoFiles([file]); setPhotoPreview(URL.createObjectURL(file)); }} onRemove={() => { setPhotoFiles([]); setPhotoPreview(""); }} />
                  <div className="flex flex-col gap-2">
                    <p className="text-xs text-muted-foreground">Staff kiểm tra ảnh trước khi bấm Hiện ảnh.</p>
                    <div className="flex flex-wrap gap-2">
                      {photoFiles.length > 0 && <Button size="sm" onClick={() => photoFiles.forEach((file) => photoMutation.mutate(file))} loading={photoMutation.isPending}>Tải ảnh lên</Button>}
                      <Button size="sm" onClick={() => displayMutation.mutate("showing")} disabled={!photoDisplay?.photos?.length || displayMutation.isPending}>Hiện ảnh</Button>
                      <Button size="sm" variant="outline" onClick={() => displayMutation.mutate("hidden")} disabled={displayMutation.isPending}>Ẩn ảnh</Button>
                      <Button size="sm" variant="destructive" onClick={() => deletePhotosMutation.mutate()} disabled={!photoDisplay?.photos?.length || deletePhotosMutation.isPending}>Xóa ảnh</Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Khuyến mãi</label>
                <Select
                  open={promotionSelectOpen}
                  onOpenChange={setPromotionSelectOpen}
                  value={selectedPromotion || "none"}
                  onValueChange={handlePromotionChange}
                  disabled={isUpdatingPromotion}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Chọn khuyến mãi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Không áp dụng</SelectItem>
                    {promotionList.map((promotion) => (
                      <SelectItem key={promotion._id} value={promotion._id}>
                        {promotion.name} ({promotion.discountPercentage}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium">Ghi chú</label>
                  {!isEditingNote && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-sm"
                      onClick={handleEditNote}
                      disabled={isUpdatingNote}
                    >
                      {currentSchedule.note ? "Sửa" : "Thêm"}
                    </Button>
                  )}
                </div>
                {isEditingNote ? (
                  <div className="flex flex-col gap-2">
                    <Input
                      value={noteValue}
                      onChange={(e) => setNoteValue(e.target.value)}
                      placeholder="Nhập ghi chú..."
                      className="h-9 w-full"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="h-8"
                        onClick={handleSaveNote}
                        loading={isUpdatingNote}
                      >
                        Lưu
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8"
                        onClick={handleCancelEditNote}
                        disabled={isUpdatingNote}
                      >
                        Hủy
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="break-words text-sm text-muted-foreground">
                    {currentSchedule.note || "Chưa có ghi chú"}
                  </p>
                )}
              </div>

              {schedule.upgraded && schedule.originalRoomType && (
                <p className="text-sm text-muted-foreground">
                  Đã nâng cấp từ phòng gốc:{" "}
                  <span className="font-medium text-foreground">
                    {schedule.originalRoomType}
                  </span>
                </p>
              )}

              <div className="flex flex-col gap-2 border-t pt-4">
                <p className="text-sm font-medium">Đổi phòng</p>
                <Select
                  open={roomSelectOpen}
                  onOpenChange={setRoomSelectOpen}
                  value={targetRoomId}
                  onValueChange={setTargetRoomId}
                  disabled={isLoadingRooms || availableRooms.length === 0}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue
                      placeholder={
                        availableRooms.length === 0
                          ? "Không còn phòng khác để đổi"
                          : "Chọn phòng muốn chuyển"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRooms.map((room) => (
                      <SelectItem key={String(room._id)} value={String(room._id)}>
                        {room.roomName} - {getRoomTypeLabel(room.roomType)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Textarea
                  placeholder="Lý do đổi phòng (tuỳ chọn)"
                  value={roomChangeNote}
                  onChange={(e) => setRoomChangeNote(e.target.value)}
                  className="min-h-[64px] resize-y text-sm"
                />

                <Button
                  variant="secondary"
                  className="h-9 w-fit"
                  onClick={handleChangeRoom}
                  loading={isChangingRoom}
                  disabled={availableRooms.length === 0}
                >
                  Chuyển sang phòng mới
                </Button>
              </div>

              {hasOrders && (
                <div className="flex flex-col gap-2 border-t pt-4">
                  <p className="text-sm font-medium">Đồ ăn & nước đã đặt</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {orderDetailData?.items?.drinks &&
                      orderDetailData.items.drinks.length > 0 && (
                        <div className="rounded-md border p-3">
                          <p className="mb-2 text-sm font-medium">Nước uống</p>
                          <div className="flex flex-col gap-1.5">
                            {orderDetailData.items.drinks.map((item) => (
                              <div
                                key={item.itemId}
                                className="flex items-center justify-between gap-2"
                              >
                                <span className="truncate text-sm">
                                  {item.name}
                                </span>
                                <div className="flex shrink-0 items-center gap-1.5">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      handleQuantityChange(
                                        item.itemId,
                                        item.quantity,
                                        -1,
                                        "drinks",
                                      )
                                    }
                                    disabled={isUpdatingQuantity}
                                    className="size-7 p-0"
                                  >
                                    <Minus className="size-3" />
                                  </Button>
                                  <span className="w-5 text-center text-sm tabular-nums">
                                    {item.quantity}
                                  </span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      handleQuantityChange(
                                        item.itemId,
                                        item.quantity,
                                        1,
                                        "drinks",
                                      )
                                    }
                                    disabled={isUpdatingQuantity}
                                    className="size-7 p-0"
                                  >
                                    <Plus className="size-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    {orderDetailData?.items?.snacks &&
                      orderDetailData.items.snacks.length > 0 && (
                        <div className="rounded-md border p-3">
                          <p className="mb-2 text-sm font-medium">Đồ ăn</p>
                          <div className="flex flex-col gap-1.5">
                            {orderDetailData.items.snacks.map((item) => (
                              <div
                                key={item.itemId}
                                className="flex items-center justify-between gap-2"
                              >
                                <span className="truncate text-sm">
                                  {item.name}
                                </span>
                                <div className="flex shrink-0 items-center gap-1.5">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      handleQuantityChange(
                                        item.itemId,
                                        item.quantity,
                                        -1,
                                        "snacks",
                                      )
                                    }
                                    disabled={isUpdatingQuantity}
                                    className="size-7 p-0"
                                  >
                                    <Minus className="size-3" />
                                  </Button>
                                  <span className="w-5 text-center text-sm tabular-nums">
                                    {item.quantity}
                                  </span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      handleQuantityChange(
                                        item.itemId,
                                        item.quantity,
                                        1,
                                        "snacks",
                                      )
                                    }
                                    disabled={isUpdatingQuantity}
                                    className="size-7 p-0"
                                  >
                                    <Plus className="size-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 border-t pt-4">
                <p className="text-sm font-medium">Điều chỉnh ngày & giờ</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="adjustedStartDate"
                      className="text-sm font-medium"
                    >
                      Ngày bắt đầu
                    </label>
                    <ScheduleDatePicker
                      id="adjustedStartDate"
                      value={adjustedStartDate}
                      onChange={setAdjustedStartDate}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="adjustedStartTime"
                      className="text-sm font-medium"
                    >
                      Giờ bắt đầu
                    </label>
                    <Input
                      id="adjustedStartTime"
                      type="time"
                      value={adjustedStartTime}
                      onChange={(e) => setAdjustedStartTime(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="adjustedEndDate"
                      className="text-sm font-medium"
                    >
                      Ngày kết thúc
                    </label>
                    <ScheduleDatePicker
                      id="adjustedEndDate"
                      value={adjustedEndDate}
                      onChange={setAdjustedEndDate}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="adjustedEndTime"
                      className="text-sm font-medium"
                    >
                      Giờ kết thúc
                    </label>
                    <Input
                      id="adjustedEndTime"
                      type="time"
                      value={adjustedEndTime}
                      onChange={(e) => setAdjustedEndTime(e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>
                <Button
                  variant="secondary"
                  className="h-9 w-fit"
                  onClick={handleUpdateTime}
                  loading={isPending}
                >
                  Cập nhật giờ
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 grid grid-cols-1 gap-2 border-t px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:grid-cols-2 sm:px-6 sm:py-4">
            <Button
              variant="outline"
              onClick={() => setIsMenuModalOpen(true)}
              className="h-9"
            >
              Đặt đồ ăn / uống
            </Button>
            <Button
              onClick={() => {
                handleUpdate(RoomStatus.InUse);
              }}
              loading={isPending}
              className="h-9"
            >
              Bắt đầu sử dụng
              {adjustedStartTime ? ` (${adjustedStartTime})` : ""}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                handleUpdate(RoomStatus.Cancelled);
              }}
              loading={isPending}
              className="h-9"
            >
              Hủy booking
            </Button>
            <Button variant="ghost" onClick={onClose} className="h-9">
              Đóng
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>

      <MenuItemsModal
        isOpen={isMenuModalOpen}
        onClose={() => setIsMenuModalOpen(false)}
        menuItems={menuItems}
        roomId={schedule.roomId}
        scheduleId={schedule._id}
        createdBy={schedule.createdBy}
      />
    </Dialog>
  );
};

export default ProcessBookedModal;

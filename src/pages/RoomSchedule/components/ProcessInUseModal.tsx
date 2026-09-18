import { OrderDetail } from "@/@types/FnbOrder";
import {
  getOrderItemQuantity,
  mergeBillItemsByItemId,
  mergeOrderDetailItems,
} from "@/utils/mergeOrderDetailItems";
import { BillGift } from "@/@types/Gift";
import { IRoom, IRoomSchedule } from "@/@types/Room";
import billAPis from "@/apis/bill.apis";
import fnbOrderApis from "@/apis/fnbOrder.apis";
import roomsScheduleApis, { IChangeRoomRequest } from "@/apis/roomSchedule.api";
import MenuItemsModal from "@/components/modules/RoomSchedule/MenuItemsModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PaymentMethod, RoomStatus } from "@/constants/enum";
import { toast } from "@/hooks/use-toast";
import dayjs, { parseUTCToLocal } from "@/lib/dayjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosResponse } from "axios";
import React, { useEffect, useMemo, useState } from "react";
import { useScheduleMemberPhone } from "../hooks/useScheduleMemberPhone";
import {
  getScheduleCustomerContact,
  isValidMemberEmail,
} from "../utils/memberPhone";
import {
  formatTierDiscountLabel,
  resolveBillMembershipDiscount,
} from "../utils/membershipDiscount";
import { isRoomUnderMaintenance } from "../utils/roomStatus";
import ScheduleMemberSection from "./ScheduleMemberSection";
import ImagePicker from "@/components/ui/image-picker";
import ScheduleRoomTypeSection from "./ScheduleRoomTypeSection";
import { getRoomTypeLabel } from "../utils/scheduleRoomType";
import {
  buildInvoiceGiftLines,
  getServedGiftRemainingQuota,
  toPaidBillItems,
  type InvoiceGiftLine,
} from "../utils/billGiftItems";
// import BillPreviewModal from "./BillPreviewModal";
// import { ApiResponse } from "@/@types/ApiResponse";
import { IBillMembership, IBillMembershipDiscount } from "@/@types/Bill";
import roomApis from "@/apis/room.apis";
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
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGetStandardPromotions } from "@/hooks/promotion";
import {
  getRoomSchedulesQueryKeyForSchedule,
  patchScheduleInRoomSchedulesCache,
  persistSchedulePromotionInCache,
} from "@/hooks/room-schedule";
import { useGetMenuItems } from "@/hooks/use-menu-items";
import useAuth from "@/hooks/useAuth";
import { showApiValidationErrorToast } from "@/utils/apiValidationError";
import { buildBillDateTimeFromSchedule } from "@/utils/billDateTime";
import { CalendarDays, Clock, Gift, Minus, Plus, Printer } from "lucide-react";

// Define bill interfaces
interface BillItem {
  description: string;
  price: number;
  quantity: number;
  originalPrice?: number;
  discountName?: string;
  discountPercentage?: number;
  promotionId?: string;
  itemId?: string; // Thêm itemId để có thể cập nhật số lượng
  category?: string; // Thêm category để có thể cập nhật số lượng
}

interface BillData {
  _id?: string;
  totalAmount?: number;
  roomTotal?: number;
  fnbTotal?: number;
  items?: BillItem[];
  createdAt?: string | Date;
  paymentMethod?: string;
  note?: string;
  endTime?: string | Date;
  startTime?: string | Date;
  gift?: BillGift;
  giftDiscountAmount?: number;
  membership?: IBillMembership;
  membershipDiscountAmount?: number;
  membershipDiscount?: IBillMembershipDiscount;
}

// Interface cho bill response từ API
interface BillResponse {
  items?: BillItem[];
  totalAmount?: number;
  roomTotal?: number;
  fnbTotal?: number;
  createdAt?: string | Date;
  paymentMethod?: string;
  note?: string;
  endTime?: string | Date;
  startTime?: string | Date;
  gift?: BillGift;
  giftDiscountAmount?: number;
  membership?: IBillMembership;
  membershipDiscountAmount?: number;
  membershipDiscount?: IBillMembershipDiscount;
}

interface BillResultWithNote extends BillResponse {
  note?: string;
}

interface ProcessInUseModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: IRoomSchedule;
  refetchSchedules?: () => void;
  onExtendSession: () => void;
}

const ProcessInUseModal: React.FC<ProcessInUseModalProps> = ({
  isOpen,
  onClose,
  schedule,
  refetchSchedules,
  onExtendSession,
}) => {
  const [isMenuItemsModalOpen, setIsMenuItemsModalOpen] = useState(false);
  const [isConfirmEndOpen, setIsConfirmEndOpen] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState<string>("");
  const [customEndTime, setCustomEndTime] = useState<string>("");
  const [customStartTime, setCustomStartTime] = useState<string>("");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [isEndDateManuallyAdjusted, setIsEndDateManuallyAdjusted] =
    useState<boolean>(false);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteValue, setNoteValue] = useState<string>("");
  const [targetRoomId, setTargetRoomId] = useState<string>("");
  const [roomChangeNote, setRoomChangeNote] = useState<string>("");
  const [customerPaidInput, setCustomerPaidInput] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"bill" | "member">("bill");
  const [expandMemberGiftPicker, setExpandMemberGiftPicker] = useState(false);
  const { data: menuItems } = useGetMenuItems();
  const { user } = useAuth();
  const { data: standardPromotions } = useGetStandardPromotions();
  const promotionList = standardPromotions?.data.result ?? [];
  const queryClient = useQueryClient();
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const { data: photoDisplayData, refetch: refetchPhotoDisplay } = useQuery({
    queryKey: ["schedulePhotoDisplay", schedule._id],
    queryFn: () => roomsScheduleApis.getPhotoDisplay(schedule._id),
    enabled: isOpen && !!schedule._id,
  });
  const photoDisplay = photoDisplayData?.data?.result;
  const photoMutation = useMutation({
    mutationFn: (file: File) => roomsScheduleApis.uploadPhoto(schedule._id, file),
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


  const member = useScheduleMemberPhone({
    scheduleId: schedule._id,
    initialPhone: schedule.customerPhone || "",
    initialGiftEnabled: schedule.giftEnabled,
    isOpen,
    refetchSchedules,
    onGiftServed: () => {
      queryClient.invalidateQueries({ queryKey: ["bill", schedule._id] });
      queryClient.invalidateQueries({
        queryKey: ["fnbOrderDetail", schedule._id],
      });
    },
  });

  const billPhone =
    member.hasSavedValidPhone && !member.isPhoneDirty
      ? member.savedPhone.trim()
      : "";

  const billQueryKey = [
    "bill",
    schedule._id,
    selectedPromotion,
    customEndTime,
    customStartTime,
    customStartDate,
    customEndDate,
    billPhone,
  ] as const;

  const openMenuItemsModal = () => setIsMenuItemsModalOpen(true);
  const closeMenuItemsModal = () => setIsMenuItemsModalOpen(false);

  // Giờ bắt đầu lấy từ schedule; giờ kết thúc mặc định = hiện tại (endTime trên schedule chỉ là dự kiến)
  useEffect(() => {
    if (isOpen) {
      const startLocal = parseUTCToLocal(schedule.startTime);
      const startDate = startLocal.format("YYYY-MM-DD");
      const startTime = startLocal.format("HH:mm");
      const endTimeNow = dayjs().format("HH:mm");
      const suggested = buildBillDateTimeFromSchedule({
        scheduleStartTime: schedule.startTime,
        selectedStartDate: startDate,
        selectedStartTime: startTime,
        selectedEndTime: endTimeNow,
      });

      setCustomStartDate(startDate);
      setCustomStartTime(startTime);
      setCustomEndTime(endTimeNow);
      setCustomEndDate(suggested.suggestedEndDate);
      setIsEndDateManuallyAdjusted(false);
      setCustomerPaidInput("");
      setSelectedPromotion(schedule.promotionId || "");
      setActiveTab("bill");
      setExpandMemberGiftPicker(false);
    }
  }, [isOpen, schedule._id, schedule.startTime, schedule.promotionId]);

  const focusMemberTabOnContactError = (
    fieldErrors: Record<string, string>,
  ) => {
    if (fieldErrors.customerEmail || fieldErrors.customerPhone) {
      setActiveTab("member");
    }
  };

  const getAppliedPromotion = () => {
    if (!selectedPromotion) return null;
    return promotionList.find((promo) => promo._id === selectedPromotion);
  };

  const appliedPromotion = getAppliedPromotion();

  const roomsData = queryClient.getQueryData<
    AxiosResponse<HTTPResponse<IRoom[]>>
  >(["rooms"]);

  // Fetch rooms để luôn có danh sách mới nhất cho dropdown đổi phòng
  const { data: fetchedRooms, isLoading: isLoadingRooms } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => roomApis.getRooms(),
    staleTime: 5 * 60 * 1000,
  });

  const room = roomsData?.data.result?.find(
    (room) => room._id === schedule.roomId,
  );
  const rooms = fetchedRooms?.data?.result || roomsData?.data.result || [];
  const availableRooms = rooms.filter(
    (room) => room._id !== schedule.roomId && !isRoomUnderMaintenance(room),
  );

  const { mutate, isPending } = useMutation({
    mutationFn: (payload: Partial<IRoomSchedule>) =>
      roomsScheduleApis.updateSchedule(schedule._id, payload),
    onSuccess: (_, variables) => {
      refetchSchedules?.();
      onClose();

      if (variables.status === RoomStatus.Finished) {
        const memberLabel =
          member.memberInfo?.full_name?.trim() ||
          member.memberInfo?.name?.trim() ||
          variables.customerPhone?.trim() ||
          member.savedPhone.trim() ||
          schedule.customerPhone ||
          "khách";
        const amountLabel = (totalAmount || 0).toLocaleString("vi-VN");

        toast({
          title: "Đã kết thúc phiên",
          description: `Bill ${amountLabel}đ đã lưu. Member ${memberLabel} sẽ được backend cộng điểm nếu SĐT hợp lệ.`,
        });
        return;
      }

      toast({
        title: "Success",
        description: `Schedule updated to ${variables.status}`,
      });
    },
    onError: (error) => {
      showApiValidationErrorToast(
        error,
        {
          title: "Error",
          description: "Không thể cập nhật lịch phòng",
        },
        { onFieldErrors: focusMemberTabOnContactError },
      );
    },
  });

  // Mutation riêng để cập nhật promotion trên schedule
  const { mutate: updatePromotion } = useMutation({
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

      return { previousSchedules, queryKey, newPromotionId };
    },
    onSuccess: (_data, newPromotionId) => {
      persistSchedulePromotionInCache(queryClient, schedule, newPromotionId);
      setSelectedPromotion(newPromotionId || "");
    },
    onError: (_error, _variables, context) => {
      if (context?.previousSchedules && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousSchedules);
      }
      const rollbackPromotionId =
        context?.previousSchedules?.find((s) => s._id === schedule._id)
          ?.promotionId || schedule.promotionId;
      setSelectedPromotion(rollbackPromotionId || "");
      toast({
        title: "Error",
        description: "Không thể cập nhật khuyến mãi",
        variant: "destructive",
      });
    },
  });

  // Mutation riêng để cập nhật note
  const { mutate: updateNote, isPending: isUpdatingNote } = useMutation({
    mutationFn: (note: string) =>
      roomsScheduleApis.updateSchedule(schedule._id, { note }),
    onSuccess: () => {
      refetchSchedules?.();
    },
    onError: (error) => {
      console.error("Error updating note:", error);
      toast({
        title: "Error",
        description: "Không thể cập nhật ghi chú",
        variant: "destructive",
      });
    },
  });

  const { mutate: updateScheduleTime, isPending: isUpdatingTime } = useMutation(
    {
      mutationFn: (payload: { startTime: string; endTime: string }) =>
        roomsScheduleApis.updateSchedule(schedule._id, payload),
      onSuccess: (_, variables) => {
        patchScheduleInRoomSchedulesCache(queryClient, schedule, {
          startTime: variables.startTime,
          endTime: variables.endTime,
        });
        refetchSchedules?.();
        queryClient.invalidateQueries({ queryKey: billQueryKey });
        toast({
          title: "Đã cập nhật giờ",
          description: "Thời gian bắt đầu / kết thúc đã được lưu.",
        });
      },
      onError: (mutationError) => {
        toast({
          title: "Không thể cập nhật giờ",
          description: mutationError.message || "Vui lòng thử lại.",
          variant: "destructive",
        });
      },
    },
  );

  // Mutation đổi phòng
  const { mutate: changeRoom, isPending: isChangingRoom } = useMutation({
    mutationFn: (payload: IChangeRoomRequest) =>
      roomsScheduleApis.changeRoom(schedule._id, payload),
    onSuccess: () => {
      refetchSchedules?.();
      toast({
        title: "Success",
        description:
          "Đã đổi phòng thành công. Queue nhạc đã được chuyển sang phòng mới.",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Không thể đổi phòng, vui lòng thử lại",
        variant: "destructive",
      });
    },
  });

  // Sau khi lưu size, cần tính lại tiền phòng theo size mới:
  // invalidate query bill để backend trả về giá đúng với roomType mới.
  const handleRoomTypeUpdated = () => {
    queryClient.invalidateQueries({ queryKey: billQueryKey });
    refetchSchedules?.();
  };

  const handleChangeRoom = () => {
    if (!targetRoomId) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng chọn phòng mới để chuyển.",
        variant: "destructive",
      });
      return;
    }

    if (targetRoomId === schedule.roomId) {
      toast({
        title: "Phòng mới phải khác phòng hiện tại",
        description: "Chọn phòng khác để tiếp tục.",
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

  // Mutation để cập nhật số lượng item (dùng add/remove)
  const { mutate: updateItemQuantity, isPending: isUpdatingQuantity } =
    useMutation({
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
        const currentQuantity = getOrderItemQuantity(orderDetailData, itemId);

        const diff = quantity - currentQuantity;

        if (diff === 0) return; // Không có thay đổi

        // Tạo payload đúng format API mới
        // Kiểm tra cả "drink" và "drinks", "snack" và "snacks"
        const isDrinks = category === "drinks" || category === "drink";
        const payload = {
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
          queryKey: billQueryKey,
        });

        // Cancel fnbOrderDetail queries
        await queryClient.cancelQueries({
          queryKey: ["fnbOrderDetail", schedule._id],
        });

        // Snapshot the previous values
        const previousBillData = queryClient.getQueryData(billQueryKey);

        const previousOrderData = queryClient.getQueryData([
          "fnbOrderDetail",
          schedule._id,
        ]);

        // Get current quantity from orderDetailData
        const currentQuantity = getOrderItemQuantity(orderDetailData, itemId);

        const quantityDiff = quantity - currentQuantity;

        // Optimistically update bill data
        queryClient.setQueryData(
          billQueryKey,
          (
            old:
              | {
                  data?: {
                    result?: {
                      items?: BillItem[];
                      roomTotal?: number;
                      fnbTotal?: number;
                      totalAmount?: number;
                    };
                  };
                }
              | undefined,
          ) => {
            if (!old?.data?.result?.items) return old;

            const updatedItems = mergeBillItemsByItemId(
              old.data.result.items,
            ).map((item: BillItem) =>
              item.itemId === itemId ? { ...item, quantity } : item,
            );

            // Recalculate totals
            const newFnBTotal = updatedItems.reduce(
              (sum: number, item: BillItem) => sum + item.price * item.quantity,
              0,
            );

            const newTotalAmount =
              (old.data.result.roomTotal || 0) + newFnBTotal;

            return {
              ...old,
              data: {
                ...old.data,
                result: {
                  ...old.data.result,
                  items: updatedItems,
                  fnbTotal: newFnBTotal,
                  totalAmount: newTotalAmount,
                },
              },
            };
          },
        );

        // Optimistically update orderDetailData
        queryClient.setQueryData(
          ["fnbOrderDetail", schedule._id],
          (old: OrderDetail | undefined) => {
            if (!old) return old;

            const newDrinks = mergeOrderDetailItems(old.items.drinks).map(
              (item) => (item.itemId === itemId ? { ...item, quantity } : item),
            );
            const newSnacks = mergeOrderDetailItems(old.items.snacks).map(
              (item) => (item.itemId === itemId ? { ...item, quantity } : item),
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

        // Optimistically update menuItems inventory
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

        return { previousBillData, previousOrderData, currentQuantity };
      },
      onError: (_err, _variables, context) => {
        // If the mutation fails, use the context returned from onMutate to roll back
        if (context?.previousBillData) {
          queryClient.setQueryData(billQueryKey, context.previousBillData);
        }
        if (context?.previousOrderData) {
          queryClient.setQueryData(
            ["fnbOrderDetail", schedule._id],
            context.previousOrderData,
          );
        }
        // Rollback menuItems inventory
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
          queryKey: billQueryKey,
        });
        queryClient.invalidateQueries({
          queryKey: ["fnbOrderDetail", schedule._id],
        });
        // Refetch menuItems để đảm bảo inventory được cập nhật từ server
        queryClient.invalidateQueries({ queryKey: ["menuItems"] });
      },
    });

  const billDateTimePayload = buildBillDateTimeFromSchedule({
    scheduleStartTime: schedule.startTime,
    selectedStartTime: customStartTime,
    selectedStartDate: customStartDate || undefined,
    selectedEndTime: customEndTime,
    selectedEndDate: customEndDate || undefined,
  });

  // Bill data query - gọi với thời gian thực tế ngay từ đầu
  const { data: billData } = useQuery({
    queryKey: billQueryKey,
    queryFn: () => {
      return billAPis.getBillByScheduleId(
        schedule._id,
        selectedPromotion || undefined,
        billDateTimePayload.actualEndTime,
        billDateTimePayload.actualStartTime,
        undefined,
        billPhone || undefined,
      );
    },
    enabled: isOpen && !!customStartTime && !!customEndTime,
  });

  // Set note value when bill data changes
  useEffect(() => {
    if (billData?.data.result && "note" in billData.data.result) {
      setNoteValue((billData.data.result as BillResultWithNote).note || "");
    }
  }, [billData?.data.result]);

  // Query để lấy order detail để có itemId và category
  const { data: orderDetailData } = useQuery<OrderDetail | undefined>({
    queryKey: ["fnbOrderDetail", schedule._id],
    queryFn: () =>
      schedule._id
        ? fnbOrderApis
            .getFnbOrderDetail(schedule._id)
            .then((res) => res.data.result as OrderDetail)
        : Promise.resolve(undefined),
    enabled: isOpen && !!schedule._id,
  });

  // Mapping items với itemId và category từ orderDetailData
  const itemsWithDetails = React.useMemo(() => {
    if (!billData?.data.result) {
      return (billData?.data.result as BillResponse)?.items || [];
    }

    const orderItems = orderDetailData
      ? [
          ...(orderDetailData.items?.drinks || []),
          ...(orderDetailData.items?.snacks || []),
        ]
      : [];

    const billItems = (billData.data.result as BillResponse)?.items || [];

    const mappedItems = billItems.map((item: BillItem) => {
      // Thử tìm trong orderDetailData trước
      let orderItem = orderItems.find(
        (orderItem) =>
          orderItem.name === item.description ||
          orderItem.itemId === item.itemId,
      );

      // Nếu không tìm thấy trong orderDetailData, thử tìm trong menuItems
      if (!orderItem && menuItems) {
        const menuItem = menuItems.find(
          (menuItem) => menuItem.name === item.description,
        );
        if (menuItem) {
          orderItem = {
            itemId: menuItem._id,
            category: menuItem.category,
            name: menuItem.name,
            price: menuItem.price,
            quantity: item.quantity,
          };
        }
      }

      return {
        ...item,
        itemId: orderItem?.itemId || item.itemId,
        category: orderItem?.category || item.category,
      };
    });

    return mergeBillItemsByItemId(mappedItems);
  }, [billData?.data.result, orderDetailData, menuItems]);

  // Sử dụng trực tiếp dữ liệu từ API vì backend đã tính toán promotion
  const billResult = (billData?.data.result || {}) as BillData;
  const {
    totalAmount,
    roomTotal,
    createdAt,
    fnbTotal,
    paymentMethod = PaymentMethod.BankTransfer,
    note,
    gift,
    giftDiscountAmount = 0,
    membership: billMembership,
    membershipDiscountAmount: billMembershipDiscountAmount,
    membershipDiscount: billMembershipDiscount,
  } = billResult;
  const items = itemsWithDetails;
  const giftLines = useMemo(
    () => buildInvoiceGiftLines(member.servedGifts, gift),
    [member.servedGifts, gift],
  );
  const paidItems = useMemo(
    () => toPaidBillItems(items, giftLines),
    [items, giftLines],
  );
  const giftRemainingQuota = useMemo(
    () => getServedGiftRemainingQuota(member.servedGifts),
    [member.servedGifts],
  );
  const hasBillRows = paidItems.length > 0 || giftLines.length > 0;

  const membershipDiscountDisplay = useMemo(
    () =>
      resolveBillMembershipDiscount({
        membership: billMembership,
        membershipDiscount: billMembershipDiscount,
        membershipDiscountAmount: billMembershipDiscountAmount,
      }),
    [billMembership, billMembershipDiscount, billMembershipDiscountAmount],
  );
  const membershipDiscountLabel = formatTierDiscountLabel(
    membershipDiscountDisplay,
  );
  const membershipDiscountApplied =
    membershipDiscountDisplay?.appliedAmount !== undefined &&
    membershipDiscountDisplay.appliedAmount > 0
      ? membershipDiscountDisplay.appliedAmount
      : 0;
  const hasMembershipDiscountUi = Boolean(
    membershipDiscountDisplay &&
    (membershipDiscountLabel ||
      membershipDiscountApplied > 0 ||
      membershipDiscountDisplay.tier ||
      membershipDiscountDisplay.name),
  );

  const amountToThousands = (amount: number) => Math.round(amount / 1000);

  const parsePaidToThousands = (value: string): number | null => {
    const digits = value.replace(/\D/g, "");
    if (!digits) return null;
    const num = Number(digits);
    if (!Number.isFinite(num)) return null;
    return num >= 1000 ? amountToThousands(num) : num;
  };

  const billTotalThousands = amountToThousands(totalAmount || 0);
  const customerPaidThousands = parsePaidToThousands(customerPaidInput);
  const changeThousands =
    customerPaidThousands !== null
      ? customerPaidThousands - billTotalThousands
      : null;

  const handleCompleteSession = async () => {
    const actualEndTime = billDateTimePayload.actualEndTime;
    const actualStartTime = billDateTimePayload.actualStartTime;

    const { customerEmail } = getScheduleCustomerContact({
      memberInfo: member.memberInfo,
      scheduleCustomerName: schedule.customerName,
      scheduleCustomerEmail: schedule.customerEmail,
    });
    if (!isValidMemberEmail(customerEmail)) {
      toast({
        title: "Email không hợp lệ",
        description:
          "Vui lòng cập nhật lại email thành viên trước khi kết thúc",
        variant: "destructive",
      });
      return;
    }

    // Auto-save SĐT nếu đang dirty (đã nhập nhưng chưa bấm Lưu)
    const ensuredPhone = await member.ensurePhoneSavedForSubmit();
    if (ensuredPhone === null) return;

    // Dùng đúng SĐT đã ensure (kể cả "" khi đã clear) — không fallback schedule cũ
    const customerPhone = ensuredPhone;
    setIsConfirmEndOpen(false);

    // Tạo bill object để save
    const billToSave = {
      scheduleId: schedule._id,
      roomId: schedule.roomId,
      items: items || [],
      totalAmount: totalAmount || 0,
      customerPhone,
      phone: customerPhone || undefined,
      paymentMethod: paymentMethod,
      startTime: actualStartTime,
      endTime: actualEndTime,
      note: noteValue || note,
      promotionId: selectedPromotion || undefined,
    };

    // Save bill trước khi update schedule status
    saveBillMutation(billToSave, {
      onSuccess: () => {
        // Invalidate membership/streak queries để refresh member info
        if (customerPhone) {
          queryClient.invalidateQueries({
            queryKey: ["streak-gifts", customerPhone],
          });
        }

        const { customerName, customerEmail } = getScheduleCustomerContact({
          memberInfo: member.memberInfo,
          scheduleCustomerName: schedule.customerName,
          scheduleCustomerEmail: schedule.customerEmail,
        });

        // Sau khi save bill thành công, update schedule status
        const updateData: Partial<IRoomSchedule> = {
          ...schedule,
          status: RoomStatus.Finished,
          endTime: actualEndTime,
          startTime: actualStartTime,
          customerPhone,
          customerName,
          customerEmail,
        };
        mutate(updateData, { onSuccess: () => refetchSchedules?.() });
      },
    });
  };

  const handleExtendSession = () => {
    onExtendSession();
  };

  const handlePaymentMethodChange = (value: string) => {
    queryClient.setQueryData(billQueryKey, (oldData: unknown) => {
      if (!oldData) return oldData;
      const typedOldData = oldData as {
        data?: {
          result?: {
            paymentMethod?: string;
          };
        };
      };
      return {
        ...typedOldData,
        data: {
          ...typedOldData.data,
          result: {
            ...typedOldData.data?.result,
            paymentMethod: value,
          },
        },
      };
    });
  };

  const handlePromotionChange = (value: string) => {
    const nextPromotionId = value === "none" ? "" : value;
    setSelectedPromotion(nextPromotionId);
    updatePromotion(nextPromotionId || null);
  };

  const syncSuggestedEndDate = (
    nextStartDate: string,
    nextStartTime: string,
    nextEndTime: string,
  ) => {
    if (isEndDateManuallyAdjusted) return;

    const suggested = buildBillDateTimeFromSchedule({
      scheduleStartTime: schedule.startTime,
      selectedStartDate: nextStartDate || undefined,
      selectedStartTime: nextStartTime,
      selectedEndTime: nextEndTime,
    });
    setCustomEndDate(suggested.suggestedEndDate);
  };

  const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextEndTime = e.target.value;
    setCustomEndTime(nextEndTime);
    syncSuggestedEndDate(customStartDate, customStartTime, nextEndTime);
  };

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextStartTime = e.target.value;
    setCustomStartTime(nextStartTime);
    syncSuggestedEndDate(customStartDate, nextStartTime, customEndTime);
  };

  const handleStartDateChange = (date?: Date) => {
    if (!date) return;
    const nextStartDate = dayjs(date).format("YYYY-MM-DD");
    setCustomStartDate(nextStartDate);
    syncSuggestedEndDate(nextStartDate, customStartTime, customEndTime);
  };

  const handleEndDateChange = (date?: Date) => {
    if (!date) return;

    setCustomEndDate(dayjs(date).format("YYYY-MM-DD"));
    setIsEndDateManuallyAdjusted(true);
  };

  const handleUpdateScheduleTime = () => {
    if (!customStartTime || !customEndTime || !customStartDate) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng nhập đủ ngày/giờ bắt đầu và kết thúc.",
        variant: "destructive",
      });
      return;
    }

    const { actualStartTime, actualEndTime, suggestedEndDate, isCrossDay } =
      buildBillDateTimeFromSchedule({
        scheduleStartTime: schedule.startTime,
        selectedStartDate: customStartDate,
        selectedStartTime: customStartTime,
        selectedEndTime: customEndTime,
        selectedEndDate: customEndDate || undefined,
      });

    if (!dayjs(actualEndTime).isAfter(dayjs(actualStartTime))) {
      toast({
        title: "Giờ không hợp lệ",
        description: "Thời gian kết thúc phải sau thời gian bắt đầu.",
        variant: "destructive",
      });
      return;
    }

    if (isCrossDay && !customEndDate) {
      setCustomEndDate(suggestedEndDate);
    }

    updateScheduleTime({
      startTime: actualStartTime,
      endTime: actualEndTime,
    });
  };

  // Functions để xử lý edit note
  const handleEditNote = () => {
    setIsEditingNote(true);
  };

  const handleSaveNote = () => {
    // Cập nhật note trong query cache

    // Gọi API để cập nhật note trong room schedule
    updateNote(noteValue, {
      onSuccess: () => {
        queryClient.setQueryData(
          billQueryKey,
          (oldData: AxiosResponse<HTTPResponse<BillResponse>>) => {
            if (!oldData) return oldData;

            const updatedData: AxiosResponse<HTTPResponse<BillResponse>> = {
              ...oldData,
              data: {
                ...oldData.data,
                result: {
                  ...oldData.data.result,
                  note: noteValue,
                },
              },
            };

            return updatedData;
          },
        );
        toast({
          title: "Success",
          description: "Ghi chú đã được cập nhật",
        });
      },
    });

    setIsEditingNote(false);
    toast({
      title: "Success",
      description: "Ghi chú đã được cập nhật",
    });
  };

  const handleCancelEditNote = () => {
    const currentNote =
      billData?.data.result && "note" in billData.data.result
        ? (billData.data.result as BillResultWithNote).note
        : "";
    setNoteValue(currentNote || "");
    setIsEditingNote(false);
  };

  // Hàm xử lý tăng/giảm số lượng item
  const handleQuantityChange = (
    itemId: string,
    currentQuantity: number,
    change: number,
    category: string,
  ) => {
    const newQuantity = Math.max(0, currentQuantity + change);
    if (newQuantity === currentQuantity) return;

    updateItemQuantity({
      itemId,
      quantity: newQuantity,
      category,
    });
  };

  const formatVnd = (amount: number) =>
    (amount || 0).toLocaleString("vi-VN", {
      style: "currency",
      currency: "VND",
    });

  const isRecordingFee = (item: BillItem) =>
    item.description.toLowerCase().includes("phi dich vu thu am");

  const resolveItemTarget = (item: BillItem) => {
    if (item.itemId && item.category) {
      return { itemId: item.itemId, category: item.category };
    }
    const menuItem = menuItems?.find((m) => m.name === item.description);
    if (menuItem) {
      return { itemId: menuItem._id, category: menuItem.category };
    }
    return null;
  };

  const adjustItemQuantity = (item: BillItem, change: number) => {
    const target = resolveItemTarget(item);
    if (!target) return;
    const currentOrderQty = getOrderItemQuantity(
      orderDetailData,
      target.itemId,
    );
    handleQuantityChange(
      target.itemId,
      currentOrderQty,
      change,
      target.category,
    );
  };

  const goToMemberTabForGift = () => {
    setActiveTab("member");
    toast({
      title: "Sửa món tặng ở tab Member",
      description: "Nhập SĐT thành viên rồi cộng/trừ suất quà tại đó",
    });
  };

  const adjustGiftLineQuantity = (line: InvoiceGiftLine, change: number) => {
    if (!line.canEdit || !line.itemId) {
      goToMemberTabForGift();
      return;
    }
    const nextQty = line.quantity + change;
    if (change > 0 && line.remainingQuota <= 0) return;
    if (nextQty <= 0) {
      member.removeStreakGiftItem(line.streakCount, line.itemId);
      return;
    }
    member.updateStreakGiftItemQty(line.streakCount, line.itemId, nextQty);
  };

  // Sử dụng useMutation để gọi API in hóa đơn
  const { mutate: printBill } = useMutation({
    mutationFn: () =>
      billAPis.printBill(schedule._id, {
        paymentMethod,
        actualEndTime: billDateTimePayload.actualEndTime,
        actualStartTime: billDateTimePayload.actualStartTime,
        promotionId: selectedPromotion || undefined,
        phone: billPhone || undefined,
        customerPhone: billPhone || undefined,
      }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Hóa đơn đã được in",
      });
    },
    onError: (error) => {
      console.error("Lỗi khi tạo hóa đơn:", error);
      toast({
        title: "Error",
        description: "Có lỗi xảy ra khi tạo hóa đơn",
        variant: "destructive",
      });
    },
  });

  // Mutation để save bill vào collection bills
  const { mutate: saveBillMutation, isPending: isSavingBill } = useMutation({
    mutationFn: billAPis.saveBill,
    onSuccess: () => {},
    onError: (error) => {
      console.error("Lỗi khi lưu hóa đơn:", error);
      showApiValidationErrorToast(error, {
        title: "Error",
        description: "Có lỗi xảy ra khi lưu hóa đơn",
      });
    },
  });

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <DialogContent
          className="max-w-full max-h-[100dvh] overflow-x-hidden overflow-y-auto overscroll-y-contain gap-0 p-0 sm:max-h-[94vh] sm:max-w-5xl sm:w-[95vw]"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <div className="px-4 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-2 sm:pt-6 sm:pb-6">
            <DialogHeader className="pb-3 pr-10 space-y-1">
              <DialogTitle className="flex flex-wrap items-center gap-2 text-base sm:text-lg">
                <span>Thông tin phòng đang sử dụng</span>
                {room?.roomName && (
                  <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                    {room.roomName}
                  </span>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Bắt đầu {parseUTCToLocal(schedule.startTime).format("HH:mm")} ·
                Kết thúc dự kiến{" "}
                {schedule.endTime
                  ? parseUTCToLocal(schedule.endTime).format("HH:mm")
                  : "—"}
              </DialogDescription>
            </DialogHeader>

            <Tabs
              value={activeTab}
              onValueChange={(value) => {
                const nextTab = value as "bill" | "member";
                setActiveTab(nextTab);
                if (nextTab !== "member") {
                  setExpandMemberGiftPicker(false);
                }
              }}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 mb-4 h-11">
                <TabsTrigger value="bill" className="text-sm sm:text-base">
                  Hóa đơn
                </TabsTrigger>
                <TabsTrigger value="member" className="text-sm sm:text-base">
                  Member
                </TabsTrigger>
              </TabsList>

              <TabsContent value="bill" className="space-y-4 mt-0">
                {/* Bill Section */}
                <div className="rounded-md border bg-card text-sm">
                  <div className="flex items-center justify-between border-b px-3 py-2">
                    <h4 className="text-sm font-semibold">Hóa đơn</h4>
                    <span className="text-[11px] text-muted-foreground">
                      Mã {room?._id.slice(0, 2)}
                      {dayjs(createdAt || new Date()).format("HHmmDDMMYYYY")}
                    </span>
                  </div>

                  <div className="text-foreground">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 p-3 sm:grid-cols-4">
                      <div className="flex flex-col">
                        <span className="text-[11px] text-muted-foreground">
                          Phòng
                        </span>
                        <span className="font-medium">
                          {room?.roomName || "—"}
                        </span>
                      </div>
                      <div className="col-span-2 flex flex-col sm:col-span-1">
                        <span className="text-[11px] text-muted-foreground">
                          Size
                        </span>
                        <ScheduleRoomTypeSection
                          variant="inline"
                          schedule={schedule}
                          physicalRoomType={room?.roomType}
                          onUpdated={handleRoomTypeUpdated}
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[11px] text-muted-foreground">
                          Ngày tạo
                        </span>
                        <span className="font-medium">
                          {dayjs(createdAt || new Date()).format(
                            "DD/MM/YYYY HH:mm",
                          )}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[11px] text-muted-foreground">
                          Người tạo
                        </span>
                        <span className="font-medium">
                          {user?._id === schedule.createdBy
                            ? user?.name || "—"
                            : "—"}
                        </span>
                      </div>
                    </div>
                    <div className="mx-3 mb-3 rounded-md border bg-card text-sm">
                      <div className="flex items-center justify-between border-b px-3 py-2"><div><h4 className="font-semibold">Hình ảnh khách hàng</h4><p className="text-[11px] text-muted-foreground">Tối đa 1 ảnh · Staff có thể hiện hoặc ẩn</p></div><span className="text-[11px] text-muted-foreground">{photoDisplay?.state === "showing" ? "Đang hiển thị" : "Đang ẩn"}</span></div>
                      <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center"><ImagePicker currentImage={photoPreview || photoDisplay?.photos?.[0]?.url} onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; setPhotoFiles([file]); setPhotoPreview(URL.createObjectURL(file)); }} onRemove={() => { setPhotoFiles([]); setPhotoPreview(""); }} /><div className="flex flex-wrap gap-2">{photoFiles.length > 0 && <Button size="sm" onClick={() => photoFiles.forEach((file) => photoMutation.mutate(file))} loading={photoMutation.isPending}>Tải ảnh lên</Button>}<Button size="sm" onClick={() => displayMutation.mutate("showing")} disabled={!photoDisplay?.photos?.length || displayMutation.isPending}>Hiện ảnh</Button><Button size="sm" variant="outline" onClick={() => displayMutation.mutate("hidden")} disabled={displayMutation.isPending}>Ẩn ảnh</Button><Button size="sm" variant="destructive" onClick={() => deletePhotosMutation.mutate()} disabled={!photoDisplay?.photos?.length || deletePhotosMutation.isPending}>Xóa ảnh</Button></div></div>
                    </div>

                    <div className="border-t" />
                    <div className="grid gap-3 p-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label
                          htmlFor="start-date"
                          className="flex items-center gap-1 text-[11px] text-muted-foreground"
                        >
                          <CalendarDays className="h-3 w-3" />
                          Ngày bắt đầu
                        </Label>
                        <Popover modal={true}>
                          <PopoverTrigger asChild>
                            <Button
                              id="start-date"
                              type="button"
                              variant="outline"
                              className="h-9 w-full justify-between font-normal"
                            >
                              {customStartDate
                                ? dayjs(customStartDate).format("DD/MM/YYYY")
                                : "Chọn ngày"}
                              <CalendarDays className="h-4 w-4 opacity-60" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={
                                customStartDate
                                  ? dayjs(customStartDate).toDate()
                                  : undefined
                              }
                              onSelect={handleStartDateChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-1">
                        <Label
                          htmlFor="start-time"
                          className="flex items-center gap-1 text-[11px] text-muted-foreground"
                        >
                          <Clock className="h-3 w-3" />
                          Giờ bắt đầu
                        </Label>
                        <Input
                          id="start-time"
                          type="time"
                          value={customStartTime}
                          onChange={handleStartTimeChange}
                          className="h-9"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label
                          htmlFor="end-date"
                          className="text-[11px] text-muted-foreground"
                        >
                          Ngày kết thúc
                        </Label>
                        <Popover modal={true}>
                          <PopoverTrigger asChild>
                            <Button
                              id="end-date"
                              type="button"
                              variant="outline"
                              className="h-9 w-full justify-between font-normal"
                            >
                              {customEndDate
                                ? dayjs(customEndDate).format("DD/MM/YYYY")
                                : "Chọn ngày"}
                              <CalendarDays className="h-4 w-4 opacity-60" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={
                                customEndDate
                                  ? dayjs(customEndDate).toDate()
                                  : undefined
                              }
                              onSelect={handleEndDateChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-1">
                        <Label
                          htmlFor="end-time"
                          className="flex items-center gap-1 text-[11px] text-muted-foreground"
                        >
                          <Clock className="h-3 w-3" />
                          Giờ kết thúc
                        </Label>
                        <Input
                          id="end-time"
                          type="time"
                          value={customEndTime}
                          onChange={handleEndTimeChange}
                          className="h-9"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end px-3 pb-3">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleUpdateScheduleTime}
                        loading={isUpdatingTime}
                        disabled={
                          !customStartDate ||
                          !customStartTime ||
                          !customEndTime ||
                          isUpdatingTime
                        }
                      >
                        Cập nhật giờ
                      </Button>
                    </div>
                    <div className="border-t" />

                    <div className="p-3">
                      <div className="flex items-center gap-2 border-b pb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        <span className="min-w-0 flex-1">Tên</span>
                        <span className="w-[104px] shrink-0 text-center">
                          SL
                        </span>
                        <span className="hidden w-20 shrink-0 text-right sm:block">
                          Đơn giá
                        </span>
                        <span className="shrink-0 whitespace-nowrap text-right">
                          Thành tiền
                        </span>
                      </div>

                      {!hasBillRows ? (
                        <p className="py-3 text-center text-xs text-muted-foreground">
                          {giftRemainingQuota > 0
                            ? "Chưa có món — bấm Thêm món tặng để chọn suất quà"
                            : "Chưa có món nào"}
                        </p>
                      ) : (
                        <div className="divide-y">
                          {paidItems.map((item: BillItem, index: number) => (
                            <div
                              key={`paid-${item.itemId || item.description}-${index}`}
                              className="py-2"
                            >
                              <div className="flex items-center gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className="truncate">{item.description}</p>
                                  <p className="text-[11px] text-muted-foreground sm:hidden">
                                    {formatVnd(item.price)}/đv
                                  </p>
                                </div>
                                <div className="flex w-[104px] shrink-0 items-center justify-center gap-1">
                                  {isRecordingFee(item) ? (
                                    <span className="w-8 text-center font-medium">
                                      {item.quantity}
                                    </span>
                                  ) : (
                                    <>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          adjustItemQuantity(item, -1)
                                        }
                                        disabled={
                                          item.quantity <= 0 ||
                                          isUpdatingQuantity
                                        }
                                        className="h-7 w-7 shrink-0 p-0"
                                      >
                                        <Minus className="h-3 w-3" />
                                      </Button>
                                      <span className="w-8 text-center font-medium">
                                        {item.quantity}
                                      </span>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          adjustItemQuantity(item, 1)
                                        }
                                        disabled={isUpdatingQuantity}
                                        className="h-7 w-7 shrink-0 p-0"
                                      >
                                        <Plus className="h-3 w-3" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                                <span className="hidden w-20 shrink-0 text-right text-muted-foreground sm:block">
                                  {formatVnd(item.price)}
                                </span>
                                <span className="shrink-0 whitespace-nowrap pl-1 text-right font-medium">
                                  {formatVnd(item.price * item.quantity)}
                                </span>
                              </div>
                              {item.discountName && item.discountPercentage ? (
                                <div className="mt-0.5 flex items-center justify-between text-[11px] text-emerald-600">
                                  <span className="truncate">
                                    - {item.discountName} (
                                    {item.discountPercentage}
                                    %)
                                  </span>
                                  <span className="shrink-0">
                                    -
                                    {formatVnd(
                                      (item.price *
                                        item.quantity *
                                        (item.discountPercentage || 0)) /
                                        100,
                                    )}
                                  </span>
                                </div>
                              ) : null}
                            </div>
                          ))}
                          {giftLines.map((line) => (
                            <div
                              key={line.key}
                              className="rounded-md bg-emerald-50/70 py-2"
                            >
                              <div className="flex items-center gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex min-w-0 items-center gap-1.5">
                                    <p className="truncate">{line.name}</p>
                                    <Badge
                                      variant="secondary"
                                      className="shrink-0 border-emerald-200 bg-emerald-100 px-1.5 py-0 text-[10px] font-medium text-emerald-800"
                                    >
                                      Tặng
                                    </Badge>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground">
                                    {line.canEdit
                                      ? `Streak ${line.streakCount}`
                                      : "Cần SĐT để sửa"}
                                    {line.canEdit && line.remainingQuota > 0
                                      ? ` · còn ${line.remainingQuota} suất`
                                      : ""}
                                    <span className="sm:hidden"> · Tặng</span>
                                  </p>
                                </div>
                                <div className="flex w-[104px] shrink-0 items-center justify-center gap-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      adjustGiftLineQuantity(line, -1)
                                    }
                                    disabled={
                                      member.isMutatingGift ||
                                      line.quantity <= 0
                                    }
                                    className="h-7 w-7 shrink-0 p-0"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <span className="w-8 text-center font-medium">
                                    {line.quantity}
                                  </span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      adjustGiftLineQuantity(line, 1)
                                    }
                                    disabled={
                                      member.isMutatingGift ||
                                      (line.canEdit && line.remainingQuota <= 0)
                                    }
                                    className="h-7 w-7 shrink-0 p-0"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                                <span className="hidden w-20 shrink-0 text-right text-muted-foreground sm:block">
                                  {formatVnd(0)}
                                </span>
                                <span className="shrink-0 whitespace-nowrap pl-1 text-right font-medium text-emerald-700">
                                  Tặng
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="border-t" />

                    <div className="space-y-3 p-3">
                      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
                        <Label
                          htmlFor="bill-promotion"
                          className="flex items-center gap-1 text-[11px] text-muted-foreground sm:w-28 sm:shrink-0"
                        >
                          <Gift className="h-3 w-3" />
                          Khuyến mãi
                        </Label>
                        <Select
                          value={selectedPromotion || "none"}
                          onValueChange={handlePromotionChange}
                        >
                          <SelectTrigger
                            id="bill-promotion"
                            className="h-9 w-full sm:max-w-xs"
                          >
                            <SelectValue placeholder="Chọn khuyến mãi" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Không áp dụng</SelectItem>
                            {promotionList.map((promotion) => (
                              <SelectItem
                                key={promotion._id}
                                value={promotion._id}
                              >
                                {promotion.name} ({promotion.discountPercentage}
                                %)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {((gift?.type === "discount" &&
                        gift.discountPercentage) ||
                        giftDiscountAmount > 0) && (
                        <div className="space-y-1 rounded-md border bg-muted/40 p-2 text-xs">
                          <div className="flex items-center gap-2 font-medium">
                            <Gift className="h-3.5 w-3.5" />
                            <span>
                              Quà tặng
                              {gift?.name ? `: ${gift.name}` : ""}
                            </span>
                          </div>
                          {gift?.type === "discount" &&
                          gift.discountPercentage ? (
                            <p className="text-muted-foreground">
                              Giảm {gift.discountPercentage}%
                            </p>
                          ) : null}
                          {giftDiscountAmount > 0 && (
                            <p className="text-muted-foreground">
                              Trị giá giảm: {formatVnd(giftDiscountAmount)}
                            </p>
                          )}
                        </div>
                      )}

                      {appliedPromotion && (
                        <div className="space-y-0.5 rounded-md border bg-muted/40 p-2 text-xs">
                          <p className="font-medium">{appliedPromotion.name}</p>
                          {appliedPromotion.description && (
                            <p className="text-muted-foreground">
                              {appliedPromotion.description}
                            </p>
                          )}
                          <p className="font-medium text-emerald-600">
                            Giảm {appliedPromotion.discountPercentage}%
                          </p>
                        </div>
                      )}

                      {hasMembershipDiscountUi && (
                        <div className="space-y-0.5 rounded-md border border-emerald-200 bg-emerald-50/70 p-2 text-xs">
                          <p className="font-medium text-emerald-900">
                            Ưu đãi hạng thành viên
                            {membershipDiscountDisplay?.tier
                              ? ` (${membershipDiscountDisplay.tier})`
                              : ""}
                          </p>
                          {membershipDiscountDisplay?.name && (
                            <p className="text-muted-foreground">
                              {membershipDiscountDisplay.name}
                            </p>
                          )}
                          {membershipDiscountLabel && (
                            <p className="font-medium text-emerald-700">
                              {membershipDiscountLabel}
                            </p>
                          )}
                          {membershipDiscountDisplay?.note && (
                            <p className="text-muted-foreground">
                              {membershipDiscountDisplay.note}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="border-t" />

                    {/* Hiển thị chi tiết tính toán giá */}
                    <div className="space-y-1.5 p-3">
                      {/* Chi tiết từng khoản */}
                      {roomTotal && roomTotal > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Tiền phòng
                          </span>
                          <span className="ml-2 text-right font-medium">
                            {formatVnd(roomTotal)}
                          </span>
                        </div>
                      )}

                      {/* Tính toán giá gốc */}
                      {(() => {
                        let originalTotal = (roomTotal || 0) + (fnbTotal || 0);

                        if (originalTotal === 0 && items && items.length > 0) {
                          originalTotal = items.reduce(
                            (sum, item) => sum + item.price * item.quantity,
                            0,
                          );
                        }

                        if (originalTotal === 0 && totalAmount) {
                          originalTotal = totalAmount;
                        }

                        const promotionDiscountAmount = appliedPromotion
                          ? (originalTotal *
                              (appliedPromotion.discountPercentage || 0)) /
                            100
                          : 0;

                        // Tổng cuối cùng: sử dụng totalAmount từ API (đã được tính sẵn)
                        const finalTotal = totalAmount || 0;

                        return (
                          <>
                            {/* Giảm giá từ quà tặng */}
                            {giftDiscountAmount > 0 && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  Giảm quà tặng
                                  {gift?.name ? ` (${gift.name})` : ""}
                                </span>
                                <span className="ml-2 text-right font-medium text-emerald-600">
                                  -{formatVnd(giftDiscountAmount)}
                                </span>
                              </div>
                            )}
                            {/* Giảm giá promotion (nếu có) */}
                            {appliedPromotion &&
                              promotionDiscountAmount > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">
                                    Giảm {appliedPromotion.name} (
                                    {appliedPromotion.discountPercentage}%)
                                  </span>
                                  <span className="ml-2 text-right font-medium text-emerald-600">
                                    -{formatVnd(promotionDiscountAmount)}
                                  </span>
                                </div>
                              )}

                            {hasMembershipDiscountUi && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  Giảm hạng
                                  {membershipDiscountDisplay?.tier
                                    ? ` ${membershipDiscountDisplay.tier}`
                                    : ""}
                                  {membershipDiscountLabel
                                    ? ` (${membershipDiscountLabel.replace(/^Giảm\s+/i, "")})`
                                    : ""}
                                </span>
                                <span className="ml-2 text-right font-medium text-emerald-600">
                                  {membershipDiscountApplied > 0
                                    ? `-${formatVnd(membershipDiscountApplied)}`
                                    : membershipDiscountLabel || "—"}
                                </span>
                              </div>
                            )}

                            {/* Giá cuối cùng */}
                            <div className="mt-1.5 flex items-center justify-between border-t pt-2 text-base font-semibold">
                              <span>Tổng cộng</span>
                              <span className="ml-2 text-right">
                                {formatVnd(finalTotal)}
                              </span>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    <div className="border-t" />
                    <div className="space-y-3 p-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">
                            Phương thức thanh toán
                          </Label>
                          <Select
                            defaultValue={PaymentMethod.BankTransfer}
                            value={paymentMethod}
                            onValueChange={handlePaymentMethodChange}
                          >
                            <SelectTrigger className="h-9 w-full">
                              <SelectValue placeholder="Chọn phương thức" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={PaymentMethod.BankTransfer}>
                                Chuyển khoản
                              </SelectItem>
                              <SelectItem value={PaymentMethod.Cash}>
                                Tiền mặt
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label
                            htmlFor="customer-paid"
                            className="text-[11px] text-muted-foreground"
                          >
                            Khách đưa (nghìn)
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id="customer-paid"
                              type="text"
                              inputMode="numeric"
                              placeholder="500"
                              value={customerPaidInput}
                              onChange={(e) =>
                                setCustomerPaidInput(e.target.value)
                              }
                              className="h-9 w-28 font-mono"
                            />
                            {changeThousands !== null && (
                              <span
                                className={`text-sm font-semibold ${
                                  changeThousands < 0
                                    ? "text-red-600"
                                    : "text-emerald-600"
                                }`}
                              >
                                {changeThousands < 0 ? "Thiếu" : "Thừa"}{" "}
                                {Math.abs(changeThousands)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Note Section */}
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">
                          Ghi chú
                        </Label>
                        {isEditingNote ? (
                          <div className="space-y-2">
                            <Textarea
                              value={noteValue}
                              onChange={(e) => setNoteValue(e.target.value)}
                              placeholder="Nhập ghi chú..."
                              className="min-h-[72px] resize-y"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={handleSaveNote}
                                disabled={isUpdatingNote}
                                className="h-9"
                              >
                                {isUpdatingNote ? "Đang lưu..." : "Lưu"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelEditNote}
                                className="h-9"
                              >
                                Hủy
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="flex-1 break-words text-sm">
                              {note || (
                                <span className="text-muted-foreground">
                                  Chưa có ghi chú
                                </span>
                              )}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleEditNote}
                              disabled={isUpdatingNote}
                              className="h-9"
                            >
                              Chỉnh sửa
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Đổi phòng */}
                <div className="space-y-2 rounded-md border bg-muted/30 p-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Đổi phòng</h3>
                    <span className="text-[11px] text-muted-foreground">
                      Queue nhạc tự chuyển theo
                    </span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] sm:items-end">
                    <Select
                      value={targetRoomId}
                      onValueChange={setTargetRoomId}
                      disabled={isLoadingRooms || availableRooms.length === 0}
                    >
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue
                          placeholder={
                            availableRooms.length === 0
                              ? "Không còn phòng khác"
                              : "Chọn phòng mới"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRooms.map((room) => (
                          <SelectItem
                            key={String(room._id)}
                            value={String(room._id)}
                          >
                            {room.roomName} - {getRoomTypeLabel(room.roomType)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Input
                      value={roomChangeNote}
                      onChange={(e) => setRoomChangeNote(e.target.value)}
                      placeholder="Lý do đổi (nếu có)"
                      className="h-9"
                    />

                    <Button
                      variant="secondary"
                      onClick={handleChangeRoom}
                      loading={isChangingRoom}
                      disabled={availableRooms.length === 0}
                      className="h-9 w-full sm:w-auto"
                    >
                      Chuyển phòng
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="member" className="mt-0">
                <ScheduleMemberSection
                  inputId="in-use-member-phone"
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
                  hasClaimedGift={!!gift}
                  giftDetail={gift}
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
                  expandGiftPicker={expandMemberGiftPicker}
                />
              </TabsContent>
            </Tabs>

            <div className="mt-6 flex flex-col gap-2 border-t pt-4 sm:flex-row sm:flex-wrap sm:items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={openMenuItemsModal}
                className="h-9 w-full sm:w-auto"
              >
                Thêm món
              </Button>
              {giftRemainingQuota > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setExpandMemberGiftPicker(true);
                    setActiveTab("member");
                  }}
                  className="h-9 w-full sm:w-auto"
                >
                  <Gift className="mr-2 h-4 w-4" />
                  Thêm món tặng
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleExtendSession}
                disabled={isPending}
                className="h-9 w-full sm:w-auto"
              >
                Gia hạn
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => printBill()}
                className="h-9 w-full sm:w-auto"
              >
                <Printer className="mr-2 h-4 w-4" />
                In hóa đơn
              </Button>

              <div className="hidden flex-1 sm:block" />

              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isPending}
                className="h-9 w-full sm:w-auto"
              >
                Đóng
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsConfirmEndOpen(true)}
                disabled={isPending || isSavingBill || member.isSavingPhone}
                className="h-9 w-full sm:w-auto"
              >
                Kết thúc
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isConfirmEndOpen} onOpenChange={setIsConfirmEndOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kết thúc phiên?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn kết thúc phiên này không? Hành động này sẽ
              tạo hóa đơn và không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void handleCompleteSession();
              }}
              disabled={isSavingBill || isPending || member.isSavingPhone}
            >
              {member.isSavingPhone
                ? "Đang lưu SĐT..."
                : isSavingBill
                  ? "Đang lưu hóa đơn..."
                  : "Tiếp tục kết thúc"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MenuItemsModal
        isOpen={isMenuItemsModalOpen}
        onClose={closeMenuItemsModal}
        menuItems={menuItems || []}
        roomId={schedule.roomId}
        scheduleId={schedule._id}
        createdBy={schedule.createdBy}
      />
    </>
  );
};

export default ProcessInUseModal;

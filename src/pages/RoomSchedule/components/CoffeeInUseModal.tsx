import { CoffeeSessionStatus, ICoffeeSession } from "@/@types/CoffeeSession";
import {
  ICoffeeSessionOrder,
  ICoffeeSessionOrderDetail,
} from "@/@types/CoffeeSessionOrder";
import { IFnBCustomizationGroupTemplate } from "@/@types/FnBCustomization";
import coffeeSessionApis from "@/apis/coffeeSession.apis";
import coffeeSessionOrderApis from "@/apis/coffeeSessionOrder.apis";
import customizationGroupTemplateApis from "@/apis/customizationGroupTemplate.apis";
import fnbMenuApis from "@/apis/fnbMenu.apis";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FnBMenuItem } from "@/hooks/use-menu-items";
import { useToast } from "@/hooks/use-toast";
import useAuth from "@/hooks/useAuth";
import { useRoomEvents } from "@/context/RoomEventsContext";
import CoffeeOrderEditor from "@/pages/RoomSchedule/components/CoffeeOrderEditor";
import CoffeeOrderLineItemEditorDialog, {
  type CoffeeOrderLineItemEditorTarget,
} from "@/pages/RoomSchedule/components/CoffeeOrderLineItemEditorDialog";
import { mergeAggregatedIntoDetail } from "@/utils/coffeeSessionOrderBatch";
import {
  formatSelectionPrice,
  getLineItemSelectionDisplayGroups,
} from "@/utils/coffeeOrderLineItemSelections";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { Printer } from "lucide-react";
import React from "react";
import { AxiosError } from "axios";

interface CoffeeInUseModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: ICoffeeSession | null;
  tableName?: string;
  /** Mã bàn (code) để đồng bộ ẩn icon đơn mới sau khi phục vụ */
  tableCode?: string;
  defaultOpenOrderEditor?: boolean;
}

const EMPTY_ORDER: ICoffeeSessionOrder = {
  drinks: {},
  snacks: {},
  variants: {},
};

const toLegacyOrderShape = (
  order: ICoffeeSessionOrder | undefined | null,
): ICoffeeSessionOrder => {
  if (!order) return EMPTY_ORDER;

  if (order.drinks || order.snacks) {
    return {
      drinks: order.drinks || {},
      snacks: order.snacks || {},
      variants: order.variants || {},
      lines: order.lines,
    };
  }

  if (!Array.isArray(order.lines)) return EMPTY_ORDER;

  return order.lines.reduce<ICoffeeSessionOrder>(
    (acc, line) => {
      const category = String(line.category || "").toLowerCase();
      const targetKey =
        category === "drink" || category === "drinks" ? "drinks" : "snacks";
      const itemId = String(line.itemId || "");
      const quantity = Number(line.quantity) || 0;

      if (!itemId || quantity <= 0) return acc;
      acc[targetKey][itemId] = (acc[targetKey][itemId] || 0) + quantity;
      return acc;
    },
    {
      drinks: {},
      snacks: {},
      variants: order.variants || {},
      lines: order.lines,
    },
  );
};

const sanitizeOrder = (order: ICoffeeSessionOrder): ICoffeeSessionOrder => ({
  drinks: Object.fromEntries(
    Object.entries(order.drinks || {}).filter(([, quantity]) => quantity > 0),
  ),
  snacks: Object.fromEntries(
    Object.entries(order.snacks || {}).filter(([, quantity]) => quantity > 0),
  ),
  variants: Object.fromEntries(
    Object.entries(order.variants || {}).filter(([, values]) =>
      Object.values(values || {}).some((quantity) => quantity > 0),
    ),
  ),
});

const CoffeeInUseModal: React.FC<CoffeeInUseModalProps> = ({
  isOpen,
  onClose,
  session,
  tableName,
  tableCode,
  defaultOpenOrderEditor = false,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { clearCoffeeNewOrderAfterBatchServed } = useRoomEvents();
  const [customerName, setCustomerName] = React.useState("");
  const [customerPhone, setCustomerPhone] = React.useState("");
  const [peopleCount, setPeopleCount] = React.useState("1");
  const [note, setNote] = React.useState("");
  const [isOrderEditorExpanded, setIsOrderEditorExpanded] =
    React.useState(false);
  const [draftOrder, setDraftOrder] =
    React.useState<ICoffeeSessionOrder>(EMPTY_ORDER);
  const [editingLineTarget, setEditingLineTarget] =
    React.useState<CoffeeOrderLineItemEditorTarget | null>(null);
  const sessionDetailQuery = useQuery({
    queryKey: ["coffeeSession", session?._id],
    queryFn: async () => {
      if (!session?._id) return null;
      const response = await coffeeSessionApis.getCoffeeSessionById(
        session._id,
      );
      return (response.data.result || null) as ICoffeeSession | null;
    },
    enabled: isOpen && !!session?._id,
    refetchOnWindowFocus: false,
  });
  const sessionDetail = sessionDetailQuery.data || session;

  React.useEffect(() => {
    setCustomerName(sessionDetail?.customerName || "");
    setCustomerPhone(sessionDetail?.customerPhone || "");
    setPeopleCount(String(sessionDetail?.peopleCount || 1));
    setNote(sessionDetail?.note || "");
  }, [sessionDetail]);

  const menuItemsQuery = useQuery({
    queryKey: ["menuItems"],
    queryFn: fnbMenuApis.getAllMenuItems,
    select: (response) => (response.data.result || []) as FnBMenuItem[],
    enabled: isOpen,
  });

  const customizationTemplatesQuery = useQuery({
    queryKey: ["customizationGroupTemplates"],
    queryFn: customizationGroupTemplateApis.getTemplates,
    select: (response) =>
      (response.data.result || []) as IFnBCustomizationGroupTemplate[],
    enabled: isOpen,
  });

  const orderQuery = useQuery({
    queryKey: ["coffeeSessionOrder", sessionDetail?._id],
    queryFn: async () => {
      if (!sessionDetail?._id) return null;
      const response = await coffeeSessionOrderApis.getCoffeeSessionOrder(
        sessionDetail._id,
      );
      return (response.data.result || null) as ICoffeeSessionOrderDetail | null;
    },
    enabled: isOpen && !!sessionDetail?._id,
    refetchOnWindowFocus: false,
  });

  React.useEffect(() => {
    setDraftOrder(toLegacyOrderShape(orderQuery.data?.order));
  }, [orderQuery.data]);

  React.useEffect(() => {
    if (!isOpen) {
      setIsOrderEditorExpanded(false);
      setEditingLineTarget(null);
      return;
    }

    setIsOrderEditorExpanded(defaultOpenOrderEditor);
  }, [defaultOpenOrderEditor, isOpen]);

  const updateSessionMutation = useMutation({
    mutationFn: (status: CoffeeSessionStatus) =>
      coffeeSessionApis.updateCoffeeSession(sessionDetail?._id || "", {
        status,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        peopleCount: Math.max(1, Number(peopleCount) || 1),
        note: note.trim() || undefined,
      }),
    onSuccess: (_, status) => {
      queryClient.invalidateQueries({ queryKey: ["coffeeSessions"] });
      queryClient.invalidateQueries({
        queryKey: ["coffeeSession", sessionDetail?._id],
      });
      toast({
        title: "Cập nhật phiên thành công",
        description:
          status === "completed"
            ? "Phiên đã được hoàn tất."
            : "Đã lưu thông tin phiên đang sử dụng.",
      });
      onClose();
    },
    onError: (error: AxiosError<HTTPResponse<ICoffeeSession>>) => {
      console.error(error);
      toast({
        title: "Không thể cập nhật phiên",
        description: error.message || "Vui lòng thử lại.",
        variant: "destructive",
      });
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: (nextOrder: ICoffeeSessionOrder) =>
      coffeeSessionOrderApis.updateCoffeeSessionOrder(
        sessionDetail?._id || "",
        {
          order: sanitizeOrder(nextOrder),
          updatedBy: user?._id,
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["coffeeSessionOrder", sessionDetail?._id],
      });
      toast({
        title: "Cập nhật order thành công",
        description: "Order của phiên đã được đồng bộ.",
      });
    },
    onError: (error) => {
      setDraftOrder(orderQuery.data?.order || EMPTY_ORDER);
      toast({
        title: "Không thể cập nhật order",
        description: error.message || "Vui lòng thử lại.",
        variant: "destructive",
      });
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: () =>
      coffeeSessionOrderApis.deleteCoffeeSessionOrder(sessionDetail?._id || ""),
    onSuccess: () => {
      setDraftOrder(EMPTY_ORDER);
      queryClient.invalidateQueries({
        queryKey: ["coffeeSessionOrder", sessionDetail?._id],
      });
      toast({
        title: "Đã xóa order",
        description: "Order của phiên đã được xóa.",
      });
    },
    onError: (error) => {
      toast({
        title: "Không thể xóa order",
        description: error.message || "Vui lòng thử lại.",
        variant: "destructive",
      });
    },
  });

  const markBatchServedMutation = useMutation({
    mutationFn: (batchId: string) =>
      coffeeSessionOrderApis.markCoffeeSessionOrderBatchServed(
        sessionDetail?._id || "",
        batchId,
      ),
    onMutate: async (batchId) => {
      const sid = sessionDetail?._id;
      if (!sid) return undefined;
      await queryClient.cancelQueries({
        queryKey: ["coffeeSessionOrder", sid],
      });
      const prev = queryClient.getQueryData<ICoffeeSessionOrderDetail | null>([
        "coffeeSessionOrder",
        sid,
      ]);
      queryClient.setQueryData<ICoffeeSessionOrderDetail | null>(
        ["coffeeSessionOrder", sid],
        (old) => {
          if (!old?.batches?.length) return old;
          return {
            ...old,
            batches: old.batches.map((b) =>
              b.batchId === batchId
                ? {
                    ...b,
                    status: "served" as const,
                    servedAt: new Date().toISOString(),
                  }
                : b,
            ),
          };
        },
      );
      return { prev };
    },
    onError: (error, _batchId, ctx) => {
      const sid = sessionDetail?._id;
      if (sid && ctx?.prev !== undefined) {
        queryClient.setQueryData(["coffeeSessionOrder", sid], ctx.prev);
      }
      toast({
        title: "Không thể đánh dấu đã phục vụ",
        description: error.message || "Vui lòng thử lại.",
        variant: "destructive",
      });
    },
    onSuccess: (response) => {
      const sid = sessionDetail?._id;
      const result = response.data.result;
      if (!sid || !result) return;
      queryClient.setQueryData<ICoffeeSessionOrderDetail | null>(
        ["coffeeSessionOrder", sid],
        (old) => {
          if (!old) return old;
          if (result.aggregatedOrder) {
            return mergeAggregatedIntoDetail(old, result.aggregatedOrder);
          }
          if (!old.batches?.length) return old;
          return {
            ...old,
            batches: old.batches.map((b) =>
              b.batchId === result.batch.batchId ? result.batch : b,
            ),
          };
        },
      );
      toast({
        title: "Đã cập nhật batch",
        description: "Trạng thái phục vụ đã được lưu.",
      });
      if (
        tableCode &&
        result.batch?.batchId &&
        result.batch.status === "served"
      ) {
        clearCoffeeNewOrderAfterBatchServed({
          tableCode,
          batchId: result.batch.batchId,
          coffeeSessionId: sid,
        });
      }
    },
  });

  const printBatchMutation = useMutation({
    mutationFn: (batchId: string) =>
      coffeeSessionOrderApis.printCoffeeSessionOrderBatch(
        sessionDetail?._id || "",
        batchId,
      ),
    onSuccess: () => {
      toast({
        title: "Đã gửi lệnh in",
        description: "Phiếu order đã được gửi tới máy in.",
      });
    },
    onError: (error) => {
      toast({
        title: "Không thể in phiếu",
        description: error.message || "Vui lòng thử lại.",
        variant: "destructive",
      });
    },
  });

  const handleQuantityChange = (item: FnBMenuItem, nextQuantity: number) => {
    const category = item.category.toLowerCase();
    const targetKey =
      category === "drink" || category === "drinks" ? "drinks" : "snacks";

    const nextOrder: ICoffeeSessionOrder = {
      ...draftOrder,
      [targetKey]: {
        ...(draftOrder[targetKey] || {}),
        [item._id || ""]: nextQuantity,
      },
    };

    if (nextQuantity <= 0) {
      delete nextOrder[targetKey][item._id || ""];
    }

    setDraftOrder(nextOrder);
    updateOrderMutation.mutate(nextOrder);
  };

  const planSnapshot = sessionDetail?.planSnapshot;
  const startedAt = sessionDetail?.startTime || sessionDetail?.createdAt;
  const usageDurationMinutes = sessionDetail?.usageDurationMinutes;
  const totalOrderItems = React.useMemo(
    () =>
      Object.values(draftOrder.drinks || {}).reduce(
        (sum, qty) => sum + (Number(qty) || 0),
        0,
      ) +
      Object.values(draftOrder.snacks || {}).reduce(
        (sum, qty) => sum + (Number(qty) || 0),
        0,
      ),
    [draftOrder.drinks, draftOrder.snacks],
  );
  const editableOrderItems = React.useMemo(() => {
    const items = menuItemsQuery.data ?? [];
    const menuById = new Map(items.map((item) => [item._id || "", item]));
    const quantities = {
      ...(draftOrder.drinks || {}),
      ...(draftOrder.snacks || {}),
    };

    return Object.entries(quantities)
      .map(([itemId, quantity]) => {
        const qty = Number(quantity) || 0;
        if (qty <= 0) return null;
        const menuItem = menuById.get(itemId);
        if (!menuItem) return null;
        return { itemId, menuItem, quantity: qty };
      })
      .filter(
        (
          item,
        ): item is {
          itemId: string;
          menuItem: FnBMenuItem;
          quantity: number;
        } => item !== null,
      );
  }, [draftOrder.drinks, draftOrder.snacks, menuItemsQuery.data]);

  const orderHistoryItems = React.useMemo(() => {
    const menuItems = menuItemsQuery.data || [];
    const templates = customizationTemplatesQuery.data || [];

    if (orderQuery.data?.lineItems?.length) {
      return orderQuery.data.lineItems.map((item) => ({
        key: item.lineId || `${item.itemId}-${item.name}`,
        name: item.name,
        quantity: item.quantity,
        category: item.category,
        note: item.note,
        selectionGroups: getLineItemSelectionDisplayGroups(
          item,
          menuItems,
          templates,
        ),
      }));
    }

    const legacyItems = [
      ...(orderQuery.data?.items?.drinks || []),
      ...(orderQuery.data?.items?.snacks || []),
    ];

    return legacyItems.map((item, index) => ({
      key: `${item.itemId}-${index}`,
      name: item.name,
      quantity: item.quantity,
      category: item.category,
      note: undefined,
      selectionGroups: [],
    }));
  }, [customizationTemplatesQuery.data, menuItemsQuery.data, orderQuery.data]);

  const sortedOrderBatches = [...(orderQuery.data?.batches ?? [])].sort(
    (a, b) => dayjs(b.submittedAt).valueOf() - dayjs(a.submittedAt).valueOf(),
  );
  const orderTotals = orderQuery.data?.orderTotals;
  const isUpdatingOrder =
    updateOrderMutation.isPending || deleteOrderMutation.isPending;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="overflow-y-auto overscroll-y-contain sm:w-[95vw] sm:max-h-[94vh] sm:max-w-5xl">
          <DialogHeader className="pr-8">
            <DialogTitle>In-use coffee session</DialogTitle>
            <DialogDescription>
              Bàn{" "}
              <span className="font-medium">{tableName || "Coffee table"}</span>{" "}
              đang được sử dụng. Có thể cập nhật thông tin phiên tại đây.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border bg-muted/20 p-4">
                <div className="flex items-center gap-2">
                  <Badge variant="default">In use</Badge>
                  {sessionDetailQuery.isLoading && (
                    <Badge variant="secondary">Đang tải chi tiết...</Badge>
                  )}
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Bắt đầu sử dụng
                </p>
                <p className="font-medium">
                  {startedAt
                    ? dayjs(startedAt).format("HH:mm DD/MM/YYYY")
                    : "Chưa có"}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">PIN code</p>
                <p className="font-mono text-base font-semibold tracking-widest">
                  {sessionDetail?.pinCode || "Chưa có"}
                </p>
              </div>

              <div className="rounded-lg border bg-muted/20 p-4">
                <p className="text-sm text-muted-foreground">Giá snapshot</p>
                <p className="font-medium">
                  {planSnapshot?.pricePerPerson
                    ? `${planSnapshot.pricePerPerson.toLocaleString("vi-VN")} ${
                        planSnapshot.currency || "VND"
                      }/người`
                    : "Backend chưa trả snapshot giá"}
                </p>
              </div>

              <div className="rounded-lg border bg-muted/20 p-4">
                <p className="text-sm text-muted-foreground">
                  Tổng snapshot / thời lượng
                </p>
                <p className="font-medium">
                  {planSnapshot?.totalPrice
                    ? `${planSnapshot.totalPrice.toLocaleString("vi-VN")} ${
                        planSnapshot.currency || "VND"
                      }`
                    : `${peopleCount || "1"} người`}
                </p>
                {typeof usageDurationMinutes === "number" && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Đã dùng: {usageDurationMinutes} phút
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="in-use-people-count">Số người</Label>
              <Input
                id="in-use-people-count"
                type="number"
                min={1}
                value={peopleCount}
                onChange={(event) => setPeopleCount(event.target.value)}
                placeholder="Nhập số người"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="in-use-note">Ghi chú</Label>
              <Textarea
                id="in-use-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Ghi chú thêm cho ca sử dụng"
              />
            </div>

            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-semibold">Order</h3>
                  <p className="text-xs text-muted-foreground">
                    Thêm, sửa hoặc xóa món trực tiếp tại đây.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {sortedOrderBatches.some((b) => b.status === "pending") ? (
                    <Badge variant="destructive">Có đợt chờ phục vụ</Badge>
                  ) : null}
                  <Badge variant="secondary">
                    {totalOrderItems > 0
                      ? `${totalOrderItems} món`
                      : "Chưa có món"}
                  </Badge>
                  <Button
                    type="button"
                    size="sm"
                    variant={isOrderEditorExpanded ? "secondary" : "outline"}
                    disabled={
                      menuItemsQuery.isLoading ||
                      updateOrderMutation.isPending ||
                      deleteOrderMutation.isPending
                    }
                    onClick={() => setIsOrderEditorExpanded((prev) => !prev)}
                  >
                    {isOrderEditorExpanded ? "Ẩn menu món" : "Thêm món"}
                  </Button>
                </div>
              </div>
              {orderTotals ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  F&B: list {orderTotals.fnbListTotal.toLocaleString("vi-VN")} ·
                  tính phí {orderTotals.fnbChargedTotal.toLocaleString("vi-VN")}{" "}
                  <span className="opacity-75">
                    ({orderTotals.pricingMode})
                  </span>
                </p>
              ) : null}
              {orderQuery.isLoading ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Đang tải order...
                </p>
              ) : (
                <>
                  {editableOrderItems.length > 0 ? (
                    <div className="mt-3 space-y-2 rounded-md border bg-background p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium">Món trong order</p>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          loading={deleteOrderMutation.isPending}
                          disabled={
                            updateOrderMutation.isPending ||
                            deleteOrderMutation.isPending
                          }
                          onClick={() => deleteOrderMutation.mutate()}
                        >
                          Xóa toàn bộ
                        </Button>
                      </div>
                      {editableOrderItems.map(({ itemId, menuItem, quantity }) => (
                        <div
                          key={itemId}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {menuItem.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {menuItem.category.toLowerCase().startsWith("drink")
                                ? "Đồ uống"
                                : "Đồ ăn"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={
                                isUpdatingOrder ||
                                quantity <= 0
                              }
                              onClick={() =>
                                handleQuantityChange(
                                  menuItem,
                                  Math.max(0, quantity - 1),
                                )
                              }
                            >
                              -
                            </Button>
                            <Badge
                              variant="secondary"
                              className="min-w-10 justify-center"
                            >
                              {quantity}
                            </Badge>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={isUpdatingOrder}
                              onClick={() =>
                                handleQuantityChange(menuItem, quantity + 1)
                              }
                            >
                              +
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {sortedOrderBatches.length > 0 ? (
                    <div className="mt-3 space-y-3">
                      <p className="text-sm font-medium">Đợt order</p>
                      {sortedOrderBatches.map((batch) => (
                        <div
                          key={batch.batchId}
                          className="space-y-2 rounded-md border bg-background p-3"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="break-all font-mono text-xs text-muted-foreground">
                                {batch.batchId}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Gửi:{" "}
                                {dayjs(batch.submittedAt).format(
                                  "HH:mm DD/MM/YYYY",
                                )}
                              </p>
                              {batch.status === "served" && batch.servedAt ? (
                                <p className="text-xs text-muted-foreground">
                                  Phục vụ:{" "}
                                  {dayjs(batch.servedAt).format(
                                    "HH:mm DD/MM/YYYY",
                                  )}
                                </p>
                              ) : null}
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <Badge
                                variant={
                                  batch.status === "pending"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {batch.status === "pending"
                                  ? "Chờ phục vụ"
                                  : "Đã phục vụ"}
                              </Badge>
                              <div className="flex flex-wrap justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  loading={
                                    printBatchMutation.isPending &&
                                    printBatchMutation.variables ===
                                      batch.batchId
                                  }
                                  disabled={
                                    printBatchMutation.isPending ||
                                    !sessionDetail?._id
                                  }
                                  onClick={() =>
                                    printBatchMutation.mutate(batch.batchId)
                                  }
                                >
                                  <Printer className="h-3.5 w-3.5" aria-hidden />
                                  In phiếu
                                </Button>
                                {batch.status === "pending" ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    loading={
                                      markBatchServedMutation.isPending &&
                                      markBatchServedMutation.variables ===
                                        batch.batchId
                                    }
                                    disabled={
                                      markBatchServedMutation.isPending ||
                                      !sessionDetail?._id
                                    }
                                    onClick={() =>
                                      markBatchServedMutation.mutate(
                                        batch.batchId,
                                      )
                                    }
                                  >
                                    Đã phục vụ
                                  </Button>
                                ) : null}
                              </div>
                            </div>
                          </div>
                          <div className="space-y-1 border-t pt-2">
                            {batch.lineItems.map((item) => {
                              const batchSelectionGroups =
                                getLineItemSelectionDisplayGroups(
                                  item,
                                  menuItemsQuery.data || [],
                                  customizationTemplatesQuery.data || [],
                                );
                              const canEditLine = batch.status === "pending";
                              return (
                                <div
                                  key={item.lineId}
                                  className="flex items-start justify-between gap-2 text-sm"
                                >
                                  <div className="min-w-0">
                                    <p className="truncate font-medium">
                                      {item.name}
                                    </p>
                                    {batchSelectionGroups.length > 0 ? (
                                      <div className="mt-0.5 space-y-0.5 text-xs text-muted-foreground">
                                        {batchSelectionGroups.map((group) => (
                                          <p key={group.key}>
                                            <span className="font-medium text-foreground">
                                              {group.label}:
                                            </span>{" "}
                                            {group.options
                                              .map(
                                                (option) =>
                                                  `${option.label}${formatSelectionPrice(
                                                    option.priceDelta,
                                                  )}`,
                                              )
                                              .join(", ")}
                                          </p>
                                        ))}
                                      </div>
                                    ) : null}
                                    {item.note ? (
                                      <p className="mt-0.5 text-xs italic text-amber-800">
                                        Ghi chú: {item.note}
                                      </p>
                                    ) : null}
                                  </div>
                                  <div className="flex shrink-0 flex-col items-end gap-2">
                                    <span className="font-medium">
                                      ×{item.quantity}
                                    </span>
                                    {canEditLine ? (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        disabled={!sessionDetail?._id}
                                        onClick={() =>
                                          setEditingLineTarget({
                                            batchId: batch.batchId,
                                            lineItem: item,
                                          })
                                        }
                                      >
                                        Chỉnh
                                      </Button>
                                    ) : null}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {sortedOrderBatches.length === 0 &&
                  orderHistoryItems.length > 0 &&
                  editableOrderItems.length === 0 ? (
                    <div className="mt-3 space-y-2 rounded-md border bg-background p-3">
                      <p className="text-sm font-medium">
                        Tổng hợp món trong phiên
                      </p>
                      {orderHistoryItems.map((item) => (
                        <div
                          key={item.key}
                          className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-md border px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {String(item.category || "")
                                .toLowerCase()
                                .startsWith("drink")
                                ? "Đồ uống"
                                : "Đồ ăn"}
                            </p>
                            {item.selectionGroups.length > 0 && (
                              <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                                {item.selectionGroups.map((group) => (
                                  <p key={group.key}>
                                    <span className="font-medium text-foreground">
                                      {group.label}:
                                    </span>{" "}
                                    {group.options
                                      .map(
                                        (option) =>
                                          `${option.label}${formatSelectionPrice(
                                            option.priceDelta,
                                          )}`,
                                      )
                                      .join(", ")}
                                  </p>
                                ))}
                              </div>
                            )}
                            {item.note && (
                              <p className="mt-1 text-xs italic text-muted-foreground">
                                Ghi chú: {item.note}
                              </p>
                            )}
                          </div>
                          <Badge
                            variant="secondary"
                            className="min-w-10 justify-center"
                          >
                            x{item.quantity}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : sortedOrderBatches.length === 0 &&
                    orderHistoryItems.length === 0 &&
                    editableOrderItems.length === 0 ? (
                    <p className="mt-3 text-sm text-muted-foreground">
                      Chưa có order cho phiên này. Bấm &quot;Thêm món&quot; để
                      bắt đầu.
                    </p>
                  ) : null}

                  {isOrderEditorExpanded ? (
                    <div className="mt-4 space-y-3 rounded-md border bg-background p-3">
                      <p className="text-sm font-medium">Chọn món từ menu</p>
                      {(orderQuery.isLoading || menuItemsQuery.isLoading) && (
                        <Badge variant="secondary">Đang tải dữ liệu...</Badge>
                      )}
                      <CoffeeOrderEditor
                        menuItems={menuItemsQuery.data ?? []}
                        order={draftOrder}
                        orderDetail={orderQuery.data}
                        isUpdating={isUpdatingOrder}
                        onQuantityChange={handleQuantityChange}
                        onClearOrder={() => deleteOrderMutation.mutate()}
                      />
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>

          <DialogFooter className="sticky bottom-0 -mx-4 flex flex-wrap justify-between gap-2 border-t bg-background px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:-mx-6 sm:px-6">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                loading={updateSessionMutation.isPending}
                onClick={() => updateSessionMutation.mutate("in-use")}
              >
                Lưu thông tin
              </Button>
              <Button
                variant="secondary"
                loading={updateSessionMutation.isPending}
                onClick={() => updateSessionMutation.mutate("completed")}
              >
                Kết thúc phiên
              </Button>
            </div>

            <Button variant="outline" onClick={onClose}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CoffeeOrderLineItemEditorDialog
        isOpen={!!editingLineTarget}
        onClose={() => setEditingLineTarget(null)}
        target={editingLineTarget}
        coffeeSessionId={sessionDetail?._id}
        menuItems={menuItemsQuery.data ?? []}
        templates={customizationTemplatesQuery.data ?? []}
        updatedBy={user?._id}
      />
    </>
  );
};

export default CoffeeInUseModal;

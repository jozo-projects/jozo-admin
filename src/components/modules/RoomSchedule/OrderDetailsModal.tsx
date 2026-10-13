import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { refreshScheduleBillAndOrder, requireServedSuccess } from "@/utils/billCheckout";
import fnbOrderApis from "@/apis/fnbOrder.apis";
import {
  UtensilsCrossed,
  Clock,
  MapPin,
  User,
  CheckCircle,
} from "lucide-react";
import type { OrderData } from "@/pages/RoomSchedule/components/RoomTimelineTable";

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderData: OrderData | null;
  roomId: string;
  onOrderServed?: () => void;
}

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  isOpen,
  onClose,
  orderData,
  roomId,
  onOrderServed,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { mutate: markAsServed, isPending } = useMutation({
    mutationFn: async (order: OrderData) => {
      const response = await fnbOrderApis.markOrderAsServed(roomId, order.orderId);
      const body = response.data as {
        success?: boolean;
        message?: string;
        orderId?: string;
        result?: { success?: boolean; message?: string; orderId?: string };
      };
      requireServedSuccess(body.result ?? body);
      return response;
    },
    onSuccess: async (_response, order) => {
      await refreshScheduleBillAndOrder(queryClient, order.customerInfo.roomScheduleId);
      toast({
        title: "Thành công",
        description: "Đã xác nhận phục vụ đơn hàng",
      });
      onOrderServed?.();
      onClose();
    },
    onError: (error) => {
      console.error("Error marking order as served:", error);
      toast({
        title: "Lỗi",
        description: "Không thể xác nhận phục vụ đơn hàng",
        variant: "destructive",
      });
    },
  });

  const handleMarkAsServed = () => {
    if (orderData) {
      markAsServed(orderData);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!orderData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5 text-orange-500" />
            Chi tiết đơn hàng mới
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Thông tin khách hàng */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <User className="h-4 w-4" />
              Thông tin khách hàng
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-600" />
                <span className="text-sm">
                  <strong>Phòng:</strong> {orderData.customerInfo.roomName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-sm">
                  <strong>Thời gian đặt:</strong>{" "}
                  {formatDateTime(orderData.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Danh sách món ăn */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4 text-orange-500" />
              Danh sách món ăn
            </h3>
            <div className="space-y-3">
              {orderData.items.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{item.name}</div>
                    <div className="text-sm text-gray-600">
                      Giá: {formatCurrency(item.price)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="text-sm">
                      Số lượng: {item.quantity}
                    </Badge>
                    <div className="font-semibold text-green-600">
                      {formatCurrency(item.price * item.quantity)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Tổng tiền */}
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-green-900">
                Tổng tiền:
              </span>
              <span className="text-2xl font-bold text-green-600">
                {formatCurrency(orderData.totalAmount)}
              </span>
            </div>
          </div>

          {/* Thông tin đơn hàng */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Mã đơn hàng:</strong> {orderData.orderId}
              </div>
              <div>
                <strong>Trạng thái:</strong>
                <Badge
                  variant="outline"
                  className="ml-2 text-orange-600 border-orange-600"
                >
                  Chờ phục vụ
                </Badge>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onClose}>
              Đóng
            </Button>
            <Button
              onClick={handleMarkAsServed}
              disabled={isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Xác nhận đã phục vụ
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderDetailsModal;

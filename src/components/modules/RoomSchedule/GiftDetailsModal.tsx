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
import { Gift as GiftIcon, MapPin, Calendar } from "lucide-react";
import { Gift as GiftType } from "@/@types/Gift";
import { GIFT_TYPE_LABELS } from "@/pages/Gifts/constants";

interface GiftDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  gift: GiftType | null;
  roomId: string;
  scheduleId: string;
  roomName?: string;
}

const GiftDetailsModal: React.FC<GiftDetailsModalProps> = ({
  isOpen,
  onClose,
  gift,
  roomId,
  scheduleId,
  roomName,
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  if (!gift) return null;

  const isDiscountPercentage =
    gift.type === "discount_percentage" || gift.type === "discount";
  const isDiscountAmount =
    gift.type === "discount_amount" || gift.type === "fnb_discount_amount";
  const isFnBDiscountAmount = gift.type === "fnb_discount_amount";
  const categoryLabelMap: Record<string, string> = {
    drink: "Đồ uống",
    snack: "Đồ ăn",
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent aria-describedby={undefined} className="overflow-y-auto overscroll-y-contain sm:max-h-[80vh] sm:max-w-2xl">
        <DialogHeader className="pr-8">
          <DialogTitle className="flex items-center gap-2">
            <GiftIcon className="h-5 w-5 text-purple-500" />
            Chi tiết quà tặng đã nhận
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Thông tin phòng */}
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Thông tin phòng
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-purple-600" />
                <span className="text-sm">
                  <strong>Phòng:</strong> {roomName || roomId}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-purple-600" />
                <span className="min-w-0 break-all text-sm">
                  <strong>Schedule ID:</strong> {scheduleId}
                </span>
              </div>
            </div>
          </div>

          {/* Hình ảnh và thông tin cơ bản */}
          <div className="flex flex-wrap gap-4">
            {gift.image && (
              <div className="flex-shrink-0">
                <img
                  src={gift.image}
                  alt={gift.name}
                  className="w-32 h-32 object-cover rounded-lg border-2 border-purple-200"
                />
              </div>
            )}
            <div className="min-w-0 flex-1 basis-40">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {gift.name}
              </h2>
              <div className="space-y-2">
                <Badge
                  variant="outline"
                  className="text-purple-600 border-purple-600"
                >
                  {GIFT_TYPE_LABELS[gift.type]}
                </Badge>
                {gift.type === "snacks_drinks" && gift.price && (
                  <div className="text-lg font-semibold text-green-600">
                    Giá trị: {formatCurrency(gift.price)}
                  </div>
                )}
                {isDiscountPercentage && gift.discountPercentage && (
                  <div className="text-lg font-semibold text-green-600">
                    Giảm giá: {gift.discountPercentage}%
                  </div>
                )}
                {isDiscountAmount && gift.discountAmount && (
                  <div className="text-lg font-semibold text-green-600">
                    Giảm giá: {formatCurrency(gift.discountAmount)}
                  </div>
                )}
                {isFnBDiscountAmount &&
                  gift.categories &&
                  gift.categories.length > 0 && (
                    <div className="text-sm text-gray-700 space-x-2">
                      <span className="font-medium">Danh mục áp dụng:</span>
                      {gift.categories.map((category) => (
                        <Badge key={category} variant="secondary">
                          {categoryLabelMap[category] || category}
                        </Badge>
                      ))}
                    </div>
                  )}
              </div>
            </div>
          </div>

          {/* Danh sách items (nếu là snacks_drinks) */}
          {gift.type === "snacks_drinks" &&
            gift.items &&
            gift.items.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <GiftIcon className="h-4 w-4 text-purple-500" />
                    Danh sách sản phẩm trong quà
                  </h3>
                  <div className="space-y-3">
                    {gift.items.map((item, index) => (
                      <div
                        key={index}
                        className="flex flex-wrap items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {item.name}
                          </div>
                          {item.category && (
                            <div className="text-sm text-gray-600">
                              Danh mục: {item.category}
                            </div>
                          )}
                          {item.priceSnapshot && (
                            <div className="text-sm text-gray-600">
                              Giá: {formatCurrency(item.priceSnapshot)}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="text-sm">
                            Số lượng: {item.quantity}
                          </Badge>
                          {item.priceSnapshot && (
                            <div className="font-semibold text-green-600">
                              {formatCurrency(
                                item.priceSnapshot * item.quantity
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

          {/* Thông tin tổng quan */}
          <Separator />
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <strong>Loại quà:</strong> {GIFT_TYPE_LABELS[gift.type]}
              </div>
              <div>
                <strong>Trạng thái:</strong>
                <Badge
                  variant="outline"
                  className="ml-2 text-green-600 border-green-600"
                >
                  Đã nhận
                </Badge>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onClose}>
              Đóng
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GiftDetailsModal;

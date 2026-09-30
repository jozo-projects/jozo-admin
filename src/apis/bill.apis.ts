import {
  BillPaymentMethod,
  IBill,
  IBillPaymentMethodHistory,
  IRevenueResult,
} from "@/@types/Bill";
import http from "@/utils/http";
import dayjs, { toIsoStringWithZeroSubsecond } from "@/lib/dayjs";

const billAPis = {
  getBillByScheduleId: async (
    scheduleId: string,
    promotionId?: string,
    actualEndTime?: string,
    actualStartTime?: string,
    applyFreeHourPromotion?: boolean,
    phone?: string,
  ) => {
    const params = new URLSearchParams();

    if (actualEndTime) {
      params.append(
        "actualEndTime",
        toIsoStringWithZeroSubsecond(dayjs(actualEndTime)),
      );
    }

    // Thêm các tham số tùy chọn nếu có
    if (promotionId) {
      params.append("promotionId", promotionId);
    }

    if (actualStartTime) {
      params.append(
        "actualStartTime",
        toIsoStringWithZeroSubsecond(dayjs(actualStartTime)),
      );
    }

    if (applyFreeHourPromotion !== undefined) {
      params.append("applyFreeHourPromotion", applyFreeHourPromotion.toString());
    }

    if (phone?.trim()) {
      params.append("phone", phone.trim());
    }

    return http.get<HTTPResponse<IBill>>(
      `/bill/${scheduleId}?${params.toString()}`,
    );
  },

  getBillById: async (billId: string) => {
    return http.get<
      HTTPResponse<
        IBill & {
          roomName: string;
          roomType: string;
          customerName: string;
          formattedStartTime: string;
          formattedEndTime: string;
          formattedCreatedAt: string;
          usageDuration: string;
          items?: {
            description: string;
            price: number;
            quantity: number;
            originalPrice?: number;
            discountName?: string;
            discountPercentage?: number;
            promotionId?: string;
          }[];
          freeHourPromotion?: {
            freeMinutesApplied?: number;
            freeAmount?: number;
          };
        }
      >
    >(`/bill/details/${billId}`);
  },

  printBill: async (
    scheduleId: string,
    data: {
      paymentMethod: string;
      actualEndTime: string;
      promotionId?: string;
      actualStartTime?: string;
      applyFreeHourPromotion?: boolean;
      phone?: string;
      customerPhone?: string;
    },
  ) => http.post<HTTPResponse<IBill>>(`/bill/${scheduleId}`, data),

  // Print bill via WiFi printer
  printBillWifi: async (
    scheduleId: string,
    data: {
      paymentMethod: string;
      actualEndTime: string;
      promotionId?: string;
      actualStartTime?: string;
      phone?: string;
      customerPhone?: string;
    },
  ) => http.post<HTTPResponse<IBill>>(`/bill/${scheduleId}/wifi`, data),

  // Save bill to bills collection
  saveBill: async (bill: {
    scheduleId: string;
    roomId: string;
    items: Array<{
      description: string;
      price: number;
      quantity: number;
      originalPrice?: number;
      discountName?: string;
      discountPercentage?: number;
      promotionId?: string;
    }>;
    totalAmount: number;
    customerPhone?: string;
    phone?: string;
    paymentMethod: string;
    startTime: string;
    endTime: string;
    note?: string;
    promotionId?: string;
    _id?: string;
    createdAt?: string | Date;
    invoiceCode?: string;
  }) => http.post<HTTPResponse<IBill>>("/bill/save", bill),

  // API generate PDF, trả về file PDF ở dạng buffer (arraybuffer)
  generateBill: async (
    scheduleId: string,
    data: {
      paymentMethod: string;
      actualEndTime: string;
      promotionId?: string;
      phone?: string;
      customerPhone?: string;
    },
  ) =>
    http.post(`/bill/${scheduleId}/generate`, data, {
      responseType: "blob",
      headers: {
        "Content-Type": "application/pdf",
      },
    }),
  /** GET /bill/revenue — FE tự tính startDate/endDate (ISO), gửi lên một endpoint duy nhất */
  getBillRevenue: async (startDate: string, endDate: string) =>
    http.get<HTTPResponse<IRevenueResult>>(
      `/bill/revenue?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
    ),

  getGiftAppliedBills: async (params: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    kind?: "all" | "fnb" | "discount";
    source?: "all" | "membership" | "gift" | "streak";
    search?: string;
  }) =>
    http.get<
      HTTPResponse<{
        items: Array<{
          _id: string;
          invoiceCode: string;
          roomName: string;
          customerName: string;
          customerPhone: string;
          memberTier?: string;
          appliedKind: "fnb" | "discount";
          appliedSource: "membership" | "gift" | "streak";
          appliedReason: string;
          streakGifts?: Array<{ streakCount: number; items: Array<{ name: string; quantity: number }> }>;
          giftName: string;
          giftValue?: number;
          giftDiscountAmount: number;
          membershipDiscountAmount: number;
          totalAmount: number;
          endTime: string;
          completedBy?: string;
        }>;
        summary: {
          totalBills: number;
          fnbBills: number;
          discountBills: number;
          membershipBills: number;
          giftBills: number;
          streakBills: number;
          totalGiftDiscountAmount: number;
          totalMembershipDiscountAmount: number;
        };
        pagination: { page: number; limit: number; total: number; totalPages: number };
      }>
    >(`/bill/gift-applied?${new URLSearchParams(
      Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== "")
        .map(([key, value]) => [key, String(value)]),
    ).toString()}`),
  updatePaymentMethod: (billId: string, paymentMethod: BillPaymentMethod) =>
    http.patch<HTTPResponse<{ bill: IBill; log: unknown }>>(
      `/bill/${billId}/payment-method`,
      { paymentMethod },
    ),

  getPaymentMethodHistory: (billId: string) =>
    http.get<HTTPResponse<IBillPaymentMethodHistory>>(
      `/bill/${billId}/payment-method-history`,
    ),
};

export default billAPis;

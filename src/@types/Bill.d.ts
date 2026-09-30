import type { ITierDiscount } from "./Membership";

export type BillPaymentMethod = "cash" | "bank_transfer";

export interface IBillPaymentMethodHistoryLog {
  _id?: string;
  billId: string;
  fromPaymentMethod?: string;
  toPaymentMethod: BillPaymentMethod;
  changedBy: string;
  changedByName: string;
  changedByRole: "admin" | "staff";
  changedAt: string;
  previousHash: string | null;
  hash: string;
}

export interface IBillPaymentMethodHistory {
  chainValid: boolean;
  logs: IBillPaymentMethodHistoryLog[];
}


/** Membership snapshot BE trả kèm bill sau khi áp discount */
export interface IBillMembership {
  name?: string;
  full_name?: string;
  tier?: string;
  phone?: string;
  phone_number?: string;
  /** Config discount theo hạng */
  tierDiscount?: ITierDiscount[];
  discountPercentage?: number;
  discountAmount?: number;
  note?: string;
  /** Số tiền thực tế đã trừ (nếu BE nhét trong membership) */
  discountAppliedAmount?: number;
}

/** Discount hạng thành viên BE áp trên bill (chi tiết) */
export interface IBillMembershipDiscount {
  tier?: string;
  discountPercentage?: number;
  discountAmount?: number;
  note?: string;
  /** Số tiền thực tế đã trừ */
  appliedAmount?: number;
}

export type RevenueCategory =
  | "SERVICE_ROOM"
  | "FNB_RETAIL"
  | "FNB_PREPARED"
  | "OTHER";

export type FnbRevenueCategory = Extract<
  RevenueCategory,
  "FNB_RETAIL" | "FNB_PREPARED"
>;

export type RevenueBreakdown = Record<RevenueCategory, number>;

export interface IRevenueResult {
  timeRange?: string;
  dateRange: string;
  startDate: string;
  endDate: string;
  totalRevenue: number;
  serviceRoomRevenue: number;
  fnbRevenue: number;
  byCategory: RevenueBreakdown;
  billCount: number;
  bills: IBill[];
}

export interface IBill {
  _id: string;
  source?: "karaoke" | "retail" | string;
  roomId: string;
  roomName: string;
  scheduleId: string;
  paymentMethod: string;
  customer: {
    name: string;
    phoneNumber: string;
  };
  roomPrice: number;
  fnbOrders: Array<{
    _id: string;
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
    totalPrice: number;
  }>;
  fnbTotal: number;
  roomTotal: number;
  totalAmount: number;
  revenueBreakdown?: RevenueBreakdown;
  freeHourPromotion?: {
    freeMinutesApplied?: number;
    freeAmount?: number;
  };
  /** Snapshot membership khi BE áp giảm giá theo phone */
  membership?: IBillMembership;
  /** Số tiền membership đã trừ — FE chỉ hiển thị, không tự tính */
  membershipDiscountAmount?: number;
  membershipDiscount?: IBillMembershipDiscount;
  startTime: Date;
  endTime: Date;
  actualEndTime: Date;
  createdAt: Date;
  updatedAt: Date;
  invoiceCode: string;
  completedBy?: string;
  createdBy?: string;
  phone?: string;
  customerPhone?: string;
}

// import { IFnbOrder } from "@/@types/FnbOrder";
import { IFnbOrder } from "@/@types/FnbOrder";
import http from "@/utils/http";
import type { OrderDetail } from "@/@types/FnbOrder";
import { normalizeOrderDetail } from "@/utils/mergeOrderDetailItems";

// Interface cho result của complete order
export interface ICompleteOrderResult {
  order: IFnbOrder;
  updatedItems: Array<{
    _id: string;
    name: string;
    category: string;
    price: number;
    inventory: {
      quantity: number;
      minStock?: number;
      maxStock?: number;
      lastUpdated: string;
    };
  }>;
}

const FNB_ORDER_CONTROLLER = "/fnb-orders";

// Interface cho FNB Order (input API)
export interface ICreateFnbOrderRequestBody {
  roomScheduleId: string;
  order: {
    drinks: Record<string, number>;
    snacks: Record<string, number>;
  };
  createdBy: string;
}

// Interface cho Add/Remove Item (format mới)
export interface IAddRemoveItemRequestBody {
  order: {
    drinks?: Record<string, number>;
    snacks?: Record<string, number>;
  };
  createdBy: string;
}

// Interface cho Complete Order
export interface ICompleteOrderRequestBody {
  roomScheduleId: string;
  items: Array<{
    itemId: string;
    quantity: number;
  }>;
  createdBy: string;
}

// Thống kê FNB - query params
export type FnbStatsPeriod = "day" | "week" | "month";

export type FnbStatsCategory = "drink" | "snack";

export interface IFnbOrderStatsParams {
  period: FnbStatsPeriod;
  date?: string; // YYYY-MM-DD, optional
  category?: FnbStatsCategory; // drink | snack, optional
  search?: string; // tùy chọn, lọc theo tên (không phân biệt hoa thường, trim)
}

// Thống kê FNB - response
export interface IFnbOrderStatsItemBreakdown {
  itemId: string;
  name: string;
  category: string;
  quantity: number;
}

export interface IFnbOrderStatsPeriod {
  from: string;
  to: string;
  fromFormatted: string;
  toFormatted: string;
}

export interface IFnbOrderStatsResult {
  period: IFnbOrderStatsPeriod;
  totalItemsSold: number;
  ordersCount: number;
  itemsBreakdown: IFnbOrderStatsItemBreakdown[];
}

const fnbOrderApis = {
  // Tạo mới FNB Order
  createFnbOrder: (payload: ICreateFnbOrderRequestBody) => {
    return http.post<HTTPResponse<IFnbOrder>>(
      `${FNB_ORDER_CONTROLLER}`,
      payload
    );
  },
  // Lấy FNB Order theo id
  getFnbOrderById: (id: string) => {
    return http.get<HTTPResponse<IFnbOrder>>(`${FNB_ORDER_CONTROLLER}/${id}`);
  },
  // Cập nhật FNB Order
  updateFnbOrder: (payload: ICreateFnbOrderRequestBody & { _id: string }) => {
    return http.put<HTTPResponse<IFnbOrder>>(
      `${FNB_ORDER_CONTROLLER}/${payload._id}`,
      payload
    );
  },
  // Xóa FNB Order
  deleteFnbOrder: (payload: { _id: string }) => {
    return http.delete<HTTPResponse<IFnbOrder>>(
      `${FNB_ORDER_CONTROLLER}/${payload._id}`
    );
  },
  // Lấy danh sách FNB Orders theo Room Schedule ID
  getFnbOrdersByRoomSchedule: (roomScheduleId: string) => {
    return http.get<HTTPResponse<IFnbOrder[]>>(
      `${FNB_ORDER_CONTROLLER}/fnb-order/${roomScheduleId}`
    );
  },
  // Thêm item vào order (API mới)
  addItemToOrder: (
    roomScheduleId: string,
    payload: IAddRemoveItemRequestBody
  ) => {
    return http.post<HTTPResponse<IFnbOrder>>(
      `${FNB_ORDER_CONTROLLER}/${roomScheduleId}/add`,
      payload
    );
  },
  // Giảm item khỏi order (API mới)
  removeItemFromOrder: (
    roomScheduleId: string,
    payload: IAddRemoveItemRequestBody
  ) => {
    return http.post<HTTPResponse<IFnbOrder>>(
      `${FNB_ORDER_CONTROLLER}/${roomScheduleId}/remove`,
      payload
    );
  },
  // Complete order với items
  completeOrder: (payload: ICompleteOrderRequestBody) => {
    return http.post<HTTPResponse<ICompleteOrderResult>>(
      `${FNB_ORDER_CONTROLLER}/complete`,
      payload
    );
  },
  // Upsert item vào order (thêm hoặc cập nhật số lượng)
  upsertItem: (payload: {
    roomScheduleId: string;
    itemId: string;
    quantity: number;
    category: string;
    createdBy: string;
  }) => {
    return http.post<HTTPResponse<IFnbOrder>>(
      `${FNB_ORDER_CONTROLLER}/upsert-item`,
      payload
    );
  },
  // Lấy chi tiết order theo roomScheduleId (API mới)
  getFnbOrderDetail: (roomScheduleId: string) => {
    return http
      .get<HTTPResponse<OrderDetail>>(
        `${FNB_ORDER_CONTROLLER}/detail/${roomScheduleId}`,
      )
      .then((res) => ({
        ...res,
        data: {
          ...res.data,
          result: res.data.result
            ? normalizeOrderDetail(res.data.result)
            : res.data.result,
        },
      }));
  },
  // Mark order as served
  markOrderAsServed: (roomId: string, orderId: string) => {
    return http.post<
      HTTPResponse<{ success?: boolean; message?: string; orderId?: string }> & {
        success?: boolean;
        orderId?: string;
        servedBy?: string;
        servedAt?: string;
        itemCount?: number;
        roomId?: string;
      }
    >(`/rooms/${roomId}/orders/${orderId}/serve`);
  },
  // Thống kê FNB: period, date (optional), category (optional drink|snack), search (optional)
  getFnbOrderStats: (params: IFnbOrderStatsParams) => {
    const searchParams = new URLSearchParams({ period: params.period });
    if (params.date) searchParams.set("date", params.date);
    if (params.category === "drink" || params.category === "snack") {
      searchParams.set("category", params.category);
    }
    const searchTrimmed = params.search?.trim();
    if (searchTrimmed !== undefined && searchTrimmed !== "") {
      searchParams.set("search", searchTrimmed);
    }
    return http.get<HTTPResponse<IFnbOrderStatsResult>>(
      `${FNB_ORDER_CONTROLLER}/stats?${searchParams.toString()}`
    );
  },
};

export default fnbOrderApis;

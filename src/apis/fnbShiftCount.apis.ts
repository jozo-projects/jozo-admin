import http from "@/utils/http";

export type ShiftNo = 1 | 2 | 3;
export type FnbShiftCountCategory = "drink" | "snack";

export interface IFnbShiftCountTemplateItem {
  itemId: string;
  name: string;
  category: FnbShiftCountCategory;
  currentInventory: number;
}

export interface IShiftCell {
  openingCount?: number;
  closingCount?: number;
  physicalSold?: number;
  handoverGap?: number;
}

export interface IMatrixItem {
  itemId: string;
  itemName: string;
  category: FnbShiftCountCategory;
  shifts: Record<ShiftNo, IShiftCell>;
  totalStockIn: number;
  /** Chỉ có trong response của admin. */
  systemSold?: number;
  expectedClosing?: number;
  latestClosing: number;
  latestClosingShiftNo: 0 | ShiftNo;
  hasLatestClosing: boolean;
  variance?: number;
  note?: string;
}

export interface IShiftMeta {
  shiftNo: ShiftNo;
  status: "open" | "closed";
  locked?: boolean;
  lockedAt?: string | null;
  editable?: boolean;
  canLock?: boolean;
  canUnlock?: boolean;
  note?: string | null;
  _id?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IFnbShiftCountSummary {
  shortageCount: number;
  shortageItems: Array<{
    itemId: string;
    itemName: string;
    variance: number;
  }>;
}

export interface IFnbShiftCountResponse {
  businessDate: string;
  editable: boolean;
  shifts: Record<ShiftNo, IShiftMeta>;
  items: IMatrixItem[];
  /** Chỉ có trong response của admin. */
  summary?: IFnbShiftCountSummary;
}

export interface IFnbShiftCountSaveShiftItem {
  itemId: string;
  openingCount?: number;
  closingCount?: number;
}

export interface IFnbShiftCountSaveShiftBody {
  items: IFnbShiftCountSaveShiftItem[];
  note?: string;
}

export interface IFnbShiftCountSaveDayItem {
  itemId: string;
  totalStockIn?: number;
  note?: string;
}

export interface IFnbShiftCountSaveDayItemsBody {
  items: IFnbShiftCountSaveDayItem[];
}

export interface IFnbShiftCountGetParams {
  date?: string;
}

export interface IFnbShiftCountHistoryParams {
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface IFnbShiftCountHistoryResult {
  items: IFnbShiftCountResponse[];
  total: number;
  page: number;
  limit: number;
}

const CONTROLLER = "/fnb-shift-counts";

const fnbShiftCountApis = {
  getItemsTemplate: () =>
    http.get<HTTPResponse<IFnbShiftCountTemplateItem[]>>(
      `${CONTROLLER}/items-template`,
    ),

  getShiftCount: (params?: IFnbShiftCountGetParams) =>
    http.get<HTTPResponse<IFnbShiftCountResponse>>(CONTROLLER, { params }),

  saveShift: (
    shiftNo: ShiftNo,
    body: IFnbShiftCountSaveShiftBody,
    params?: IFnbShiftCountGetParams,
  ) =>
    http.put<HTTPResponse<IFnbShiftCountResponse>>(
      `${CONTROLLER}/${shiftNo}`,
      body,
      { params },
    ),

  saveDayItems: (
    body: IFnbShiftCountSaveDayItemsBody,
    params?: IFnbShiftCountGetParams,
  ) =>
    http.put<HTTPResponse<IFnbShiftCountResponse>>(
      `${CONTROLLER}/day-items`,
      body,
      { params },
    ),

  lockShift: (shiftNo: ShiftNo, params?: IFnbShiftCountGetParams) =>
    http.post<HTTPResponse<IFnbShiftCountResponse>>(
      `${CONTROLLER}/${shiftNo}/lock`,
      undefined,
      { params },
    ),

  unlockShift: (shiftNo: ShiftNo, params?: IFnbShiftCountGetParams) =>
    http.post<HTTPResponse<IFnbShiftCountResponse>>(
      `${CONTROLLER}/${shiftNo}/unlock`,
      undefined,
      { params },
    ),

  getHistory: (params?: IFnbShiftCountHistoryParams) =>
    http.get<HTTPResponse<IFnbShiftCountHistoryResult>>(
      `${CONTROLLER}/history`,
      { params },
    ),
};

export default fnbShiftCountApis;

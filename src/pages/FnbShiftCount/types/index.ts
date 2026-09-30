import type {
  IFnbShiftCountResponse,
  IFnbShiftCountTemplateItem,
  IMatrixItem,
  ShiftNo,
} from "@/apis/fnbShiftCount.apis";

export type FnbShiftCountTab = "entry" | "history";

export type ShiftCountField = "openingCount" | "closingCount";

export interface ShiftCountCellValue {
  openingCount: number | "";
  closingCount: number | "";
}

export interface FnbShiftCountFormItem {
  itemId: string;
  itemName: string;
  category: "drink" | "snack";
  currentInventory?: number;
  shifts: Record<ShiftNo, ShiftCountCellValue>;
  totalStockIn: number | "";
  systemSold?: number;
  expectedClosing?: number;
  latestClosing?: number;
  latestClosingShiftNo?: 0 | ShiftNo;
  hasLatestClosing?: boolean;
  variance?: number;
  note: string;
}

export type {
  IFnbShiftCountResponse,
  IFnbShiftCountTemplateItem,
  IMatrixItem,
  ShiftNo,
};

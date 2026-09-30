import type {
  IFnbShiftCountTemplateItem,
  IMatrixItem,
  IShiftMeta,
  ShiftNo,
} from "@/apis/fnbShiftCount.apis";
import type { Dayjs } from "dayjs";
import dayjs from "@/lib/dayjs";
import type { FnbShiftCountFormItem, ShiftCountCellValue } from "./types";

export const SHIFT_NUMBERS: ShiftNo[] = [1, 2, 3];

/** Ca 3 kết thúc 01:00 — trước giờ này vẫn thuộc ngày kinh doanh hôm trước */
export const FNB_BUSINESS_DAY_END_HOUR = 1;

export const getFnbBusinessDate = (at?: Dayjs): string => {
  const now = (at ?? dayjs()).tz("Asia/Ho_Chi_Minh");
  if (now.hour() < FNB_BUSINESS_DAY_END_HOUR) {
    return now.subtract(1, "day").format("YYYY-MM-DD");
  }
  return now.format("YYYY-MM-DD");
};

export const isFnbBusinessDate = (date: string, at?: Dayjs): boolean =>
  date === getFnbBusinessDate(at);

/** Chỉ khóa sửa khi staff đã khóa ca thủ công, không theo editable từ BE khi qua 0h */
export const resolveShiftsForBusinessDay = (
  shifts: Record<ShiftNo, IShiftMeta> | undefined,
  date: string,
): Record<ShiftNo, IShiftMeta> | undefined => {
  if (!shifts) return undefined;
  if (!isFnbBusinessDate(date)) return shifts;

  return SHIFT_NUMBERS.reduce<Record<ShiftNo, IShiftMeta>>(
    (acc, shiftNo) => {
      const shift = shifts[shiftNo];
      acc[shiftNo] = {
        ...shift,
        editable: !shift?.locked,
      };
      return acc;
    },
    {} as Record<ShiftNo, IShiftMeta>,
  );
};

const toCountValue = (value?: number | null): number | "" =>
  value === undefined || value === null ? "" : value;

const mapShiftCells = (
  shifts?: IMatrixItem["shifts"],
): Record<ShiftNo, ShiftCountCellValue> => ({
  1: {
    openingCount: toCountValue(shifts?.[1]?.openingCount),
    closingCount: toCountValue(shifts?.[1]?.closingCount),
  },
  2: {
    openingCount: toCountValue(shifts?.[2]?.openingCount),
    closingCount: toCountValue(shifts?.[2]?.closingCount),
  },
  3: {
    openingCount: toCountValue(shifts?.[3]?.openingCount),
    closingCount: toCountValue(shifts?.[3]?.closingCount),
  },
});

export const toFormItemFromTemplate = (
  template: IFnbShiftCountTemplateItem,
  saved?: IMatrixItem,
): FnbShiftCountFormItem => ({
  itemId: template.itemId,
  itemName: template.name,
  category: template.category,
  currentInventory: template.currentInventory,
  shifts: mapShiftCells(saved?.shifts),
  totalStockIn: saved?.totalStockIn ?? "",
  systemSold: saved?.systemSold ?? 0,
  expectedClosing: saved?.expectedClosing,
  latestClosing: saved?.latestClosing,
  latestClosingShiftNo: saved?.latestClosingShiftNo,
  hasLatestClosing: saved?.hasLatestClosing,
  variance: saved?.variance,
  note: saved?.note ?? "",
});

export const toFormItemFromDay = (saved: IMatrixItem): FnbShiftCountFormItem => ({
  itemId: saved.itemId,
  itemName: saved.itemName,
  category: saved.category,
  shifts: mapShiftCells(saved.shifts),
  totalStockIn: saved.totalStockIn ?? "",
  systemSold: saved.systemSold ?? 0,
  expectedClosing: saved.expectedClosing,
  latestClosing: saved.latestClosing,
  latestClosingShiftNo: saved.latestClosingShiftNo,
  hasLatestClosing: saved.hasLatestClosing,
  variance: saved.variance,
  note: saved.note ?? "",
});

export const mergeTemplateWithDayData = (
  template: IFnbShiftCountTemplateItem[],
  dayItems?: IMatrixItem[],
): FnbShiftCountFormItem[] => {
  const dayMap = new Map((dayItems ?? []).map((item) => [item.itemId, item]));
  const templateIds = new Set(template.map((item) => item.itemId));

  const fromTemplate = template.map((item) =>
    toFormItemFromTemplate(item, dayMap.get(item.itemId)),
  );

  const orphanItems = (dayItems ?? [])
    .filter((item) => !templateIds.has(item.itemId))
    .map(toFormItemFromDay);

  return sortFormItems([...fromTemplate, ...orphanItems]);
};

const sortFormItems = (items: FnbShiftCountFormItem[]): FnbShiftCountFormItem[] =>
  [...items].sort((a, b) => {
    const categoryOrder =
      CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
    if (categoryOrder !== 0) return categoryOrder;
    return a.itemName.localeCompare(b.itemName, "vi");
  });

export const formItemsFromResponse = (
  template: IFnbShiftCountTemplateItem[],
  response: { items?: IMatrixItem[] },
): FnbShiftCountFormItem[] =>
  mergeTemplateWithDayData(template, response.items);

/** Chênh lệch âm = hụt tồn */
export const isShortageVariance = (variance: number | undefined): boolean =>
  variance !== undefined && variance < 0;

export const formatVariance = (variance: number): string => {
  if (variance > 0) return `+${variance}`;
  return String(variance);
};

export const parseCountInput = (value: string): number | "" => {
  const trimmed = value.trim();
  if (trimmed === "") return "";
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return "";
  return Math.floor(parsed);
};

export const CATEGORY_LABELS: Record<string, string> = {
  drink: "Đồ uống",
  snack: "Đồ ăn",
};

export const CATEGORY_ORDER = ["drink", "snack"] as const;

export const groupFormItemsByCategory = (
  items: FnbShiftCountFormItem[],
): Array<{
  category: (typeof CATEGORY_ORDER)[number];
  label: string;
  items: FnbShiftCountFormItem[];
}> => {
  const groups = new Map<(typeof CATEGORY_ORDER)[number], FnbShiftCountFormItem[]>();

  for (const item of items) {
    const list = groups.get(item.category) ?? [];
    list.push(item);
    groups.set(item.category, list);
  }

  return CATEGORY_ORDER.filter((category) => groups.has(category)).map(
    (category) => ({
      category,
      label: CATEGORY_LABELS[category],
      items: groups.get(category)!,
    }),
  );
};

export const SHIFT_LABELS: Record<ShiftNo, string> = {
  1: "Ca 1",
  2: "Ca 2",
  3: "Ca 3",
};

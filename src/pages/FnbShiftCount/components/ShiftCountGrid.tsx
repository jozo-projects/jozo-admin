import type { IShiftMeta, ShiftNo } from "@/apis/fnbShiftCount.apis";
import {
  Fragment,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import dayjs from "@/lib/dayjs";
import { cn } from "@/lib/utils";
import { Loader2, Lock, LockOpen } from "lucide-react";
import type { FnbShiftCountFormItem, ShiftCountField } from "../types";
import {
  SHIFT_LABELS,
  SHIFT_NUMBERS,
  formatVariance,
  groupFormItemsByCategory,
  isShortageVariance,
  parseCountInput,
} from "../utils";

const SAVE_DEBOUNCE_MS = 1000;

type DayField = "totalStockIn" | "note";

interface ShiftCountGridProps {
  items: FnbShiftCountFormItem[];
  shifts?: Record<ShiftNo, IShiftMeta>;
  dayItemsEditable: boolean;
  isAdmin: boolean;
  search: string;
  isLoading?: boolean;
  lockingShiftNo?: ShiftNo | null;
  onShiftCellSave: (
    itemId: string,
    shiftNo: ShiftNo,
    field: ShiftCountField,
    value: number,
  ) => void | Promise<void>;
  onDayFieldSave: (
    itemId: string,
    field: DayField,
    value: number | string,
  ) => void | Promise<void>;
  onLockShift?: (shiftNo: ShiftNo) => void | Promise<void>;
  onUnlockShift?: (shiftNo: ShiftNo) => void | Promise<void>;
}

type NavigableField =
  | { type: "shift"; shiftNo: ShiftNo; field: ShiftCountField }
  | { type: "day"; field: DayField };

const inputRefKey = (
  itemId: string,
  nav: NavigableField,
) => {
  if (nav.type === "shift") {
    return `${itemId}-s${nav.shiftNo}-${nav.field}`;
  }
  return `${itemId}-day-${nav.field}`;
};

const NAV_ORDER: NavigableField[] = [
  ...SHIFT_NUMBERS.flatMap((shiftNo) => [
    { type: "shift" as const, shiftNo, field: "openingCount" as const },
    { type: "shift" as const, shiftNo, field: "closingCount" as const },
  ]),
  { type: "day", field: "totalStockIn" },
  { type: "day", field: "note" },
];

const navEquals = (a: NavigableField, b: NavigableField) => {
  if (a.type !== b.type) return false;
  if (a.type === "day") return b.type === "day" && a.field === b.field;
  return b.type === "shift" && a.shiftNo === b.shiftNo && a.field === b.field;
};

const shouldNavigateHorizontally = (
  input: HTMLInputElement,
  direction: "left" | "right",
) => {
  const { selectionStart, selectionEnd, value } = input;
  if (selectionStart === null || selectionEnd === null) return true;
  if (selectionStart !== selectionEnd) return true;
  if (direction === "left") return selectionStart === 0;
  return selectionEnd === value.length;
};

const ShiftCountGrid = ({
  items,
  shifts,
  dayItemsEditable,
  isAdmin,
  search,
  isLoading,
  lockingShiftNo,
  onShiftCellSave,
  onDayFieldSave,
  onLockShift,
  onUnlockShift,
}: ShiftCountGridProps) => {
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const debounceTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {},
  );
  const draftValuesRef = useRef<Record<string, string>>({});
  const itemsRef = useRef(items);
  const shiftsRef = useRef(shifts);
  const onShiftCellSaveRef = useRef(onShiftCellSave);
  const onDayFieldSaveRef = useRef(onDayFieldSave);
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const [savingCellKey, setSavingCellKey] = useState<string | null>(null);

  itemsRef.current = items;
  draftValuesRef.current = draftValues;
  shiftsRef.current = shifts;
  onShiftCellSaveRef.current = onShiftCellSave;
  onDayFieldSaveRef.current = onDayFieldSave;

  useEffect(() => {
    const timers = debounceTimersRef.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    setDraftValues((prev) => {
      if (Object.keys(prev).length === 0) return prev;

      const next = { ...prev };
      let changed = false;

      for (const item of items) {
        for (const shiftNo of SHIFT_NUMBERS) {
          for (const field of ["openingCount", "closingCount"] as const) {
            const key = inputRefKey(item.itemId, {
              type: "shift",
              shiftNo,
              field,
            });
            if (!(key in next)) continue;
            const parsed = parseCountInput(next[key]);
            const saved = item.shifts[shiftNo][field];
            if (parsed === saved) {
              delete next[key];
              changed = true;
            }
          }
        }

        for (const field of ["totalStockIn", "note"] as const) {
          const key = inputRefKey(item.itemId, { type: "day", field });
          if (!(key in next)) continue;
          if (field === "totalStockIn") {
            const parsed = parseCountInput(next[key]);
            if (parsed === item.totalStockIn) {
              delete next[key];
              changed = true;
            }
          } else if (next[key].trim() === item.note) {
            delete next[key];
            changed = true;
          }
        }
      }

      return changed ? next : prev;
    });
  }, [items]);

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return items;
    return items.filter((item) =>
      item.itemName.toLowerCase().includes(keyword),
    );
  }, [items, search]);

  const groupedItems = useMemo(
    () => groupFormItemsByCategory(filteredItems),
    [filteredItems],
  );

  const navigableRows = useMemo(
    () => groupedItems.flatMap((group) => group.items),
    [groupedItems],
  );

  const getDraftKey = (itemId: string, nav: NavigableField) =>
    inputRefKey(itemId, nav);

  const getShiftDisplayValue = (
    item: FnbShiftCountFormItem,
    shiftNo: ShiftNo,
    field: ShiftCountField,
  ) => {
    const key = getDraftKey(item.itemId, { type: "shift", shiftNo, field });
    if (key in draftValues) return draftValues[key];
    const value = item.shifts[shiftNo][field];
    return value === "" ? "" : String(value);
  };

  const getDayDisplayValue = (
    item: FnbShiftCountFormItem,
    field: DayField,
  ) => {
    const key = getDraftKey(item.itemId, { type: "day", field });
    if (key in draftValues) return draftValues[key];
    if (field === "totalStockIn") {
      return item.totalStockIn === "" ? "" : String(item.totalStockIn);
    }
    return item.note;
  };

  const getEffectiveOpeningCount = (
    item: FnbShiftCountFormItem,
    shiftNo: ShiftNo,
    drafts: Record<string, string>,
  ): number | "" => {
    const openingKey = inputRefKey(item.itemId, {
      type: "shift",
      shiftNo,
      field: "openingCount",
    });
    if (openingKey in drafts) {
      const parsed = parseCountInput(drafts[openingKey]);
      if (parsed !== "") return parsed;
    }
    return item.shifts[shiftNo].openingCount;
  };

  const scheduleDebounced = (key: string, commit: () => void) => {
    if (debounceTimersRef.current[key]) {
      clearTimeout(debounceTimersRef.current[key]);
    }
    debounceTimersRef.current[key] = setTimeout(() => {
      delete debounceTimersRef.current[key];
      commit();
    }, SAVE_DEBOUNCE_MS);
  };

  const runSavingCell = async (
    cellKey: string,
    save: () => void | Promise<void>,
  ) => {
    setSavingCellKey(cellKey);
    try {
      await save();
    } finally {
      setSavingCellKey((current) => (current === cellKey ? null : current));
    }
  };

  const commitShiftSave = (
    itemId: string,
    shiftNo: ShiftNo,
    field: ShiftCountField,
  ) => {
    const key = inputRefKey(itemId, { type: "shift", shiftNo, field });
    const raw = draftValuesRef.current[key];
    if (raw === undefined) return;

    const shiftMeta = shiftsRef.current?.[shiftNo];
    if (shiftMeta?.locked || shiftMeta?.editable === false) return;

    const item = itemsRef.current.find((row) => row.itemId === itemId);
    if (!item) return;

    const parsed = parseCountInput(raw);
    if (parsed === "") return;

    if (
      field === "closingCount" &&
      getEffectiveOpeningCount(item, shiftNo, draftValuesRef.current) === ""
    ) {
      return;
    }

    const saved = item.shifts[shiftNo][field];
    if (saved === parsed) return;

    void runSavingCell(key, () =>
      onShiftCellSaveRef.current(itemId, shiftNo, field, parsed),
    );
  };

  const commitDaySave = (itemId: string, field: DayField) => {
    const key = inputRefKey(itemId, { type: "day", field });
    const raw = draftValuesRef.current[key];
    if (raw === undefined) return;

    const item = itemsRef.current.find((row) => row.itemId === itemId);
    if (!item) return;

    if (field === "totalStockIn") {
      const parsed = parseCountInput(raw);
      if (parsed === "") {
        if (item.totalStockIn !== "") {
          void runSavingCell(key, () =>
            onDayFieldSaveRef.current(itemId, field, 0),
          );
        }
        return;
      }
      if (item.totalStockIn === parsed) return;
      void runSavingCell(key, () =>
        onDayFieldSaveRef.current(itemId, field, parsed),
      );
      return;
    }

    const trimmed = raw.trim();
    if (trimmed === item.note) return;
    void runSavingCell(key, () =>
      onDayFieldSaveRef.current(itemId, field, trimmed),
    );
  };

  const handleShiftChange = (
    item: FnbShiftCountFormItem,
    shiftNo: ShiftNo,
    field: ShiftCountField,
    value: string,
  ) => {
    const key = inputRefKey(item.itemId, { type: "shift", shiftNo, field });
    setDraftValues((prev) => ({ ...prev, [key]: value }));
    scheduleDebounced(key, () =>
      commitShiftSave(item.itemId, shiftNo, field),
    );
  };

  const handleDayChange = (
    item: FnbShiftCountFormItem,
    field: DayField,
    value: string,
  ) => {
    const key = inputRefKey(item.itemId, { type: "day", field });
    setDraftValues((prev) => ({ ...prev, [key]: value }));
    scheduleDebounced(key, () => commitDaySave(item.itemId, field));
  };

  const focusInput = useCallback((itemId: string, nav: NavigableField) => {
    const input = inputRefs.current[inputRefKey(itemId, nav)];
    if (!input) return;
    input.focus();
    input.select();
  }, []);

  const focusNextInput = useCallback(
    (itemId: string, currentNav: NavigableField) => {
      const currentIndex = navigableRows.findIndex((item) => item.itemId === itemId);
      const columnIndex = NAV_ORDER.findIndex((nav) =>
        navEquals(nav, currentNav),
      );

      if (currentIndex < 0 || columnIndex < 0) return;

      const nextColumnIndex = columnIndex + 1;
      if (nextColumnIndex < NAV_ORDER.length) {
        focusInput(itemId, NAV_ORDER[nextColumnIndex]);
        return;
      }

      const nextItem = navigableRows[currentIndex + 1];
      if (!nextItem) return;
      focusInput(nextItem.itemId, NAV_ORDER[0]);
    },
    [focusInput, navigableRows],
  );

  const focusAdjacentInput = useCallback(
    (
      itemId: string,
      currentNav: NavigableField,
      direction: "up" | "down" | "left" | "right",
    ) => {
      const rowIndex = navigableRows.findIndex((item) => item.itemId === itemId);
      const colIndex = NAV_ORDER.findIndex((nav) =>
        navEquals(nav, currentNav),
      );
      if (rowIndex < 0 || colIndex < 0) return false;

      let nextRow = rowIndex;
      let nextCol = colIndex;

      switch (direction) {
        case "up":
          nextRow -= 1;
          break;
        case "down":
          nextRow += 1;
          break;
        case "left":
          nextCol -= 1;
          break;
        case "right":
          nextCol += 1;
          break;
      }

      if (nextRow < 0 || nextRow >= navigableRows.length) return false;
      if (nextCol < 0 || nextCol >= NAV_ORDER.length) return false;

      focusInput(navigableRows[nextRow].itemId, NAV_ORDER[nextCol]);
      return true;
    },
    [focusInput, navigableRows],
  );

  const handleInputKeyDown = useCallback(
    (
      event: KeyboardEvent<HTMLInputElement>,
      itemId: string,
      nav: NavigableField,
    ) => {
      if (event.key === "Enter") {
        event.preventDefault();
        focusNextInput(itemId, nav);
        return;
      }

      const arrowMap = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
      } as const;

      const direction = arrowMap[event.key as keyof typeof arrowMap];
      if (!direction) return;

      if (
        (direction === "left" || direction === "right") &&
        !shouldNavigateHorizontally(event.currentTarget, direction)
      ) {
        return;
      }

      if (focusAdjacentInput(itemId, nav, direction)) {
        event.preventDefault();
      }
    },
    [focusAdjacentInput, focusNextInput],
  );

  const isShiftEditable = (shiftNo: ShiftNo) =>
    !shifts?.[shiftNo]?.locked && (shifts?.[shiftNo]?.editable ?? false);

  const renderShiftCell = (
    item: FnbShiftCountFormItem,
    shiftNo: ShiftNo,
    field: ShiftCountField,
    isLastInShift: boolean,
  ) => {
    const nav: NavigableField = { type: "shift", shiftNo, field };
    const cellKey = inputRefKey(item.itemId, nav);
    const isSaving = savingCellKey === cellKey;
    const isLocked = shifts?.[shiftNo]?.locked;
    const shiftEditable = isShiftEditable(shiftNo);
    const openingMissing =
      field === "closingCount" &&
      getEffectiveOpeningCount(item, shiftNo, draftValues) === "";

    return (
      <td
        key={cellKey}
        className={cn(
          "border-b border-r p-0",
          isLastInShift && "border-r-primary/20",
          isLocked ? "bg-muted/30" : "bg-primary/[0.03]",
        )}
      >
        {shiftEditable && !openingMissing ? (
          <Input
            ref={(element) => {
              inputRefs.current[cellKey] = element;
            }}
            type="number"
            min={0}
            inputMode="numeric"
            value={getShiftDisplayValue(item, shiftNo, field)}
            onChange={(event) =>
              handleShiftChange(item, shiftNo, field, event.target.value)
            }
            onKeyDown={(event) => handleInputKeyDown(event, item.itemId, nav)}
            className={cn(
              "h-10 rounded-none border-0 bg-transparent text-center shadow-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
              isSaving && "opacity-60",
            )}
            placeholder="0"
          />
        ) : (
          <div
            className={cn(
              "flex h-10 items-center justify-center text-muted-foreground",
              openingMissing && shiftEditable && "text-xs",
            )}
            title={
              isLocked
                ? "Ca đã khóa"
                : openingMissing && shiftEditable
                  ? "Nhập mở ca trước khi nhập kết ca"
                  : undefined
            }
          >
            {openingMissing && shiftEditable
              ? "—"
              : getShiftDisplayValue(item, shiftNo, field) || "—"}
          </div>
        )}
      </td>
    );
  };

  const renderDayCell = (
    item: FnbShiftCountFormItem,
    field: DayField,
    className?: string,
  ) => {
    const nav: NavigableField = { type: "day", field };
    const cellKey = inputRefKey(item.itemId, nav);
    const isSaving = savingCellKey === cellKey;

    if (field === "note") {
      return (
        <td
          key={cellKey}
          className={cn("border-b border-r p-0", className)}
        >
          {dayItemsEditable ? (
            <Input
              ref={(element) => {
                inputRefs.current[cellKey] = element;
              }}
              value={getDayDisplayValue(item, field)}
              onChange={(event) =>
                handleDayChange(item, field, event.target.value)
              }
              onKeyDown={(event) =>
                handleInputKeyDown(event, item.itemId, nav)
              }
              className={cn(
                "h-10 rounded-none border-0 bg-transparent px-2 shadow-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
                isSaving && "opacity-60",
              )}
              placeholder="Ghi chú..."
            />
          ) : (
            <div className="flex h-10 items-center px-2 text-sm">
              {item.note || "—"}
            </div>
          )}
        </td>
      );
    }

    return (
      <td key={cellKey} className={cn("border-b border-r p-0 bg-amber-500/5", className)}>
        {dayItemsEditable ? (
          <Input
            ref={(element) => {
              inputRefs.current[cellKey] = element;
            }}
            type="number"
            min={0}
            inputMode="numeric"
            value={getDayDisplayValue(item, field)}
            onChange={(event) =>
              handleDayChange(item, field, event.target.value)
            }
            onKeyDown={(event) => handleInputKeyDown(event, item.itemId, nav)}
            className={cn(
              "h-10 rounded-none border-0 bg-transparent text-center shadow-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
              isSaving && "opacity-60",
            )}
            placeholder="0"
          />
        ) : (
          <div className="flex h-10 items-center justify-center">
            {item.totalStockIn === "" ? "—" : item.totalStockIn}
          </div>
        )}
      </td>
    );
  };

  const renderShiftLockControl = (shiftNo: ShiftNo) => {
    const shift = shifts?.[shiftNo];
    if (!shift) return null;

    const isLocked = shift.locked;
    const isClosed = shift.status === "closed";
    const isProcessing = lockingShiftNo === shiftNo;

    const statusText = isLocked
      ? `Đã khóa${shift.lockedAt ? ` lúc ${dayjs(shift.lockedAt).format("HH:mm DD/MM")}` : ""}`
      : isClosed
        ? "Đã kết ca"
        : "Đang mở ca";

    let tooltip = statusText;
    let icon = <Lock className="h-3.5 w-3.5" />;
    let clickable = false;
    let onClick: (() => void) | undefined;

    if (isLocked) {
      if (shift.canUnlock && onUnlockShift) {
        tooltip = `${statusText} · Bấm để mở khóa`;
        icon = <LockOpen className="h-3.5 w-3.5" />;
        clickable = true;
        onClick = () => {
          void onUnlockShift(shiftNo);
        };
      } else {
        tooltip = statusText;
        icon = <Lock className="h-3.5 w-3.5" />;
      }
    } else if (shift.canLock && onLockShift) {
      tooltip = `${statusText} · Bấm để khóa ca`;
      icon = <LockOpen className="h-3.5 w-3.5" />;
      clickable = true;
      onClick = () => {
        void onLockShift(shiftNo);
      };
    } else {
      tooltip = isClosed
        ? "Đã kết ca · Chưa đủ điều kiện khóa"
        : "Đang mở ca · Cần nhập kết ca trước khi khóa";
      icon = <Lock className="h-3.5 w-3.5 opacity-50" />;
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            disabled={!clickable || isProcessing}
            onClick={onClick}
            className={cn(
              "inline-flex h-6 w-6 items-center justify-center rounded transition-colors",
              clickable
                ? "hover:bg-background/80 cursor-pointer"
                : "cursor-default",
            )}
            aria-label={tooltip}
          >
            {isProcessing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              icon
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    );
  };

  let rowNumber = 0;

  if (isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-md border">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (groupedItems.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-md border text-sm text-muted-foreground">
        Không có món phù hợp với bộ lọc.
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
    <div className="space-y-4">
      <div className="max-h-[min(70vh,720px)] overflow-auto rounded-md border shadow-sm">
        <table className="w-full min-w-[1280px] border-collapse text-sm">
          <thead>
            <tr className="bg-muted">
              <th
                rowSpan={2}
                className="sticky left-0 top-0 z-30 w-12 border-b border-r bg-muted px-2 py-2 text-center font-semibold shadow-[1px_1px_0_0_hsl(var(--border))]"
              >
                #
              </th>
              <th
                rowSpan={2}
                className="sticky left-12 top-0 z-30 min-w-[200px] border-b border-r bg-muted px-3 py-2 text-left font-semibold shadow-[1px_1px_0_0_hsl(var(--border))]"
              >
                Tên món
              </th>
              {SHIFT_NUMBERS.map((shiftNo) => {
                const isLocked = shifts?.[shiftNo]?.locked;
                return (
                  <th
                    key={`group-${shiftNo}`}
                    colSpan={2}
                    className={cn(
                      "sticky top-0 z-20 border-b border-r border-r-primary/20 px-2 py-1.5 font-semibold shadow-[0_1px_0_0_hsl(var(--border))]",
                      isLocked
                        ? "bg-muted text-muted-foreground"
                        : "bg-primary/10 text-primary",
                    )}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>{SHIFT_LABELS[shiftNo]}</span>
                      {renderShiftLockControl(shiftNo)}
                    </div>
                  </th>
                );
              })}
              <th
                rowSpan={2}
                className="sticky top-0 z-20 min-w-[90px] border-b border-r bg-amber-500/10 px-2 py-2 text-center font-semibold shadow-[0_1px_0_0_hsl(var(--border))]"
              >
                Nhập thêm
              </th>
              {isAdmin && (
                <>
                  <th
                    rowSpan={2}
                    className="sticky top-0 z-20 min-w-[80px] border-b border-r bg-muted px-2 py-2 text-center font-semibold shadow-[0_1px_0_0_hsl(var(--border))]"
                  >
                    Hệ thống bán
                  </th>
                  <th
                    rowSpan={2}
                    className="sticky top-0 z-20 min-w-[90px] border-b border-r bg-muted px-2 py-2 text-center font-semibold shadow-[0_1px_0_0_hsl(var(--border))]"
                  >
                    Chênh lệch
                  </th>
                </>
              )}
              <th
                rowSpan={2}
                className="sticky top-0 z-20 min-w-[140px] border-b bg-muted px-2 py-2 text-left font-semibold shadow-[0_1px_0_0_hsl(var(--border))]"
              >
                Note
              </th>
            </tr>
            <tr className="bg-muted">
              {SHIFT_NUMBERS.map((shiftNo) => (
                <Fragment key={`sub-${shiftNo}`}>
                  <th className="sticky top-[41px] z-20 min-w-[72px] border-b border-r bg-primary/5 px-1 py-1.5 text-center text-xs font-medium text-primary shadow-[0_1px_0_0_hsl(var(--border))]">
                    Mở ca
                  </th>
                  <th className="sticky top-[41px] z-20 min-w-[72px] border-b border-r border-r-primary/20 bg-primary/5 px-1 py-1.5 text-center text-xs font-medium text-primary shadow-[0_1px_0_0_hsl(var(--border))]">
                    Kết ca
                  </th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {groupedItems.map((group) => (
              <Fragment key={group.category}>
                <tr className="bg-accent/40">
                    <td
                      colSpan={isAdmin ? 12 : 10}
                      className="sticky left-0 z-10 border-b px-3 py-2 text-left text-xs font-bold uppercase tracking-wide"
                  >
                    {group.label}
                  </td>
                </tr>
                {group.items.map((item) => {
                  rowNumber += 1;
                  const isShortage = isShortageVariance(item.variance);

                  return (
                    <tr key={item.itemId} className="group hover:bg-muted/30">
                      <td className="sticky left-0 z-10 border-b border-r bg-background px-2 py-0 text-center text-muted-foreground group-hover:bg-muted/30">
                        {rowNumber}
                      </td>
                      <td className="sticky left-12 z-10 border-b border-r bg-background px-3 py-2 font-medium group-hover:bg-muted/30">
                        {item.itemName}
                      </td>
                      {SHIFT_NUMBERS.map((shiftNo) => (
                        <Fragment key={`${item.itemId}-${shiftNo}`}>
                          {renderShiftCell(item, shiftNo, "openingCount", false)}
                          {renderShiftCell(item, shiftNo, "closingCount", true)}
                        </Fragment>
                      ))}
                      {renderDayCell(item, "totalStockIn")}
                      {isAdmin && (
                        <>
                          <td className="border-b border-r px-2 py-2 text-center text-muted-foreground">
                            {item.systemSold ?? "—"}
                          </td>
                          <td
                            className={cn(
                              "border-b border-r px-2 py-2 text-center font-semibold",
                              isShortage && "bg-destructive/15 text-destructive",
                            )}
                          >
                            {item.variance === undefined
                              ? "—"
                              : formatVariance(item.variance)}
                          </td>
                        </>
                      )}
                      {renderDayCell(item, "note")}
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {dayItemsEditable && (
        <p className="text-xs text-muted-foreground">
          Mẹo: Dùng phím mũi tên hoặc Enter để chuyển giữa các ô. Dữ liệu tự
          lưu sau khoảng 1 giây ngừng nhập. Chênh lệch âm (đỏ) = hụt tồn.
        </p>
      )}
    </div>
    </TooltipProvider>
  );
};

export default memo(ShiftCountGrid);

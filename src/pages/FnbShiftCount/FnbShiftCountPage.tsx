import { PageHeader } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsAdmin } from "@/hooks/usePermission";
import dayjs from "@/lib/dayjs";
import { ClipboardList } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import ShiftCountFilters from "./components/ShiftCountFilters";
import ShiftCountGrid from "./components/ShiftCountGrid";
import ShiftCountHistoryTable from "./components/ShiftCountHistoryTable";
import ShiftCountSummary from "./components/ShiftCountSummary";
import {
  useFnbShiftCount,
  useFnbShiftCountItemsTemplate,
} from "./hooks/useFnbShiftCount";
import { useFnbShiftCountHistory } from "./hooks/useFnbShiftCountHistory";
import {
  useFnbShiftCountLockShift,
  useFnbShiftCountSaveDayItems,
  useFnbShiftCountSaveShift,
  useFnbShiftCountUnlockShift,
} from "./hooks/useFnbShiftCountMutations";
import { useFnbShiftCountQueryConfig } from "./hooks/useFnbShiftCountQueryConfig";
import type { ShiftCountField } from "./types";
import type { ShiftNo } from "@/apis/fnbShiftCount.apis";
import {
  formItemsFromResponse,
  isFnbBusinessDate,
  resolveShiftsForBusinessDay,
} from "./utils";

const FnbShiftCountPage = () => {
  const isAdmin = useIsAdmin();
  const { queryConfig, setQueryConfig } = useFnbShiftCountQueryConfig();
  const isEntryTab = queryConfig.tab === "entry";
  const [lockingShiftNo, setLockingShiftNo] = useState<ShiftNo | null>(null);

  const dateParams = useMemo(
    () => ({ date: queryConfig.date }),
    [queryConfig.date],
  );

  const { data: shiftCount, isLoading: isLoadingShiftCount } = useFnbShiftCount(
    dateParams,
    isEntryTab,
  );

  const { data: templateItems = [], isLoading: isLoadingTemplate } =
    useFnbShiftCountItemsTemplate(isEntryTab);

  const historyParams = useMemo(
    () => ({
      ...(queryConfig.historyFrom ? { from: queryConfig.historyFrom } : {}),
      ...(queryConfig.historyTo ? { to: queryConfig.historyTo } : {}),
      page: queryConfig.historyPage,
      limit: queryConfig.historyLimit,
    }),
    [
      queryConfig.historyFrom,
      queryConfig.historyTo,
      queryConfig.historyPage,
      queryConfig.historyLimit,
    ],
  );

  const { data: historyData, isLoading: isLoadingHistory } =
    useFnbShiftCountHistory(
      historyParams,
      isAdmin && queryConfig.tab === "history",
    );

  const { mutateAsync: saveShift } = useFnbShiftCountSaveShift();
  const { mutateAsync: saveDayItems } = useFnbShiftCountSaveDayItems();
  const { mutateAsync: lockShift } = useFnbShiftCountLockShift();
  const { mutateAsync: unlockShift } = useFnbShiftCountUnlockShift();

  const formItems = useMemo(() => {
    if (!templateItems.length && !shiftCount?.items?.length) return [];
    return formItemsFromResponse(
      templateItems,
      shiftCount ?? { items: [] },
    );
  }, [templateItems, shiftCount]);

  const isLoading = isLoadingShiftCount || isLoadingTemplate;

  const resolvedShifts = useMemo(
    () => resolveShiftsForBusinessDay(shiftCount?.shifts, queryConfig.date),
    [shiftCount?.shifts, queryConfig.date],
  );

  const dayItemsEditable = useMemo(() => {
    if (isFnbBusinessDate(queryConfig.date)) return true;
    return shiftCount?.editable ?? false;
  }, [queryConfig.date, shiftCount?.editable]);

  const handleShiftCellSave = useCallback(
    async (
      itemId: string,
      shiftNo: ShiftNo,
      field: ShiftCountField,
      value: number,
    ) => {
      if (!resolvedShifts?.[shiftNo]?.editable) return;

      await saveShift({
        shiftNo,
        date: queryConfig.date,
        body: {
          items: [{ itemId, [field]: value }],
        },
      });
    },
    [queryConfig.date, resolvedShifts, saveShift],
  );

  const handleDayFieldSave = useCallback(
    async (
      itemId: string,
      field: "totalStockIn" | "note",
      value: number | string,
    ) => {
      if (!dayItemsEditable) return;

      await saveDayItems({
        date: queryConfig.date,
        body: {
          items: [
            {
              itemId,
              ...(field === "totalStockIn"
                ? { totalStockIn: value as number }
                : { note: value as string }),
            },
          ],
        },
      });
    },
    [dayItemsEditable, queryConfig.date, saveDayItems],
  );

  const handleLockShift = useCallback(
    async (shiftNo: ShiftNo) => {
      setLockingShiftNo(shiftNo);
      try {
        await lockShift({ shiftNo, date: queryConfig.date });
      } finally {
        setLockingShiftNo(null);
      }
    },
    [lockShift, queryConfig.date],
  );

  const handleUnlockShift = useCallback(
    async (shiftNo: ShiftNo) => {
      setLockingShiftNo(shiftNo);
      try {
        await unlockShift({ shiftNo, date: queryConfig.date });
      } finally {
        setLockingShiftNo(null);
      }
    },
    [queryConfig.date, unlockShift],
  );

  const handleViewHistoryRecord = useCallback(
    (record: NonNullable<typeof shiftCount>) => {
      setQueryConfig({
        tab: "entry",
        date: dayjs(record.businessDate).format("YYYY-MM-DD"),
      });
    },
    [setQueryConfig],
  );

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Kiểm kê số lượng tồn"
        description="Nhập mở ca / kết ca theo 3 ca trong ngày và đối chiếu với hệ thống bán hàng"
        icon={ClipboardList}
      />

      <Tabs
        value={queryConfig.tab}
        onValueChange={(value) => setQueryConfig({ tab: value })}
      >
        <TabsList>
          <TabsTrigger value="entry">Kiểm kê</TabsTrigger>
          {isAdmin && <TabsTrigger value="history">Lịch sử</TabsTrigger>}
        </TabsList>

        <TabsContent value="entry" className="mt-6 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Bộ lọc</CardTitle>
            </CardHeader>
            <CardContent>
              <ShiftCountFilters
                date={queryConfig.date}
                search={queryConfig.search}
                onDateChange={(date) => setQueryConfig({ date })}
                onSearchChange={(search) => setQueryConfig({ search })}
              />
            </CardContent>
          </Card>

          <ShiftCountSummary summary={shiftCount?.summary} isAdmin={isAdmin} />

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Bảng kiểm kê</CardTitle>
            </CardHeader>
            <CardContent>
              <ShiftCountGrid
                items={formItems}
                shifts={resolvedShifts}
                dayItemsEditable={dayItemsEditable}
                isAdmin={isAdmin}
                search={queryConfig.search}
                isLoading={isLoading}
                lockingShiftNo={lockingShiftNo}
                onShiftCellSave={handleShiftCellSave}
                onDayFieldSave={handleDayFieldSave}
                onLockShift={handleLockShift}
                onUnlockShift={handleUnlockShift}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="history" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Lịch sử kiểm kê</CardTitle>
              </CardHeader>
              <CardContent>
                <ShiftCountHistoryTable
                  records={historyData?.items ?? []}
                  total={historyData?.total ?? 0}
                  page={historyData?.page ?? queryConfig.historyPage}
                  limit={historyData?.limit ?? queryConfig.historyLimit}
                  isLoading={isLoadingHistory}
                  historyFrom={queryConfig.historyFrom}
                  historyTo={queryConfig.historyTo}
                  onHistoryFromChange={(historyFrom) =>
                    setQueryConfig({ historyFrom, historyPage: 1 })
                  }
                  onHistoryToChange={(historyTo) =>
                    setQueryConfig({ historyTo, historyPage: 1 })
                  }
                  onPageChange={(historyPage) =>
                    setQueryConfig({ historyPage })
                  }
                  onViewRecord={handleViewHistoryRecord}
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default FnbShiftCountPage;

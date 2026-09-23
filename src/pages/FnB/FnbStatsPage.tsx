import { PageHeader } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import fnbOrderApis, {
  type FnbStatsCategory,
  type FnbStatsPeriod,
  type IFnbOrderStatsParams,
} from "@/apis/fnbOrder.apis";
import { useDebounce } from "@/hooks/use-debounce";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Calendar, Search, ShoppingBag, UtensilsCrossed } from "lucide-react";
import { useMemo, useState } from "react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import dayjs from "@/lib/dayjs";
import type { Dayjs } from "dayjs";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 400;
const MONTH_OPTIONS_COUNT = 12;

type WeekInMonth = {
  index: number;
  start: Dayjs;
  end: Dayjs;
  label: string;
};

const startOfWeekMonday = (d: Dayjs): Dayjs => {
  const day = d.startOf("day");
  const dow = day.day();
  if (dow === 0) return day.subtract(6, "day");
  return day.subtract(dow - 1, "day");
};

const getWeeksInMonth = (month: Dayjs): WeekInMonth[] => {
  const monthStart = month.startOf("month");
  const monthEnd = month.endOf("month");
  const weeks: WeekInMonth[] = [];
  let weekStart = startOfWeekMonday(monthStart);

  while (weeks.length < 6) {
    const weekEnd = weekStart.add(6, "day");
    if (weekStart.isAfter(monthEnd, "day")) break;

    if (!weekEnd.isBefore(monthStart, "day")) {
      const displayStart = weekStart.isBefore(monthStart) ? monthStart : weekStart;
      const displayEnd = weekEnd.isAfter(monthEnd) ? monthEnd : weekEnd;
      const index = weeks.length + 1;
      weeks.push({
        index,
        start: weekStart,
        end: weekEnd,
        label: `Week ${index} (${displayStart.format("DD/MM")} - ${displayEnd.format("DD/MM")})`,
      });
    }

    weekStart = weekStart.add(7, "day");
  }

  return weeks;
};

const getCurrentWeekIndex = (weeks: WeekInMonth[], date: Dayjs): number => {
  const match = weeks.find(
    (week) =>
      !date.isBefore(week.start, "day") && !date.isAfter(week.end, "day"),
  );
  return match?.index ?? weeks[0]?.index ?? 1;
};

const buildMonthOptions = (): Dayjs[] =>
  Array.from({ length: MONTH_OPTIONS_COUNT }, (_, i) =>
    dayjs().subtract(i, "month").startOf("month"),
  );

const PERIOD_OPTIONS: { value: FnbStatsPeriod; label: string }[] = [
  { value: "day", label: "By day" },
  { value: "week", label: "By week" },
  { value: "month", label: "By month" },
];

const CATEGORY_FILTER_ALL = "__all__";

const CATEGORY_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: CATEGORY_FILTER_ALL, label: "All" },
  { value: "drink", label: "Drinks" },
  { value: "snack", label: "Snacks" },
];

const CATEGORY_LABELS: Record<string, string> = {
  drink: "Drink",
  drinks: "Drinks",
  snack: "Snack",
  snacks: "Snacks",
};

const FNB_DAY_CUTOFF_HOUR = 3;

const getCurrentBusinessDate = (value: Dayjs): Dayjs =>
  value.hour() < FNB_DAY_CUTOFF_HOUR ? value.subtract(1, "day") : value;

function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category?.toLowerCase()] ?? category;
}

const FnbStatsPage = () => {
  const today = useMemo(() => dayjs(), []);
  const currentBusinessDate = useMemo(() => getCurrentBusinessDate(today), [today]);
  const monthOptions = useMemo(() => buildMonthOptions(), []);

  const [period, setPeriod] = useState<FnbStatsPeriod>("day");
  const [date, setDate] = useState<Date | undefined>(currentBusinessDate.toDate());
  const [selectedMonth, setSelectedMonth] = useState<Dayjs>(today.startOf("month"));
  const [selectedWeekIndex, setSelectedWeekIndex] = useState<number>(() =>
    getCurrentWeekIndex(getWeeksInMonth(today.startOf("month")), today),
  );
  const [category, setCategory] = useState<"" | FnbStatsCategory>("");
  const [search, setSearch] = useState("");
  const searchDebounced = useDebounce(search, DEBOUNCE_MS);

  const weeksInSelectedMonth = useMemo(
    () => getWeeksInMonth(selectedMonth),
    [selectedMonth],
  );

  const selectedWeek = useMemo(
    () =>
      weeksInSelectedMonth.find((week) => week.index === selectedWeekIndex) ??
      weeksInSelectedMonth[0],
    [weeksInSelectedMonth, selectedWeekIndex],
  );

  const apiDate = useMemo(() => {
    if (period === "day") {
      // Không truyền date vẫn phải giữ cùng ngày kinh doanh hiện tại.
      return date
        ? format(date, "yyyy-MM-dd")
        : currentBusinessDate.format("YYYY-MM-DD");
    }
    if (period === "week") {
      return selectedWeek?.start.format("YYYY-MM-DD");
    }
    return selectedMonth.startOf("month").format("YYYY-MM-DD");
  }, [period, date, selectedWeek, selectedMonth, currentBusinessDate]);

  const handlePeriodChange = (nextPeriod: FnbStatsPeriod) => {
    setPeriod(nextPeriod);
    if (nextPeriod === "day") {
      setDate(currentBusinessDate.toDate());
      return;
    }
    const currentMonth = today.startOf("month");
    setSelectedMonth(currentMonth);
    if (nextPeriod === "week") {
      setSelectedWeekIndex(
        getCurrentWeekIndex(getWeeksInMonth(currentMonth), today),
      );
    }
  };

  const handleMonthChange = (monthKey: string) => {
    const month = dayjs(monthKey).startOf("month");
    setSelectedMonth(month);
    if (period === "week") {
      const weeks = getWeeksInMonth(month);
      const defaultWeekIndex =
        month.isSame(today, "month")
          ? getCurrentWeekIndex(weeks, today)
          : (weeks[0]?.index ?? 1);
      setSelectedWeekIndex(defaultWeekIndex);
    }
  };

  const params: IFnbOrderStatsParams = useMemo(
    () => ({
      period,
      date: apiDate,
      ...(category ? { category } : {}),
      ...(searchDebounced.trim() ? { search: searchDebounced.trim() } : {}),
    }),
    [period, apiDate, category, searchDebounced]
  );

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["fnbOrderStats", params.period, params.date, params.category, params.search],
    queryFn: () => fnbOrderApis.getFnbOrderStats(params),
    enabled: true,
  });

  const result = data?.data?.result;
  const periodLabel =
    period === "day"
      ? "Day"
      : period === "week"
        ? "Week"
        : "Month";

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="FNB Statistics"
        description="Food & beverage order stats by day, week, or month"
        icon={BarChart3}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Period</label>
            <Select
              value={period}
              onValueChange={(v) => handlePeriodChange(v as FnbStatsPeriod)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {period === "day" && (
            <div className="flex w-[180px] flex-col gap-2">
              <label className="text-sm font-medium">Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-9 w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4 shrink-0" />
                    {date ? (
                      format(date, "MMM d, yyyy", { locale: enUS })
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    locale={enUS}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
          {period === "week" && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Month</label>
                <Select
                  value={selectedMonth.format("YYYY-MM")}
                  onValueChange={handleMonthChange}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((month) => (
                      <SelectItem
                        key={month.format("YYYY-MM")}
                        value={month.format("YYYY-MM")}
                      >
                        {month.format("MM/YYYY")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Week</label>
                <Select
                  value={String(selectedWeekIndex)}
                  onValueChange={(v) => setSelectedWeekIndex(Number(v))}
                >
                  <SelectTrigger className="w-[240px]">
                    <SelectValue placeholder="Select week" />
                  </SelectTrigger>
                  <SelectContent>
                    {weeksInSelectedMonth.map((week) => (
                      <SelectItem key={week.index} value={String(week.index)}>
                        {week.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          {period === "month" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Month</label>
              <Select
                value={selectedMonth.format("YYYY-MM")}
                onValueChange={handleMonthChange}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((month) => (
                    <SelectItem
                      key={month.format("YYYY-MM")}
                      value={month.format("YYYY-MM")}
                    >
                      {month.format("MM/YYYY")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">Category</label>
            <Select
              value={category || CATEGORY_FILTER_ALL}
              onValueChange={(v) =>
                setCategory(v === CATEGORY_FILTER_ALL ? "" : (v as FnbStatsCategory))
              }
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_FILTER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Search by item name</label>
            <div className="relative w-[240px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Spinner className="h-8 w-8" />
        </div>
      )}

      {isError && (
        <Card className="border-destructive/50">
          <CardContent className="pt-6">
            <p className="text-destructive">
              {error instanceof Error ? error.message : "Failed to load FNB statistics."}
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && result && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Time range ({periodLabel})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {result.period.fromFormatted} — {result.period.toFormatted}
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total items sold
                </CardTitle>
                <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {result.totalItemsSold}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Orders
                </CardTitle>
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{result.ordersCount}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Items breakdown</CardTitle>
              <p className="text-sm text-muted-foreground">
                Quantity sold per item in the selected period
              </p>
            </CardHeader>
            <CardContent>
              {result.itemsBreakdown.length === 0 ? (
                <p className="text-muted-foreground py-6 text-center">
                  No sales data for this period.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.itemsBreakdown.map((item) => (
                      <TableRow key={item.itemId}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>
                          {getCategoryLabel(item.category)}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.quantity}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default FnbStatsPage;

import { IEmployeeSchedule } from "@/apis/staffSchedule.apis";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmployeeScheduleStatus } from "@/constants/enum";
import { cn } from "@/lib/utils";
import dayjs, { Dayjs } from "dayjs";
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export type EarningsItem = {
  date: Dayjs;
  startTime: string;
  endTime: string;
  hours: number;
  salary: number;
  expectedSalary: number;
  status: EmployeeScheduleStatus | "not-registered";
  schedule?: IEmployeeSchedule;
};

export type EarningsSummary = {
  items: EarningsItem[];
  totalHours: number;
  totalSalary: number;
  grossSalary?: number;
  totalDeductions?: number;
  deductionCount?: number;
  totalShifts: number;
  totalRegistered: number;
  expectedHours: number;
  expectedSalary: number;
  expectedShifts: number;
};

type FilterMode = "all" | "registered" | "completed";
type EarningsLocale = "vi" | "en";

interface StaffEarningsMobileViewProps {
  earningsData: EarningsSummary;
  selectedMonth: Dayjs;
  onMonthChange: (month: Dayjs) => void;
  dayNames: string[];
  dayShortNames?: string[];
  isLoading: boolean;
  locale?: EarningsLocale;
}

const STATUS_STYLES: Record<
  EarningsItem["status"],
  { dot: string; border: string; bg: string; badge: string }
> = {
  "not-registered": {
    dot: "bg-gray-200",
    border: "border-l-gray-300",
    bg: "bg-gray-50/80",
    badge: "bg-gray-100 text-gray-600 border-gray-300",
  },
  [EmployeeScheduleStatus.Completed]: {
    dot: "bg-emerald-500",
    border: "border-l-emerald-500",
    bg: "bg-emerald-50/40",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  [EmployeeScheduleStatus.Absent]: {
    dot: "bg-red-500",
    border: "border-l-red-500",
    bg: "bg-red-50/60",
    badge: "bg-red-100 text-red-700 border-red-300",
  },
  [EmployeeScheduleStatus.Pending]: {
    dot: "bg-amber-400",
    border: "border-l-amber-400",
    bg: "bg-amber-50/40",
    badge: "bg-yellow-100 text-yellow-800 border-yellow-300",
  },
  [EmployeeScheduleStatus.Approved]: {
    dot: "bg-blue-500",
    border: "border-l-blue-500",
    bg: "bg-blue-50/40",
    badge: "bg-blue-100 text-blue-800 border-blue-300",
  },
  [EmployeeScheduleStatus.InProgress]: {
    dot: "bg-violet-500",
    border: "border-l-violet-500",
    bg: "bg-violet-50/40",
    badge: "bg-violet-100 text-violet-800 border-violet-300",
  },
  [EmployeeScheduleStatus.Rejected]: {
    dot: "bg-rose-400",
    border: "border-l-rose-400",
    bg: "bg-rose-50/40",
    badge: "bg-rose-100 text-rose-800 border-rose-300",
  },
  [EmployeeScheduleStatus.Cancelled]: {
    dot: "bg-slate-400",
    border: "border-l-slate-400",
    bg: "bg-slate-50/40",
    badge: "bg-slate-100 text-slate-700 border-slate-300",
  },
  [EmployeeScheduleStatus.All]: {
    dot: "bg-gray-400",
    border: "border-l-gray-400",
    bg: "bg-gray-50",
    badge: "bg-gray-100 text-gray-700 border-gray-300",
  },
};

const STATUS_LABELS: Record<
  EarningsLocale,
  Record<EarningsItem["status"], string>
> = {
  vi: {
    "not-registered": "Chưa đăng ký",
    [EmployeeScheduleStatus.Completed]: "Hoàn thành",
    [EmployeeScheduleStatus.Absent]: "Vắng mặt",
    [EmployeeScheduleStatus.Pending]: "Chờ duyệt",
    [EmployeeScheduleStatus.Approved]: "Đã duyệt",
    [EmployeeScheduleStatus.InProgress]: "Đang làm",
    [EmployeeScheduleStatus.Rejected]: "Từ chối",
    [EmployeeScheduleStatus.Cancelled]: "Đã hủy",
    [EmployeeScheduleStatus.All]: "Tất cả",
  },
  en: {
    "not-registered": "Not registered",
    [EmployeeScheduleStatus.Completed]: "Completed",
    [EmployeeScheduleStatus.Absent]: "Absent",
    [EmployeeScheduleStatus.Pending]: "Pending approval",
    [EmployeeScheduleStatus.Approved]: "Approved",
    [EmployeeScheduleStatus.InProgress]: "In progress",
    [EmployeeScheduleStatus.Rejected]: "Rejected",
    [EmployeeScheduleStatus.Cancelled]: "Cancelled",
    [EmployeeScheduleStatus.All]: "All",
  },
};

const MOBILE_TEXT: Record<
  EarningsLocale,
  {
    month: string;
    registeredShifts: (n: number) => string;
    takeHome: string;
    hoursWorked: (h: number) => string;
    shiftsCompleted: (n: number) => string;
    completionProgress: string;
    expected: string;
    registered: string;
    regHours: string;
    calendarTitle: string;
    calendarHint: string;
    notInFilter: (date: string) => string;
    noShift: (date: string) => string;
    noFilterMatch: string;
    noShiftsTitle: string;
    noShiftsDesc: string;
    week: (n: number) => string;
    monthTotal: string;
    workHours: string;
    filterRegistered: string;
    filterCompleted: string;
    filterAll: string;
    expectedPay: string;
    deductions: string;
    weekdays: string[];
  }
> = {
  vi: {
    month: "Tháng",
    registeredShifts: (n) => `${n} ca đăng ký`,
    takeHome: "Lương thực nhận",
    hoursWorked: (h) => `${h}h làm việc`,
    shiftsCompleted: (n) => `${n} ca hoàn thành`,
    completionProgress: "Tiến độ hoàn thành",
    expected: "Dự kiến",
    registered: "Đăng ký",
    regHours: "Giờ DK",
    calendarTitle: "Lịch tháng",
    calendarHint: "Chạm ngày để cuộn tới ca tương ứng",
    notInFilter: (d) => `Ngày ${d} không có trong bộ lọc hiện tại`,
    noShift: (d) => `Ngày ${d} chưa có ca đăng ký`,
    noFilterMatch: "Không có ca nào phù hợp bộ lọc",
    noShiftsTitle: "Không có ca làm việc nào",
    noShiftsDesc: "Chưa có ca làm việc nào trong tháng này",
    week: (n) => `Tuần ${n}`,
    monthTotal: "Tổng cộng tháng",
    workHours: "Giờ làm",
    filterRegistered: "Có ca",
    filterCompleted: "Hoàn thành",
    filterAll: "Tất cả",
    expectedPay: "Dự kiến",
    deductions: "Khấu trừ",
    weekdays: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"],
  },
  en: {
    month: "Month",
    registeredShifts: (n) => `${n} shifts registered`,
    takeHome: "Take-home pay",
    hoursWorked: (h) => `${h}h worked`,
    shiftsCompleted: (n) => `${n} shifts completed`,
    completionProgress: "Completion progress",
    expected: "Expected",
    registered: "Registered",
    regHours: "Reg. hours",
    calendarTitle: "Month calendar",
    calendarHint: "Tap a day to jump to that shift",
    notInFilter: (d) => `${d} is not in the current filter`,
    noShift: (d) => `No shift registered on ${d}`,
    noFilterMatch: "No shifts match this filter",
    noShiftsTitle: "No shifts",
    noShiftsDesc: "No shifts this month",
    week: (n) => `Week ${n}`,
    monthTotal: "Month total",
    workHours: "Hours worked",
    filterRegistered: "Registered",
    filterCompleted: "Completed",
    filterAll: "All",
    expectedPay: "Expected",
    deductions: "Deductions",
    weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  },
};

const getStatusConfig = (
  status: EarningsItem["status"],
  locale: EarningsLocale,
) => {
  const styles =
    STATUS_STYLES[status] ?? STATUS_STYLES[EmployeeScheduleStatus.All];
  const label =
    STATUS_LABELS[locale][status] ??
    STATUS_LABELS[locale][EmployeeScheduleStatus.All];
  return { ...styles, label };
};

const getWeekStartMonday = (date: Dayjs) => {
  const daysFromMonday = (date.day() + 6) % 7;
  return date.subtract(daysFromMonday, "day");
};

const SHIFT_NAME_LABELS: Record<
  EarningsLocale,
  Record<string, string> & { custom: string }
> = {
  vi: {
    shift1: "Ca 1",
    morning: "Ca 1",
    shift2: "Ca 2",
    afternoon: "Ca 2",
    evening: "Ca 2",
    shift3: "Ca 3",
    all: "Ca 3",
    custom: "Ca tùy chỉnh",
  },
  en: {
    shift1: "Shift 1",
    morning: "Shift 1",
    shift2: "Shift 2",
    afternoon: "Shift 2",
    evening: "Shift 2",
    shift3: "Shift 3",
    all: "Shift 3",
    custom: "Custom",
  },
};

const getShiftName = (
  item: EarningsItem,
  locale: EarningsLocale,
): string | null => {
  if (item.status === "not-registered" || !item.schedule) return null;

  const { schedule } = item;
  if (schedule.shiftInfo?.name) return schedule.shiftInfo.name;

  if (schedule.customStartTime && schedule.customEndTime) {
    return SHIFT_NAME_LABELS[locale].custom;
  }

  const shift = schedule.shift || schedule.shiftType;
  if (!shift) return null;

  return SHIFT_NAME_LABELS[locale][shift] ?? shift;
};

const getShiftBadgeStyle = (item: EarningsItem): string => {
  const shift = item.schedule?.shift || item.schedule?.shiftType;
  if (item.schedule?.customStartTime && item.schedule?.customEndTime) {
    return "bg-gray-100 text-gray-700";
  }
  if (shift === "shift1" || shift === "morning") {
    return "bg-orange-100 text-orange-800";
  }
  if (shift === "shift2" || shift === "afternoon" || shift === "evening") {
    return "bg-indigo-100 text-indigo-800";
  }
  if (shift === "shift3" || shift === "all") {
    return "bg-green-100 text-green-800";
  }
  return "bg-muted text-foreground";
};

const StatusBadge = ({
  status,
  locale,
}: {
  status: EarningsItem["status"];
  locale: EarningsLocale;
}) => {
  const config = getStatusConfig(status, locale);
  return (
    <Badge variant="outline" className={cn("text-xs", config.badge)}>
      {config.label}
    </Badge>
  );
};

const StaffEarningsMobileView = ({
  earningsData,
  selectedMonth,
  onMonthChange,
  dayNames,
  dayShortNames,
  isLoading,
  locale = "vi",
}: StaffEarningsMobileViewProps) => {
  const text = MOBILE_TEXT[locale];
  const numberLocale = locale === "vi" ? "vi-VN" : "en-US";
  const formatDayShort = (dayIndex: number) =>
    dayShortNames?.[dayIndex] ??
    dayNames[dayIndex]?.replace("Thứ ", "T") ??
    "";
  const [filter, setFilter] = useState<FilterMode>("registered");
  const [highlightedDay, setHighlightedDay] = useState<string | null>(null);
  const [openWeeks, setOpenWeeks] = useState<Set<string>>(new Set());
  const [tapMessage, setTapMessage] = useState<string | null>(null);

  const canGoNext = selectedMonth.isBefore(dayjs(), "month");
  const canGoPrev = true;

  const filteredItems = useMemo(() => {
    let items = earningsData.items;

    if (filter === "registered") {
      items = items.filter((item) => item.status !== "not-registered");
    } else if (filter === "completed") {
      items = items.filter(
        (item) => item.status === EmployeeScheduleStatus.Completed,
      );
    }

    return items;
  }, [earningsData.items, filter]);

  // Mặc định mở tuần hiện tại khi đổi tháng
  useEffect(() => {
    const today = dayjs();
    const defaultKey = today.isSame(selectedMonth, "month")
      ? getWeekStartMonday(today).format("YYYY-MM-DD")
      : earningsData.items.length > 0
        ? getWeekStartMonday(earningsData.items[0].date).format("YYYY-MM-DD")
        : null;

    if (defaultKey) {
      setOpenWeeks(new Set([defaultKey]));
    }
  }, [selectedMonth, earningsData.items]);

  const weekGroups = useMemo(() => {
    const groups: Array<{
      key: string;
      label: string;
      items: EarningsItem[];
      weekSalary: number;
      weekHours: number;
    }> = [];

    filteredItems.forEach((item) => {
      const weekStart = getWeekStartMonday(item.date);
      const weekEnd = weekStart.add(6, "day");
      const key = weekStart.format("YYYY-MM-DD");
      const label = `${weekStart.format("DD/MM")} – ${weekEnd.format("DD/MM")}`;

      const existing = groups.find((g) => g.key === key);
      if (existing) {
        existing.items.push(item);
        if (item.status === EmployeeScheduleStatus.Completed) {
          existing.weekSalary += item.salary;
          existing.weekHours += item.hours;
        }
      } else {
        groups.push({
          key,
          label,
          items: [item],
          weekSalary:
            item.status === EmployeeScheduleStatus.Completed ? item.salary : 0,
          weekHours:
            item.status === EmployeeScheduleStatus.Completed ? item.hours : 0,
        });
      }
    });

    return groups;
  }, [filteredItems]);

  const completionRate = useMemo(() => {
    if (earningsData.totalRegistered === 0) return 0;
    return Math.round(
      (earningsData.totalShifts / earningsData.totalRegistered) * 100,
    );
  }, [earningsData.totalRegistered, earningsData.totalShifts]);

  const calendarGrid = useMemo(() => {
    const firstDay = selectedMonth.startOf("month");
    const daysInMonth = selectedMonth.daysInMonth();
    const startOffset = (firstDay.day() + 6) % 7;

    const cells: Array<{
      day: number | null;
      dateKey: string | null;
      status: EarningsItem["status"] | null;
    }> = [];

    for (let i = 0; i < startOffset; i++) {
      cells.push({ day: null, dateKey: null, status: null });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = selectedMonth.date(day);
      const dateKey = date.format("YYYY-MM-DD");
      const dayItems = earningsData.items.filter(
        (item) => item.date.format("YYYY-MM-DD") === dateKey,
      );
      const primaryStatus =
        dayItems.length === 0
          ? ("not-registered" as const)
          : dayItems[0].status;

      cells.push({ day, dateKey, status: primaryStatus });
    }

    return cells;
  }, [earningsData.items, selectedMonth]);

  const handleDayTap = (dateKey: string | null) => {
    if (!dateKey) return;

    const existsInList = filteredItems.some(
      (item) => item.date.format("YYYY-MM-DD") === dateKey,
    );

    if (!existsInList) {
      const date = dayjs(dateKey);
      const hasShift = earningsData.items.some(
        (item) =>
          item.date.format("YYYY-MM-DD") === dateKey &&
          item.status !== "not-registered",
      );
      const dateLabel = date.format("DD/MM");
      setTapMessage(
        hasShift
          ? text.notInFilter(dateLabel)
          : text.noShift(dateLabel),
      );
      setTimeout(() => setTapMessage(null), 2500);
      return;
    }

    const weekKey = getWeekStartMonday(dayjs(dateKey)).format("YYYY-MM-DD");
    const needsOpen = !openWeeks.has(weekKey);
    setOpenWeeks((prev) => new Set([...prev, weekKey]));
    setHighlightedDay(dateKey);
    setTapMessage(null);

    // Đợi collapsible mở xong rồi mới cuộn
    const scrollDelay = needsOpen ? 200 : 0;
    setTimeout(() => {
      document
        .getElementById(`earnings-day-${dateKey}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, scrollDelay);

    setTimeout(() => setHighlightedDay(null), 2000);
  };

  const toggleWeek = (weekKey: string, open: boolean) => {
    setOpenWeeks((prev) => {
      const next = new Set(prev);
      if (open) next.add(weekKey);
      else next.delete(weekKey);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Clock className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (earningsData.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium text-muted-foreground">
          {text.noShiftsTitle}
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          {text.noShiftsDesc}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      {/* Month Navigator */}
      <div className="flex items-center justify-between rounded-xl border bg-card p-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          disabled={!canGoPrev}
          onClick={() => onMonthChange(selectedMonth.subtract(1, "month"))}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="text-center">
          <p className="text-base font-semibold">
            {text.month} {selectedMonth.format("MM/YYYY")}
          </p>
          <p className="text-xs text-muted-foreground">
            {text.registeredShifts(earningsData.totalRegistered)}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          disabled={!canGoNext}
          onClick={() => onMonthChange(selectedMonth.add(1, "month"))}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Hero Summary */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-4 text-white shadow-lg">
        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
        <div className="absolute -bottom-4 -left-4 h-16 w-16 rounded-full bg-white/10" />
        <p className="text-sm font-medium text-emerald-100">{text.takeHome}</p>
        <p className="mt-1 text-3xl font-bold tracking-tight">
          {earningsData.totalSalary.toLocaleString(numberLocale)}₫
        </p>
        <div className="mt-3 flex items-center gap-4 text-sm text-emerald-100">
          <span>{text.hoursWorked(earningsData.totalHours)}</span>
          <span>•</span>
          <span>{text.shiftsCompleted(earningsData.totalShifts)}</span>
        </div>
        {!!earningsData.totalDeductions && (
          <p className="mt-2 text-xs text-emerald-100">
            {(earningsData.grossSalary ?? 0).toLocaleString(numberLocale)}₫ - {earningsData.totalDeductions.toLocaleString(numberLocale)}₫ {text.deductions.toLowerCase()}
          </p>
        )}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-emerald-100 mb-1">
            <span>{text.completionProgress}</span>
            <span>{completionRate}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/20 overflow-hidden">
            <div
              className="h-full rounded-full bg-white transition-all duration-500"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border bg-blue-50/50 border-blue-200 p-3 text-center">
          <DollarSign className="mx-auto h-4 w-4 text-blue-600 mb-1" />
          <p className="text-xs text-muted-foreground">{text.expected}</p>
          <p className="text-sm font-bold text-blue-700">
            {(earningsData.expectedSalary / 1000).toFixed(0)}k
          </p>
        </div>
        {!!earningsData.totalDeductions && (
          <div className="rounded-xl border bg-red-50/50 border-red-200 p-3 text-center">
            <DollarSign className="mx-auto h-4 w-4 text-red-600 mb-1" />
            <p className="text-xs text-muted-foreground">{text.deductions}</p>
            <p className="text-sm font-bold text-red-700">
              -{(earningsData.totalDeductions / 1000).toFixed(0)}k
            </p>
          </div>
        )}
        <div className="rounded-xl border p-3 text-center">
          <CalendarIcon className="mx-auto h-4 w-4 text-orange-600 mb-1" />
          <p className="text-xs text-muted-foreground">{text.registered}</p>
          <p className="text-sm font-bold text-orange-600">
            {earningsData.totalRegistered}
          </p>
        </div>
        <div className="rounded-xl border p-3 text-center">
          <Clock className="mx-auto h-4 w-4 text-purple-600 mb-1" />
          <p className="text-xs text-muted-foreground">{text.regHours}</p>
          <p className="text-sm font-bold text-purple-600">
            {earningsData.expectedHours}h
          </p>
        </div>
      </div>

      {/* Mini Calendar - tap to jump, not filter */}
      <div className="rounded-xl border p-3">
        <div className="mb-3">
          <p className="text-sm font-medium">{text.calendarTitle}</p>
          <p className="text-[11px] text-muted-foreground">
            {text.calendarHint}
          </p>
        </div>
        {tapMessage && (
          <p className="mb-2 rounded-lg bg-muted px-2.5 py-1.5 text-xs text-muted-foreground text-center animate-in fade-in duration-200">
            {tapMessage}
          </p>
        )}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {text.weekdays.map((d) => (
            <div
              key={d}
              className="text-center text-[10px] font-medium text-muted-foreground"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {calendarGrid.map((cell, i) => {
            if (!cell.day) {
              return <div key={`empty-${i}`} className="aspect-square" />;
            }
            const config = getStatusConfig(cell.status!, locale);
            const isHighlighted = highlightedDay === cell.dateKey;
            const isToday = cell.dateKey === dayjs().format("YYYY-MM-DD");
            const hasVisibleEntry = filteredItems.some(
              (item) => item.date.format("YYYY-MM-DD") === cell.dateKey,
            );

            return (
              <button
                key={cell.dateKey}
                type="button"
                onClick={() => handleDayTap(cell.dateKey)}
                className={cn(
                  "aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all touch-manipulation",
                  hasVisibleEntry
                    ? "hover:bg-muted/60 active:scale-95"
                    : "opacity-50",
                  isHighlighted && "bg-primary/15 scale-105",
                  isToday && "font-semibold",
                )}
              >
                <span
                  className={cn(
                    "text-[11px] font-medium leading-none",
                    isToday && "text-primary",
                  )}
                >
                  {cell.day}
                </span>
                <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
          {(
            [
              EmployeeScheduleStatus.Completed,
              EmployeeScheduleStatus.Approved,
              EmployeeScheduleStatus.Pending,
              EmployeeScheduleStatus.Absent,
              "not-registered",
            ] as EarningsItem["status"][]
          ).map((s) => (
            <div key={s} className="flex items-center gap-1">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  getStatusConfig(s, locale).dot,
                )}
              />
              <span className="text-[10px] text-muted-foreground">
                {getStatusConfig(s, locale).label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Filter Tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterMode)}>
        <TabsList className="grid w-full grid-cols-3 h-9">
          <TabsTrigger value="registered" className="text-xs">
            {text.filterRegistered} ({earningsData.totalRegistered})
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-xs">
            {text.filterCompleted} ({earningsData.totalShifts})
          </TabsTrigger>
          <TabsTrigger value="all" className="text-xs">
            {text.filterAll}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Timeline */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">
              {text.noFilterMatch}
            </p>
          </div>
        ) : (
          weekGroups.map((week, weekIndex) => {
            const shownDates = new Set<string>();

            return (
              <Collapsible
                key={week.key}
                open={openWeeks.has(week.key)}
                onOpenChange={(open) => toggleWeek(week.key, open)}
              >
                <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-lg bg-muted/50 px-3 py-2 touch-manipulation">
                  <div className="text-left">
                    <p className="text-xs font-semibold">
                      {text.week(weekIndex + 1)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {week.label}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {week.weekSalary > 0 && (
                      <span className="text-xs font-semibold text-emerald-600">
                        {week.weekSalary.toLocaleString(numberLocale)}₫
                      </span>
                    )}
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  {week.items.map((item, index) => {
                    const config = getStatusConfig(item.status, locale);
                    const isNotRegistered = item.status === "not-registered";
                    const isCompleted =
                      item.status === EmployeeScheduleStatus.Completed;
                    const dateKey = item.date.format("YYYY-MM-DD");
                    const isFirstOfDay = !shownDates.has(dateKey);
                    if (isFirstOfDay) shownDates.add(dateKey);
                    const isHighlighted = highlightedDay === dateKey;
                    const shiftName = getShiftName(item, locale);

                    return (
                      <div
                        key={`${dateKey}-${index}`}
                        id={
                          isFirstOfDay ? `earnings-day-${dateKey}` : undefined
                        }
                        className={cn(
                          "rounded-xl border border-l-4 p-3 transition-all duration-500",
                          config.border,
                          config.bg,
                          isHighlighted &&
                            "ring-2 ring-primary ring-offset-2 shadow-md",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-background shadow-sm">
                              <span className="text-sm font-bold leading-none">
                                {item.date.format("DD")}
                              </span>
                              <span className="text-[9px] text-muted-foreground leading-none mt-0.5">
                                {formatDayShort(item.date.day())}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                {item.date.format("DD/MM/YYYY")}
                              </p>
                              <StatusBadge status={item.status} locale={locale} />
                            </div>
                          </div>
                          {!isNotRegistered && isCompleted && (
                            <p className="text-base font-bold text-emerald-600 shrink-0">
                              {item.salary.toLocaleString(numberLocale)}₫
                            </p>
                          )}
                        </div>

                        {!isNotRegistered && (
                          <div className="mt-2.5 flex items-center justify-between gap-2 rounded-lg bg-background/70 px-3 py-2">
                            <div className="flex min-w-0 items-center gap-2 text-sm">
                              {shiftName && (
                                <span
                                  className={cn(
                                    "shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold leading-none",
                                    getShiftBadgeStyle(item),
                                  )}
                                >
                                  {shiftName}
                                </span>
                              )}
                              <span className="font-semibold tabular-nums">
                                {item.startTime}
                              </span>
                              <span className="text-muted-foreground">→</span>
                              <span className="font-semibold tabular-nums">
                                {item.endTime}
                              </span>
                            </div>
                            <span className="shrink-0 text-sm font-medium text-muted-foreground">
                              {item.hours}h
                            </span>
                          </div>
                        )}

                        {!isNotRegistered &&
                          !isCompleted &&
                          item.status !== EmployeeScheduleStatus.Rejected && (
                            <p className="mt-2 text-xs text-muted-foreground">
                              {text.expectedPay}:{" "}
                              <span className="font-medium text-blue-600">
                                {item.expectedSalary.toLocaleString(numberLocale)}₫
                              </span>
                            </p>
                          )}
                      </div>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            );
          })
        )}
      </div>

      {/* Sticky Footer Summary */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] md:hidden">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div>
            <p className="text-xs text-muted-foreground">{text.monthTotal}</p>
            <p className="text-lg font-bold text-emerald-600">
              {earningsData.totalSalary.toLocaleString(numberLocale)}₫
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">{text.workHours}</p>
            <p className="text-lg font-bold">{earningsData.totalHours}h</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffEarningsMobileView;

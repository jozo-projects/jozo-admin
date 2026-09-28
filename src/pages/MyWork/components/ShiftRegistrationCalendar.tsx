import dayjs, { Dayjs } from "dayjs";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { IEmployeeSchedule } from "@/apis/staffSchedule.apis";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ShiftRegistrationCalendarProps {
  schedules: IEmployeeSchedule[];
  onDateClick: (date: Dayjs) => void;
  currentDate: Dayjs;
  onCurrentDateChange: (date: Dayjs) => void;
}

export function ShiftRegistrationCalendar({
  schedules,
  onDateClick,
  currentDate,
  onCurrentDateChange,
}: ShiftRegistrationCalendarProps) {
  const getShiftStyles = (shiftType: string) => {
    if (shiftType === "Shift 1") {
      return {
        mobile: "bg-orange-100 text-orange-800 border-orange-200",
        desktop: "bg-orange-100 text-orange-800 border-orange-200",
      };
    }

    if (shiftType === "Shift 2") {
      return {
        mobile: "bg-indigo-100 text-indigo-800 border-indigo-200",
        desktop: "bg-indigo-100 text-indigo-800 border-indigo-200",
      };
    }

    if (shiftType === "Shift 3") {
      return {
        mobile: "bg-green-100 text-green-800 border-green-200",
        desktop: "bg-green-100 text-green-800 border-green-200",
      };
    }

    return {
      mobile: "bg-gray-100 text-gray-800 border-gray-200",
      desktop: "bg-gray-100 text-gray-800 border-gray-200",
    };
  };

  const getShiftShortLabel = (shiftType: string) => {
    if (shiftType === "Shift 1") return "S1";
    if (shiftType === "Shift 2") return "S2";
    if (shiftType === "Shift 3") return "S3";
    return "CU";
  };

  // Group schedules by date
  const schedulesByDate = useMemo(() => {
    const map = new Map<string, IEmployeeSchedule[]>();
    schedules.forEach((schedule) => {
      const dateKey = dayjs(schedule.date).format("YYYY-MM-DD");
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(schedule);
    });
    return map;
  }, [schedules]);

  // Generate calendar grid
  const calendarGrid = useMemo(() => {
    const firstDayOfMonth = currentDate.startOf("month");
    const lastDayOfMonth = currentDate.endOf("month");
    const firstDayOfWeek = firstDayOfMonth.day();
    const daysInMonth = lastDayOfMonth.date();
    const daysInPrevMonth = firstDayOfMonth.subtract(1, "month").daysInMonth();

    const grid = [];
    let dayCount = 1;
    let nextMonthDayCount = 1;

    // Generate 6 weeks of calendar
    for (let week = 0; week < 6; week++) {
      const weekDays = [];
      for (let day = 0; day < 7; day++) {
        if (week === 0 && day < firstDayOfWeek) {
          // Days from previous month
          weekDays.push({
            date: currentDate
              .subtract(1, "month")
              .date(daysInPrevMonth - firstDayOfWeek + day + 1),
            isCurrentMonth: false,
          });
        } else if (dayCount > daysInMonth) {
          // Days from next month
          weekDays.push({
            date: currentDate.add(1, "month").date(nextMonthDayCount),
            isCurrentMonth: false,
          });
          nextMonthDayCount++;
        } else {
          // Days from current month
          weekDays.push({
            date: currentDate.date(dayCount),
            isCurrentMonth: true,
          });
          dayCount++;
        }
      }
      grid.push(weekDays);
    }
    return grid;
  }, [currentDate]);

  const handlePrevMonth = () => {
    onCurrentDateChange(currentDate.subtract(1, "month"));
  };

  const handleNextMonth = () => {
    onCurrentDateChange(currentDate.add(1, "month"));
  };

  const handleToday = () => {
    onCurrentDateChange(dayjs());
  };

  const getSchedulesForDate = (date: Dayjs): IEmployeeSchedule[] => {
    const dateKey = date.format("YYYY-MM-DD");
    return schedulesByDate.get(dateKey) || [];
  };

  const getShiftTypesForDate = (date: Dayjs): string[] => {
    const daySchedules = getSchedulesForDate(date);
    const shiftTypes = new Set<string>();

    daySchedules.forEach((schedule) => {
      const shift = schedule.shift || schedule.shiftType;
      if (shift === "shift1" || shift === "morning") {
        shiftTypes.add("Shift 1");
      } else if (
        shift === "shift2" ||
        shift === "afternoon" ||
        shift === "evening"
      ) {
        shiftTypes.add("Shift 2");
      } else if (shift === "shift3" || shift === "all") {
        shiftTypes.add("Shift 3");
      } else if (schedule.customStartTime && schedule.customEndTime) {
        shiftTypes.add("Custom shift");
      }
    });

    return Array.from(shiftTypes);
  };

  return (
    <div className="w-full">
      {/* Calendar Header */}
      <div className="mb-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm sm:mb-5 sm:rounded-xl sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrevMonth}
            className="h-10 w-10 shrink-0 rounded-full text-slate-600 hover:bg-slate-100 sm:h-9 sm:w-9"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <div className="min-w-0 flex-1 text-center">
            <h2 className="truncate text-base font-semibold capitalize tracking-tight text-slate-900 sm:text-xl md:text-2xl">
              {currentDate.format("MMMM YYYY")}
            </h2>
            <button
              type="button"
              onClick={handleToday}
              className="mt-0.5 text-xs font-medium text-blue-600 transition-colors hover:text-blue-700 sm:text-sm"
            >
              Today
            </button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleNextMonth}
            className="h-10 w-10 shrink-0 rounded-full text-slate-600 hover:bg-slate-100 sm:h-9 sm:w-9"
            aria-label="Next month"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1.5 bg-transparent sm:gap-px sm:overflow-hidden sm:rounded-xl sm:border sm:border-slate-200/80 sm:bg-slate-200/80">
        {/* Weekday Headers */}
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="rounded-lg bg-transparent py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:rounded-none sm:bg-slate-50 sm:py-3 sm:text-sm sm:text-slate-500"
          >
            {day}
          </div>
        ))}

        {/* Calendar Days */}
        {calendarGrid.map((week, weekIndex) =>
          week.map((day, dayIndex) => {
            const daySchedules = getSchedulesForDate(day.date);
            const shiftTypes = getShiftTypesForDate(day.date);
            const isToday = day.date.isSame(dayjs(), "day");
            const isPast = day.date.isBefore(dayjs(), "day");
            const isFull = daySchedules.length >= 2;
            const isDisabled = isPast;

            return (
              <div
                key={`${weekIndex}-${dayIndex}`}
                className={cn(
                  "relative min-h-[72px] rounded-xl border border-slate-200/80 bg-white px-1.5 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-all sm:min-h-[110px] sm:rounded-none sm:border-0 sm:bg-white sm:px-2 sm:py-2 md:min-h-[120px] md:p-2.5 lg:min-h-[132px]",
                  !isDisabled && "cursor-pointer active:scale-[0.99]",
                  !day.isCurrentMonth && "text-gray-400",
                  isToday && "bg-blue-50 ring-1 ring-inset ring-blue-200",
                  isDisabled && "cursor-not-allowed opacity-50",
                  isFull && !isPast && "bg-slate-50",
                  !isDisabled && "hover:bg-slate-50",
                )}
                onClick={() => {
                  if (!isDisabled) {
                    onDateClick(day.date);
                  }
                }}
              >
                <div className="mb-2 flex items-start justify-between gap-1">
                  <div
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold sm:h-8 sm:w-8 sm:text-base",
                      isToday
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-700",
                      !day.isCurrentMonth && "text-slate-400",
                    )}
                  >
                    {day.date.date()}
                  </div>

                  {daySchedules.length > 0 && !isPast && (
                      <div className="hidden rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 sm:block sm:text-xs">
                      {daySchedules.length} shift
                      {daySchedules.length !== 1 ? "s" : ""}
                    </div>
                  )}
                </div>

                {shiftTypes.length > 0 && (
                  <div className="space-y-1 sm:space-y-1.5">
                    {/* Mobile: show compact chips instead of tiny dots */}
                    <div className="flex flex-wrap gap-1 sm:hidden">
                      {shiftTypes.slice(0, 2).map((shiftType, idx) => {
                        const styles = getShiftStyles(shiftType);
                        return (
                          <span
                            key={idx}
                            className={cn(
                              "inline-flex min-h-5 items-center rounded-full border px-1.5 py-0.5 text-[9px] font-semibold leading-none",
                              styles.mobile,
                            )}
                          >
                            {getShiftShortLabel(shiftType)}
                          </span>
                        );
                      })}

                      {shiftTypes.length > 2 && (
                        <span className="inline-flex min-h-6 items-center rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600">
                          +{shiftTypes.length - 2}
                        </span>
                      )}
                    </div>

                    {/* Tablet/Desktop: show text badges */}
                    <div className="hidden sm:block space-y-1">
                      {shiftTypes.slice(0, 2).map((shiftType, idx) => {
                        const styles = getShiftStyles(shiftType);
                        return (
                          <Badge
                            key={idx}
                            variant="outline"
                            className={cn(
                              "w-full justify-center truncate px-1.5 py-1 text-[11px] sm:text-xs",
                              styles.desktop,
                            )}
                          >
                            <span className="truncate block w-full">
                              {shiftType}
                            </span>
                          </Badge>
                        );
                      })}

                      {shiftTypes.length > 2 && (
                        <div className="text-center text-[11px] font-medium text-slate-500">
                          +{shiftTypes.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}

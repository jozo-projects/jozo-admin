import { PageHeader, StatCard, StatGrid } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmployeeScheduleStatus } from "@/constants/enum";
import PATHS from "@/constants/paths";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMySchedules } from "@/hooks/use-my-schedules";
import StaffEarningsMobileView from "@/pages/StaffSchedule/components/StaffEarningsMobileView";
import dayjs, { Dayjs } from "dayjs";
import { Calendar as CalendarIcon, Clock, DollarSign } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const MyEarningsDetailPage = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState<Dayjs>(dayjs());

  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const dayShortNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Calculate startDate and endDate from selected month
  const startDate = useMemo(
    () => selectedMonth.startOf("month"),
    [selectedMonth],
  );
  const endDate = useMemo(() => selectedMonth.endOf("month"), [selectedMonth]);
  const openMyErrorLogs = () => {
    const params = new URLSearchParams({
      type: "penalty",
      status: "active",
      startDate: startDate.format("YYYY-MM-DD"),
      endDate: endDate.format("YYYY-MM-DD"),
    });
    navigate(`${PATHS.MY_ERROR_LOGS}?${params.toString()}`);
  };

  // Get all schedules for selected month (approved, completed, absent, etc.)
  const { data: { schedules = [], summary } = { schedules: [], summary: undefined }, isLoading } =
    useMySchedules({
      filterType: "month",
      startDate,
      endDate,
      // No status filter - get all schedules
    });

  // Calculate detailed earnings data for entire month
  const earningsData = useMemo(() => {
    // Get total days in selected month
    const daysInMonth = selectedMonth.daysInMonth();

    // Create a map of schedules by date
    const schedulesByDate = new Map<string, typeof schedules>();
    schedules.forEach((schedule) => {
      const dateKey = dayjs(schedule.date).format("YYYY-MM-DD");
      if (!schedulesByDate.has(dateKey)) {
        schedulesByDate.set(dateKey, []);
      }
      schedulesByDate.get(dateKey)!.push(schedule);
    });

    // Generate data for all days in month
    const data: Array<{
      date: Dayjs;
      startTime: string;
      endTime: string;
      hours: number;
      salary: number;
      expectedSalary: number;
      status: EmployeeScheduleStatus | "not-registered";
      schedule?: (typeof schedules)[0];
    }> = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = selectedMonth.date(day);
      const dateKey = currentDate.format("YYYY-MM-DD");
      const daySchedules = schedulesByDate.get(dateKey) || [];

      if (daySchedules.length === 0) {
        // No schedule registered for this day
        data.push({
          date: currentDate,
          startTime: "-",
          endTime: "-",
          hours: 0,
          salary: 0,
          expectedSalary: 0,
          status: "not-registered" as const,
        });
      } else {
        // Has schedule(s) for this day
        daySchedules.forEach((schedule) => {
          let hours = 0;
          let startTime = "";
          let endTime = "";

          if (schedule.customStartTime && schedule.customEndTime) {
            startTime = schedule.customStartTime;
            endTime = schedule.customEndTime;

            const [startHour, startMin] = schedule.customStartTime
              .split(":")
              .map(Number);
            const [endHour, endMin] = schedule.customEndTime
              .split(":")
              .map(Number);
            const startTotal = startHour * 60 + startMin;
            let endTotal = endHour * 60 + endMin;
            if (endTotal <= startTotal) {
              endTotal += 24 * 60;
            }
            const diffMinutes = endTotal - startTotal;
            hours = diffMinutes / 60;
          } else {
            const shift = schedule.shift || schedule.shiftType;
            if (shift === "shift1" || shift === "morning") {
              startTime = "09:00";
              endTime = "14:00";
              hours = 5;
            } else if (
              shift === "shift2" ||
              shift === "afternoon" ||
              shift === "evening"
            ) {
              startTime = "14:00";
              endTime = "19:00";
              hours = 5;
            } else if (shift === "shift3" || shift === "all") {
              startTime = "19:00";
              endTime = "01:00";
              hours = 5;
            } else {
              hours = 5;
              startTime = "N/A";
              endTime = "N/A";
            }
          }

          const roundedHours = Math.round(hours * 100) / 100;
          const finalHours =
            Math.round((schedule.salary?.hours ?? roundedHours) * 100) / 100;
          const hourlyRate = schedule.salary?.hourlyRate ?? 0;
          const expectedSalary =
            schedule.status === EmployeeScheduleStatus.Rejected
              ? 0
              : (schedule.salary?.totalAmount ?? finalHours * hourlyRate);
          const salary = schedule.salary
            ? schedule.salary.isPayable
              ? schedule.salary.totalAmount
              : 0
            : schedule.status === EmployeeScheduleStatus.Completed
              ? expectedSalary
              : 0;

          data.push({
            date: currentDate,
            startTime,
            endTime,
            hours: finalHours,
            salary,
            expectedSalary,
            status: schedule.status,
            schedule,
          });
        });
      }
    }

    // Sort by date (oldest first for display)
    data.sort((a, b) => a.date.valueOf() - b.date.valueOf());

    // Calculate totals (only completed shifts)
    const completedItems = data.filter(
      (item) => item.status === EmployeeScheduleStatus.Completed,
    );
    const totalHours = completedItems.reduce(
      (sum, item) => sum + item.hours,
      0,
    );
    const grossSalary = completedItems.reduce(
      (sum, item) => sum + item.salary,
      0,
    );
    const totalDeductions = summary?.totalDeductions ?? 0;
    const deductionCount = summary?.deductionCount ?? 0;
    const totalSalary = summary?.netSalary ?? Math.max(0, grossSalary - totalDeductions);
    const totalRegistered = data.filter(
      (item) => item.status !== "not-registered",
    ).length;

    const expectedItems = data.filter(
      (item) =>
        item.status !== "not-registered" &&
        item.status !== EmployeeScheduleStatus.Absent &&
        item.status !== EmployeeScheduleStatus.Rejected &&
        item.status !== EmployeeScheduleStatus.Cancelled,
    );
    const expectedHours = expectedItems.reduce(
      (sum, item) => sum + item.hours,
      0,
    );
    const expectedSalary = expectedItems.reduce(
      (sum, item) => sum + item.expectedSalary,
      0,
    );

    return {
      items: data,
      totalHours: Math.round(totalHours * 100) / 100,
      totalSalary,
      grossSalary,
      totalDeductions,
      deductionCount,
      totalShifts: completedItems.length,
      totalRegistered,
      expectedHours: Math.round(expectedHours * 100) / 100,
      expectedSalary,
      expectedShifts: expectedItems.length,
    };
  }, [schedules, selectedMonth, summary]);

  // Generate month options (current month and 11 previous months)
  const monthOptions = useMemo(() => {
    const options = [];
    for (let i = 0; i < 12; i++) {
      const month = dayjs().subtract(i, "month");
      options.push(month);
    }
    return options;
  }, []);

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Earnings details"
        description="Detailed breakdown of shifts and take-home pay"
        icon={DollarSign}
        showBackButton
        backUrl={PATHS.MY_SCHEDULE}
      />

      {/* Summary Cards - desktop only */}
      <StatGrid className="hidden md:grid md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total take-home"
          value={`${earningsData.totalSalary.toLocaleString("en-US")}₫`}
          hint={`After ${earningsData.totalDeductions.toLocaleString("en-US")}₫ deductions`}
          icon={DollarSign}
          tone="success"
        />
        <StatCard
          className="border-destructive/30 bg-destructive/5"
          label="Deductions"
          value={`-${earningsData.totalDeductions.toLocaleString("en-US")}₫`}
          hint={`${earningsData.deductionCount} active penalties · Click to view`}
          icon={DollarSign}
          tone="danger"
          role="button"
          tabIndex={0}
          onClick={openMyErrorLogs}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") openMyErrorLogs();
          }}
        />
        <StatCard
          label="Registered shifts"
          value={earningsData.totalRegistered}
          hint={`${earningsData.totalShifts} shifts completed`}
          icon={CalendarIcon}
          tone="info"
        />
        <StatCard
          label="Total hours"
          value={`${earningsData.totalHours}h`}
          hint="actual hours worked"
          icon={Clock}
        />
      </StatGrid>

      {!isMobile && (
        <Card className="border-amber-200 bg-amber-50/70">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-amber-800">
              Note: If your take-home total looks wrong, contact an admin right
              away so we can review it.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Filters - desktop only */}
      {!isMobile && (
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>
              Pick a month to view earnings and shift details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              <Select
                value={selectedMonth.format("YYYY-MM")}
                onValueChange={(value) => setSelectedMonth(dayjs(value))}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select month" />
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
          </CardContent>
        </Card>
      )}

      {/* Shift details */}
      <Card className={isMobile ? "border-0 shadow-none bg-transparent" : ""}>
        <CardHeader className={isMobile ? "px-0 pt-0" : ""}>
          <CardTitle>Shift details</CardTitle>
          {!isMobile && (
            <CardDescription>
              All shifts for {selectedMonth.format("MM/YYYY")}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className={isMobile ? "px-0" : ""}>
          {isMobile ? (
            <StaffEarningsMobileView
              earningsData={earningsData}
              selectedMonth={selectedMonth}
              onMonthChange={setSelectedMonth}
              dayNames={dayNames}
              dayShortNames={dayShortNames}
              isLoading={isLoading}
              locale="en"
            />
          ) : isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Clock className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : earningsData.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                No shifts
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                You have not completed any shifts this month
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">#</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Day</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Pay (VND)</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {earningsData.items.map((item, index) => {
                    const isNotRegistered = item.status === "not-registered";
                    const isAbsent =
                      item.status === EmployeeScheduleStatus.Absent;
                    const isCompleted =
                      item.status === EmployeeScheduleStatus.Completed;
                    const isPending =
                      item.status === EmployeeScheduleStatus.Pending;
                    const isApproved =
                      item.status === EmployeeScheduleStatus.Approved;

                    return (
                      <TableRow
                        key={`${item.date.format("YYYY-MM-DD")}-${index}`}
                        className={
                          isNotRegistered
                            ? "bg-gray-50"
                            : isAbsent
                              ? "bg-red-50"
                              : ""
                        }
                      >
                        <TableCell className="font-medium">
                          {index + 1}
                        </TableCell>
                        <TableCell>{item.date.format("DD/MM/YYYY")}</TableCell>
                        <TableCell>{dayNames[item.date.day()]}</TableCell>
                        <TableCell
                          className={`font-medium ${
                            isNotRegistered ? "text-gray-400" : ""
                          }`}
                        >
                          {isNotRegistered ? "✕" : item.startTime}
                        </TableCell>
                        <TableCell
                          className={`font-medium ${
                            isNotRegistered ? "text-gray-400" : ""
                          }`}
                        >
                          {isNotRegistered ? "✕" : item.endTime}
                        </TableCell>
                        <TableCell
                          className={`text-right font-semibold ${
                            isNotRegistered ? "text-gray-400" : ""
                          }`}
                        >
                          {isNotRegistered ? "✕" : `${item.hours}h`}
                        </TableCell>
                        <TableCell
                          className={`text-right font-semibold ${
                            isCompleted
                              ? "text-green-600"
                              : isNotRegistered
                                ? "text-gray-400"
                                : "text-gray-500"
                          }`}
                        >
                          {isNotRegistered
                            ? "✕"
                            : isCompleted
                              ? `${item.salary.toLocaleString("en-US")}₫`
                              : "-"}
                        </TableCell>
                        <TableCell>
                          {isNotRegistered ? (
                            <Badge
                              variant="outline"
                              className="bg-gray-100 text-gray-600 border-gray-300"
                            >
                              Not registered
                            </Badge>
                          ) : isAbsent ? (
                            <Badge
                              variant="outline"
                              className="bg-red-100 text-red-700 border-red-300"
                            >
                              🔴 Absent
                            </Badge>
                          ) : isCompleted ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                              Completed
                            </Badge>
                          ) : isPending ? (
                            <Badge
                              variant="outline"
                              className="bg-yellow-100 text-yellow-800 border-yellow-300"
                            >
                              Pending approval
                            </Badge>
                          ) : isApproved ? (
                            <Badge
                              variant="outline"
                              className="bg-blue-100 text-blue-800 border-blue-300"
                            >
                              Approved
                            </Badge>
                          ) : (
                            <Badge variant="outline">{item.status}</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {/* Summary Row */}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell colSpan={5} className="text-right">
                      Total:
                    </TableCell>
                    <TableCell className="text-right text-lg">
                      {earningsData.totalHours}h
                    </TableCell>
                    <TableCell className="text-right text-lg text-green-600">
                      {earningsData.totalSalary.toLocaleString("en-US")}₫
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MyEarningsDetailPage;

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
import { useRouter } from "@tanstack/react-router";

const MyEarningsDetailPage = () => {
  const isMobile = useIsMobile();
  const router = useRouter();
  const [selectedMonth, setSelectedMonth] = useState<Dayjs>(dayjs());

  const dayNames = [
    "Chủ nhật",
    "Thứ hai",
    "Thứ ba",
    "Thứ tư",
    "Thứ năm",
    "Thứ sáu",
    "Thứ bảy",
  ];
  const dayShortNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

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
    router.navigate({ to: PATHS.MY_ERROR_LOGS as never, search: Object.fromEntries(params) as never });
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
    <div className="flex w-full min-w-0 flex-col gap-5 md:gap-6">
      <PageHeader
        title="Thống kê công việc"
        description="Xem ca làm, giờ làm, khoản khấu trừ và lương thực nhận"
        icon={DollarSign}
        showBackButton
        backUrl={PATHS.MY_SCHEDULE}
      />

      {/* Summary Cards - desktop only */}
      <StatGrid className="hidden md:grid md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Tổng lương thực nhận"
          value={`${earningsData.totalSalary.toLocaleString("vi-VN")}₫`}
          hint={`Đã trừ ${earningsData.totalDeductions.toLocaleString("vi-VN")}₫`}
          icon={DollarSign}
          tone="success"
        />
        <StatCard
          className="border-destructive/30 bg-destructive/5"
          label="Khấu trừ"
          value={`-${earningsData.totalDeductions.toLocaleString("vi-VN")}₫`}
          hint={`${earningsData.deductionCount} khoản phạt đang áp dụng · Nhấn để xem`}
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
          label="Ca đã đăng ký"
          value={earningsData.totalRegistered}
          hint={`${earningsData.totalShifts} ca hoàn thành`}
          icon={CalendarIcon}
          tone="info"
        />
        <StatCard
          label="Tổng giờ làm"
          value={`${earningsData.totalHours}h`}
          hint="Giờ đã làm"
          icon={Clock}
        />
      </StatGrid>

      {!isMobile && (
        <Card className="border-warning/40 bg-warning/10">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-warning">
              Lưu ý: Nếu lương thực nhận chưa đúng, hãy liên hệ quản lý để kiểm tra.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Filters - desktop only */}
      {!isMobile && (
        <Card>
          <CardHeader>
            <CardTitle>Bộ lọc</CardTitle>
            <CardDescription>
              Chọn tháng để xem lương và chi tiết ca làm
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              <Select
                value={selectedMonth.format("YYYY-MM")}
                onValueChange={(value) => setSelectedMonth(dayjs(value))}
              >
                <SelectTrigger aria-label="Chọn tháng" className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Chọn tháng" />
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

      {/* Chi tiết ca làm */}
      <Card className={isMobile ? "border-0 shadow-none bg-transparent" : ""}>
        <CardHeader className={isMobile ? "px-0 pt-0" : ""}>
          <CardTitle>Chi tiết ca làm</CardTitle>
          {!isMobile && (
            <CardDescription>
              Các ca làm tháng {selectedMonth.format("MM/YYYY")}
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
              locale="vi"
            />
          ) : isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Clock className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : earningsData.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                Không có ca làm
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Bạn chưa hoàn thành ca làm nào trong tháng này
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">#</TableHead>
                    <TableHead>Ngày</TableHead>
                    <TableHead>Thứ</TableHead>
                    <TableHead>Bắt đầu</TableHead>
                    <TableHead>Kết thúc</TableHead>
                    <TableHead className="text-right">Giờ làm</TableHead>
                    <TableHead className="text-right">Lương (VND)</TableHead>
                    <TableHead>Trạng thái</TableHead>
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
                            ? "bg-muted/40"
                            : isAbsent
                              ? "bg-destructive/5"
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
                              ? `${item.salary.toLocaleString("vi-VN")}₫`
                              : "-"}
                        </TableCell>
                        <TableCell>
                          {isNotRegistered ? (
                            <Badge
                              variant="outline"
                              className="bg-gray-100 text-gray-600 border-gray-300"
                            >
                              Chưa đăng ký
                            </Badge>
                          ) : isAbsent ? (
                            <Badge
                              variant="outline"
                              className="bg-red-100 text-red-700 border-red-300"
                            >
                              Vắng mặt
                            </Badge>
                          ) : isCompleted ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                              Hoàn thành
                            </Badge>
                          ) : isPending ? (
                            <Badge
                              variant="outline"
                              className="bg-yellow-100 text-yellow-800 border-yellow-300"
                            >
                              Chờ duyệt
                            </Badge>
                          ) : isApproved ? (
                            <Badge
                              variant="outline"
                              className="bg-blue-100 text-blue-800 border-blue-300"
                            >
                              Đã duyệt
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              {item.status === EmployeeScheduleStatus.InProgress
                                ? "Đang làm"
                                : item.status === EmployeeScheduleStatus.Rejected
                                  ? "Đã từ chối"
                                  : item.status === EmployeeScheduleStatus.Cancelled
                                    ? "Đã hủy"
                                    : item.status}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {/* Summary Row */}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell colSpan={5} className="text-right">
                      Tổng cộng:
                    </TableCell>
                    <TableCell className="text-right text-lg">
                      {earningsData.totalHours}h
                    </TableCell>
                    <TableCell className="text-right text-lg text-green-600">
                      {earningsData.totalSalary.toLocaleString("vi-VN")}₫
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

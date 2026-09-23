import staffScheduleApis, {
  IEmployeeSchedule,
  IEmployeeSchedulesResponse,
  IEmployeeSchedulesSummary,
} from "@/apis/staffSchedule.apis";
import { PageHeader, StatCard, StatGrid } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
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
import { useQuery } from "@tanstack/react-query";
import dayjs, { Dayjs } from "dayjs";
import {
  Calendar as CalendarIcon,
  Clock,
  DollarSign,
  User,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import StaffEarningsMobileView from "./components/StaffEarningsMobileView";

const StaffEarningsDetailPage = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const isMobile = useIsMobile();
  const [selectedMonth, setSelectedMonth] = useState<Dayjs>(dayjs());

  // Array mapping for day names in Vietnamese (0 = Sunday, 1 = Monday, ...)
  const dayNames = [
    "Chủ Nhật",
    "Thứ Hai",
    "Thứ Ba",
    "Thứ Tư",
    "Thứ Năm",
    "Thứ Sáu",
    "Thứ Bảy",
  ];

  // Calculate startDate and endDate from selected month
  const startDate = useMemo(
    () => selectedMonth.startOf("month"),
    [selectedMonth],
  );
  const endDate = useMemo(() => selectedMonth.endOf("month"), [selectedMonth]);

  // Get all schedules for selected month for the specific staff
  const { data: scheduleData, isLoading } = useQuery<{
    schedules: IEmployeeSchedule[];
    staffName: string;
    summary?: IEmployeeSchedulesSummary;
  }>({
    queryKey: [
      "staff-schedules",
      userId,
      startDate.format("YYYY-MM-DD"),
      endDate.format("YYYY-MM-DD"),
      "compact",
    ],
    queryFn: async () => {
      if (!userId) {
        return { schedules: [], staffName: "Unknown", summary: undefined };
      }

      const response = await staffScheduleApis.getEmployeeSchedules({
        userId,
        startDate: startDate.format("YYYY-MM-DD"),
        endDate: endDate.format("YYYY-MM-DD"),
        filterType: "month",
        salaryView: "compact",
      });

      const result = response.data.result as IEmployeeSchedulesResponse;

      // Extract schedules from schedulesByDate
      const schedules: IEmployeeSchedule[] = [];
      Object.values(result.schedulesByDate || {}).forEach((scheduleList) => {
        scheduleList.forEach((schedule) => {
          schedules.push({
            ...schedule,
            date: dayjs(schedule.date).format("YYYY-MM-DD"),
          });
        });
      });

      // Get staff name from first schedule if available
      const staffName =
        schedules[0]?.user?.name ||
        schedules[0]?.user?.full_name ||
        schedules[0]?.userName ||
        "Unknown Staff";

      return { schedules, staffName, summary: result.summary };
    },
    enabled: !!userId,
  });

  const schedules = scheduleData?.schedules;
  const staffName = scheduleData?.staffName || "Unknown Staff";
  const serverSummary = scheduleData?.summary;

  // Calculate detailed earnings data for entire month
  const earningsData = useMemo(() => {
    const scheduleList = schedules || [];

    // Get total days in selected month
    const daysInMonth = selectedMonth.daysInMonth();

    // Create a map of schedules by date
    const schedulesByDate = new Map<string, typeof scheduleList>();
    scheduleList.forEach((schedule) => {
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
      schedule?: (typeof scheduleList)[0];
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
          } else if (schedule.shiftInfo) {
            startTime = schedule.shiftInfo.startTime;
            endTime = schedule.shiftInfo.endTime;

            const [startHour, startMin] = schedule.shiftInfo.startTime
              .split(":")
              .map(Number);
            const [endHour, endMin] = schedule.shiftInfo.endTime
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

          const roundedHours =
            Math.round((schedule.salary?.hours ?? hours) * 100) / 100;
          const hourlyRate = schedule.salary?.hourlyRate ?? 0;
          const expectedSalary =
            schedule.status === EmployeeScheduleStatus.Rejected
              ? 0
              : (schedule.salary?.totalAmount ?? roundedHours * hourlyRate);
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
            hours: roundedHours,
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
    const totalDeductions = serverSummary?.totalDeductions ?? 0;
    const deductionCount = serverSummary?.deductionCount ?? 0;
    const totalSalary = serverSummary?.netSalary ?? Math.max(0, grossSalary - totalDeductions);
    const totalRegistered = data.filter(
      (item) => item.status !== "not-registered",
    ).length;

    // Calculate expected income (all registered shifts that could potentially earn)
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
  }, [schedules, selectedMonth, serverSummary]);

  const openStaffErrorLogs = () => {
    if (!userId) return;
    const params = new URLSearchParams({
      userId,
      type: "penalty",
      status: "active",
      startDate: startDate.format("YYYY-MM-DD"),
      endDate: endDate.format("YYYY-MM-DD"),
    });
    navigate(`${PATHS.STAFF_ERROR_LOGS}?${params.toString()}`);
  };

  // Generate month options (current month and 11 previous months)
  const monthOptions = useMemo(() => {
    const options = [];
    for (let i = 0; i < 12; i++) {
      const month = dayjs().subtract(i, "month");
      options.push(month);
    }
    return options;
  }, []);

  if (!userId) {
    return (
      <div>
        <div className="text-center">
          <p className="text-red-500">Không tìm thấy thông tin nhân viên</p>
          <Button
            variant="outline"
            onClick={() => navigate(PATHS.STAFF_SCHEDULE)}
            className="mt-4"
          >
            Quay lại
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title={`Chi Tiết Thu Nhập - ${staffName}`}
        description="Thống kê chi tiết các ca làm việc và lương thực nhận"
        icon={User}
        showBackButton
        backUrl={PATHS.STAFF_SCHEDULE}
      />

      {/* Summary Cards - desktop only (mobile uses hero card) */}
      <StatGrid className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Tổng Lương"
          value={`${earningsData.totalSalary.toLocaleString("vi-VN")}₫`}
          hint={`Sau khấu trừ ${earningsData.totalDeductions.toLocaleString("vi-VN")}₫`}
          icon={DollarSign}
          tone="success"
        />
        <StatCard
          className="border-destructive/30 bg-destructive/5"
          label="Lỗi / Khấu Trừ"
          value={`-${earningsData.totalDeductions.toLocaleString("vi-VN")}₫`}
          hint={`${earningsData.deductionCount} lỗi phạt đang hiệu lực · Bấm để xem`}
          icon={DollarSign}
          tone="danger"
          role="button"
          tabIndex={0}
          onClick={openStaffErrorLogs}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") openStaffErrorLogs();
          }}
        />
        <StatCard
          label="Thu Nhập Dự Kiến"
          value={`${earningsData.expectedSalary.toLocaleString("vi-VN")}₫`}
          hint={`${earningsData.expectedShifts} ca (${earningsData.expectedHours}h)`}
          icon={DollarSign}
          tone="info"
        />
        <StatCard
          label="Ca Đã Đăng Ký"
          value={earningsData.totalRegistered}
          hint={selectedMonth.format("MM/YYYY")}
          icon={CalendarIcon}
          tone="warning"
        />
        <StatCard
          label="Tổng Giờ Làm"
          value={`${earningsData.totalHours}h`}
          hint="giờ làm việc thực tế"
          icon={Clock}
        />
      </StatGrid>

      {/* Filters - desktop only (mobile has built-in month navigator) */}
      {!isMobile && (
        <Card>
          <CardHeader>
            <CardTitle>Bộ Lọc</CardTitle>
            <CardDescription>
              Chọn tháng để xem chi tiết lương và ca làm việc
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              <Select
                value={selectedMonth.format("YYYY-MM")}
                onValueChange={(value) => setSelectedMonth(dayjs(value))}
              >
                <SelectTrigger className="w-[200px]">
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

      {/* Earnings Detail */}
      <Card className={isMobile ? "border-0 shadow-none bg-transparent" : ""}>
        <CardHeader className={isMobile ? "px-0 pt-0" : ""}>
          <CardTitle>Chi Tiết Ca Làm Việc</CardTitle>
          {!isMobile && (
            <CardDescription>
              Danh sách tất cả các ca làm việc trong tháng{" "}
              {selectedMonth.format("MM/YYYY")}
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
              isLoading={isLoading}
            />
          ) : isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Clock className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : earningsData.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                Không có ca làm việc nào
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Nhân viên chưa có ca làm việc nào trong tháng này
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">STT</TableHead>
                    <TableHead>Ngày Làm</TableHead>
                    <TableHead>Thứ</TableHead>
                    <TableHead>Giờ Bắt Đầu</TableHead>
                    <TableHead>Giờ Kết Thúc</TableHead>
                    <TableHead className="text-right">Số Giờ</TableHead>
                    <TableHead className="text-right">Lương (VND)</TableHead>
                    <TableHead>Trạng Thái</TableHead>
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
                              🔴 Vắng mặt
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
                            <Badge variant="outline">{item.status}</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {/* Summary Row */}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell colSpan={5} className="text-right">
                      Tổng Cộng:
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

export default StaffEarningsDetailPage;
